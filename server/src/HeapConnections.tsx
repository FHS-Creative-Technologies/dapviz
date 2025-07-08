import { Variable } from "./DapvizProvider";
import { QuadraticBezierLine } from "@react-three/drei";
import React, { createContext, useMemo } from "react";
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

  const connections = useMemo(() =>
    allVariables.filter(v => v.parent && v.parent > 0 && v.reference > 0),
    [allVariables]
  );

  const box = useMemo(() => new THREE.Box3(), []);
  const size = useMemo(() => new THREE.Vector3(), []);
  const startPos = useMemo(() => new THREE.Vector3(), []);
  const endPos = useMemo(() => new THREE.Vector3(), []);

  useFrame(() => {
    const newLines = [];

    for (const variable of connections) {

      if (variable.parent && variable.parent > 0 && variable.reference > 0) {
        const parentRef = nodeRefs.get(variable.parent);
        const childRef = nodeRefs.get(variable.reference);

        if (parentRef?.current && childRef?.current) {

          parentRef.current.getWorldPosition(startPos);
          childRef.current.getWorldPosition(endPos);

          box.setFromObject(parentRef.current);
          box.getSize(size);
          const startOffset = size.x / 2;

          box.setFromObject(childRef.current);
          box.getSize(size);
          const endOffset = size.x / 2;

          const finalStart = startPos.clone();
          const finalEnd = endPos.clone();

          const padding = 3;

          finalStart.x += startOffset + padding;
          finalEnd.x -= endOffset + padding;

          newLines.push({ start: finalStart, end: finalEnd, key: `${variable.parent}-${variable.reference}` });
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
