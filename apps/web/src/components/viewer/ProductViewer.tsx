/**
 * ProductViewer - Visualizador 3D do produto configurável.
 *
 * Carrega um GLB real, enquadra automaticamente, permite rotação/zoom
 * (OrbitControls, toque e teclado via ViewerActions) e troca o MATERIAL de
 * cada mesh nomeado de acordo com as opções selecionadas. Não usa imagens
 * estáticas.
 */

import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

interface ProductViewerProps {
  modelUrl: string;
  componentMaterials: Record<string, { color?: string; metalness?: number; roughness?: number }>;
  onLoad?: () => void;
  onError?: (e: unknown) => void;
}

const modelCache = new Map<string, any>();

function Stage({ modelUrl, componentMaterials }: { modelUrl: string; componentMaterials: Record<string, any> }) {
  const { camera, scene } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState(false);

  const gltf = useGLTF(modelUrl);

  // Aplica/troca materiais nos meshes nomeados quando as opções mudam
  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((obj: any) => {
      if (obj.isMesh && obj.name && componentMaterials[obj.name]) {
        const m = componentMaterials[obj.name];
        const mat = obj.material as THREE.MeshStandardMaterial;
        if (m.color !== undefined) mat.color.set(m.color as string);
        if (m.metalness !== undefined) mat.metalness = m.metalness;
        if (m.roughness !== undefined) mat.roughness = m.roughness;
        mat.needsUpdate = true;
      }
    });
  }, [componentMaterials]);

  // Enquadramento automático quando o modelo carrega
  useFrame((state) => {
    if (loaded || !groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cam = state.camera as THREE.PerspectiveCamera;
    const fov = (cam.fov * Math.PI) / 180;
    const cameraZ = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
    cam.position.set(center.x, center.y, center.z + cameraZ);
    cam.lookAt(center);
    setLoaded(true);
  });

  // Limpa recursos ao desmontar
  useEffect(() => {
    return () => {
      groupRef.current?.traverse((obj: any) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach((m: any) => m.dispose());
        }
      });
    };
  }, []);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[-2, 5, 3]} intensity={1.2} castShadow />
      <pointLight position={[2, 2, 4]} intensity={0.6} />
      <primitive object={gltf.scene} ref={groupRef} />
    </>
  );
}

export function ProductViewer({ modelUrl, componentMaterials, onLoad, onError }: ProductViewerProps) {
  const [error, setError] = useState<unknown>(null);
  const cacheKey = modelUrl;

  useEffect(() => {
    if (modelCache.has(cacheKey)) {
      onLoad?.();
      return;
    }
    const loader = new GLTFLoader();
    loader.load(
      cacheKey,
      (gltf) => {
        modelCache.set(cacheKey, gltf);
        onLoad?.();
      },
      undefined,
      (err) => {
        setError(err);
        onError?.(err);
      },
    );
  }, [cacheKey, onLoad, onError]);

  if (error) return null;

  return (
    <Suspense fallback={null}>
      <Stage modelUrl={cacheKey} componentMaterials={componentMaterials} />
    </Suspense>
  );
}
