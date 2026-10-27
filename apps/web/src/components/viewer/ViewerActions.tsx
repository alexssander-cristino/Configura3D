/**
 * ViewerActions - Provede ações de câmera (rotacionar/zoom/reset) que podem
 * ser acionadas pelos botões de acessibilidade, independente do mouse.
 */

import React, { createContext, useContext, useCallback, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

interface ViewerActionsContext {
  rotateLeft: () => void;
  rotateRight: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
}

const ViewerActionsContext = createContext<ViewerActionsContext>({
  rotateLeft: () => {},
  rotateRight: () => {},
  zoomIn: () => {},
  zoomOut: () => {},
  resetView: () => {},
});

const STEP_ROTATE = 0.15; // radianos
const STEP_ZOOM = 0.5; // unidades

export function ViewerActionsProvider({ children }: { children: React.ReactNode }) {
  const { camera, controls } = useThree();
  const targetRef = useRef(new THREE.Vector3());

  const rotateLeft = useCallback(() => {
    if (!camera || !controls) return;
    const pos = camera.position.clone();
    const angle = -STEP_ROTATE;
    const s = Math.sin(angle), c = Math.cos(angle);
    const x = pos.x * c - pos.z * s;
    const z = pos.x * s + pos.z * c;
    camera.position.set(x, pos.y, z);
    camera.lookAt(targetRef.current);
  }, [camera, controls]);

  const rotateRight = useCallback(() => {
    if (!camera || !controls) return;
    const pos = camera.position.clone();
    const angle = STEP_ROTATE;
    const s = Math.sin(angle), c = Math.cos(angle);
    const x = pos.x * c - pos.z * s;
    const z = pos.x * s + pos.z * c;
    camera.position.set(x, pos.y, z);
    camera.lookAt(targetRef.current);
  }, [camera, controls]);

  const zoomIn = useCallback(() => {
    if (!camera) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir).negate();
    camera.position.addScaledVector(dir, STEP_ZOOM);
  }, [camera]);

  const zoomOut = useCallback(() => {
    if (!camera) return;
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir).negate();
    camera.position.addScaledVector(dir, -STEP_ZOOM);
  }, [camera]);

  const resetView = useCallback(() => {
    if (!camera) return;
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);
    targetRef.current.set(0, 0, 0);
  }, [camera]);

  return (
    <ViewerActionsContext.Provider value={{ rotateLeft, rotateRight, zoomIn, zoomOut, resetView }}>
      {children}
    </ViewerActionsContext.Provider>
  );
}

export const useViewerActions = () => useContext(ViewerActionsContext);
