import { Variable } from "./DapvizProvider";
import { QuadraticBezierLine } from "@react-three/drei";
import React, { createContext } from "react";
import { useCallback, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";


export type HeapConnectionContextType = {
  registerNode: (id: number, ref: React.RefObject<THREE.Group>) => void;
  unregisterNode: (id: number) => void;
};

export const HeapConnectionContext = createContext<HeapConnectionContextType | null>(null);

export const HeapConnectionsProvider = ({ children, allVariables }: { children: React.ReactNode, allVariables: Variable[] }) => {

  const [nodeRefs, setNodeRefs] = useState<Map<number, React.RefObject<THREE.Group>>>(new Map());

  const [lines, setLines] = useState<{ start: THREE.Vector3; end: THREE.Vector3; key: string }[]>([]);

  const registerNode = useCallback((id: number, ref: React.RefObject<THREE.Group>) => {
    setNodeRefs(prev => new Map(prev).set(id, ref));
  }, []);

  const unregisterNode = useCallback((id: number) => {
    setNodeRefs(prev => {
      const newMap = new Map(prev);
      newMap.delete(id);
      return newMap;
    });
  }, []);

  useFrame(() => {
    const newLines = [];

    for (const variable of allVariables) {

      if (variable.parent && variable.parent > 0 && variable.reference > 0) {
        const parentRef = nodeRefs.get(variable.parent);
        const childRef = nodeRefs.get(variable.reference);

        if (parentRef?.current && childRef?.current) {
          const startPos = new THREE.Vector3();
          let endPos = new THREE.Vector3();

          parentRef.current.getWorldPosition(startPos);
          childRef.current.getWorldPosition(endPos);

          const startOffset = 45;
          const endOffset = 50;

          startPos.x += startOffset;
          endPos.x -= endOffset;

          newLines.push({ start: startPos, end: endPos, key: `${variable.parent}-${variable.reference}` });
        }
      }
    }
    setLines(newLines);
  });

  return (
    <HeapConnectionContext.Provider value={{ registerNode, unregisterNode }}>
      {children}

      <group>
        {lines.map(({ key, ...lineProps }) => (
          <QuadraticBezierLine key={key} {...lineProps} color="white" lineWidth={1} />
        ))}

        {lines.map(line => (
          <React.Fragment key={`${line.key}-circles`}>
            <mesh position={line.start}>
              <circleGeometry args={[2.5, 16]} />
              <meshBasicMaterial color="red" />
            </mesh>

            <mesh position={line.end}>
              <circleGeometry args={[2.5, 16]} />
              <meshBasicMaterial color="red" />
            </mesh>
          </React.Fragment>
        ))}
      </group>
    </HeapConnectionContext.Provider >
  );
}
