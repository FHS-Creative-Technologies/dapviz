import { Variable } from "./DapvizProvider";
import { QuadraticBezierLine, QuadraticBezierLineRef } from "@react-three/drei";
import React, { createContext, useContext, useMemo, useRef } from "react";
import { useCallback, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useTheme } from "./ThemeProvider";

export type HeapConnectionContextType = {
  registerNode: (id: number, ref: React.RefObject<THREE.Group>) => void;
  unregisterNode: (id: number) => void;
};

export const HeapConnectionContext = createContext<HeapConnectionContextType | null>(null);

export const useHeapConnections = () => {
  const context = useContext(HeapConnectionContext);
  if (!context) {
    throw new Error("useHeapConnections called outside of HeapConnectionsProvider");
  }
  return context;
}

interface ConnectionLineProps {
  parentRef: React.RefObject<THREE.Group>;
  childRef: React.RefObject<THREE.Group>;
}

const ConnectionLine = ({ parentRef, childRef }: ConnectionLineProps) => {
  const theme = useTheme();

  const lineRef = useRef<QuadraticBezierLineRef>(null);

  const startCircleRef = useRef<THREE.Mesh>(null);
  const endCircleRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (parentRef.current && childRef.current && lineRef.current) {
      const startPos = new THREE.Vector3();
      const endPos = new THREE.Vector3();
      const midPos = new THREE.Vector3();
      const box = new THREE.Box3();
      const size = new THREE.Vector3();

      parentRef.current.getWorldPosition(startPos);
      childRef.current.getWorldPosition(endPos);

      box.setFromObject(parentRef.current);
      box.getSize(size);
      const startOffset = size.x / 2;

      box.setFromObject(childRef.current);
      box.getSize(size);
      const endOffset = size.x / 2;

      const padding = 3;

      const finalStart = startPos.clone();
      finalStart.x += startOffset + padding;

      const finalEnd = endPos.clone();
      finalEnd.x -= endOffset + padding;


      midPos.addVectors(finalStart, finalEnd).multiplyScalar(0.5);

      midPos.y += 80;

      lineRef.current.setPoints(finalStart, finalEnd, midPos);
      startCircleRef.current?.position.copy(finalStart);
      endCircleRef.current?.position.copy(finalEnd);
    }
  });

  return (
    <>
      <QuadraticBezierLine
        ref={lineRef}
        start={[0, 0, 0]}
        end={[0, 0, 0]}
        color={theme.connection.line}
        lineWidth={1}
      />

      <mesh ref={startCircleRef}>
        <circleGeometry args={[2.5, 16]} />
        <meshBasicMaterial color={theme.connection.start} />
      </mesh>
      <mesh ref={endCircleRef}>
        <circleGeometry args={[2.5, 16]} />
        <meshBasicMaterial color={theme.connection.end} />
      </mesh>
    </>
  );
}

export const HeapConnectionsProvider = ({ children, allVariables }: { children: React.ReactNode, allVariables: Variable[] }) => {
  const [nodeRefs, setNodeRefs] = useState<Map<number, React.RefObject<THREE.Group>>>(new Map());

  const registerNode = useCallback((id: number, ref: React.RefObject<THREE.Group>) => {
    setNodeRefs(prev => new Map(prev).set(id, ref));
  }, [setNodeRefs]);

  const unregisterNode = useCallback((id: number) => {
    setNodeRefs(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, [setNodeRefs]);

  const connections = useMemo(() =>
    allVariables.filter(v => v.parent && v.parent > 0 && v.reference > 0),
    [allVariables]
  );

  return (
    <HeapConnectionContext.Provider value={{ registerNode, unregisterNode }}>
      {children}

      <group>
        {connections.map(variable => {
          const parentRef = nodeRefs.get(variable.parent as number);
          const childRef = nodeRefs.get(variable.reference);

          if (!parentRef || !childRef) return null;
          return (
            <ConnectionLine
              key={`${variable.parent}-${variable.reference}`}
              parentRef={parentRef}
              childRef={childRef}
            />
          );
        })}
      </group>
    </HeapConnectionContext.Provider>
  );
}
