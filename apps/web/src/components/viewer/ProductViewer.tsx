/**
 * ProductViewer - visualizador 3D de produtos configuráveis.
 * O modelo de demonstração usa geometria procedural para representar um
 * conjunto de mesa de jantar com seis cadeiras. Modelos GLTF externos
 * continuam sendo carregados normalmente.
 */
import React, { useEffect, useRef, useState, Suspense } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { RoundedBox, useGLTF } from '@react-three/drei';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

interface ProductViewerProps {
  modelUrl: string;
  componentMaterials: Record<string, { color?: string; metalness?: number; roughness?: number }>;
  onLoad?: () => void;
  onError?: (e: unknown) => void;
}

const modelCache = new Map<string, any>();

function DemoDiningChair({ x, z, rotation = 0 }: { x: number; z: number; rotation?: number }) {
  return (
    <group position={[x, 0, z]} rotation={[0, rotation, 0]}>
      {/* Estrutura de madeira e quatro pés */}
      <RoundedBox name="base" args={[0.47, 0.075, 0.46]} radius={0.025} smoothness={3} position={[0, 0.47, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#9a623b" roughness={0.56} />
      </RoundedBox>
      {([-1, 1] as const).flatMap((sx) => ([-1, 1] as const).map((sz) => (
        <RoundedBox key={`${sx}-${sz}`} name="base" args={[0.055, 0.45, 0.055]} radius={0.012} smoothness={2} position={[sx * 0.18, 0.235, sz * 0.17]} castShadow>
          <meshStandardMaterial color="#875331" roughness={0.55} />
        </RoundedBox>
      )))}
      {/* Encosto estofado, com estrutura aparente nas laterais */}
      <RoundedBox name="gaveta" args={[0.405, 0.32, 0.085]} radius={0.045} smoothness={5} position={[0, 0.79, 0.185]} castShadow>
        <meshStandardMaterial color="#765044" roughness={0.92} />
      </RoundedBox>
      <RoundedBox name="base" args={[0.055, 0.42, 0.06]} radius={0.018} smoothness={3} position={[-0.205, 0.69, 0.19]} castShadow>
        <meshStandardMaterial color="#875331" roughness={0.55} />
      </RoundedBox>
      <RoundedBox name="base" args={[0.055, 0.42, 0.06]} radius={0.018} smoothness={3} position={[0.205, 0.69, 0.19]} castShadow>
        <meshStandardMaterial color="#875331" roughness={0.55} />
      </RoundedBox>
      {/* Almofada do assento */}
      <RoundedBox name="gaveta" args={[0.405, 0.085, 0.405]} radius={0.04} smoothness={5} position={[0, 0.53, -0.015]} castShadow receiveShadow>
        <meshStandardMaterial color="#806052" roughness={0.96} />
      </RoundedBox>
      {/* Costura sutil no assento: pequenas linhas de relevo */}
      {[-0.1, 0, 0.1].map((offset) => (
        <RoundedBox key={offset} name="gaveta" args={[0.008, 0.003, 0.29]} radius={0.002} smoothness={2} position={[offset, 0.574, -0.015]}>
          <meshStandardMaterial color="#94796a" roughness={1} />
        </RoundedBox>
      ))}
    </group>
  );
}

function DemoDiningSet() {
  const chairs = [
    { x: -0.62, z: 0.86, rotation: 0 },
    { x: 0, z: 0.86, rotation: 0 },
    { x: 0.62, z: 0.86, rotation: 0 },
    { x: -0.62, z: -0.86, rotation: Math.PI },
    { x: 0, z: -0.86, rotation: Math.PI },
    { x: 0.62, z: -0.86, rotation: Math.PI },
  ];
  return (
    <group>
      {/* Tampo principal com cantos suavizados */}
      <RoundedBox name="prateleira" args={[1.92, 0.095, 1.02]} radius={0.065} smoothness={6} position={[0, 0.78, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#b88758" roughness={0.42} metalness={0.02} />
      </RoundedBox>
      {/* Borda inferior do tampo */}
      <RoundedBox name="base" args={[1.76, 0.055, 0.86]} radius={0.025} smoothness={3} position={[0, 0.704, 0]} castShadow>
        <meshStandardMaterial color="#875331" roughness={0.56} />
      </RoundedBox>
      {/* Base central robusta, em madeira maciça */}
      <RoundedBox name="base" args={[0.2, 0.49, 0.2]} radius={0.025} smoothness={3} position={[0, 0.45, 0]} castShadow>
        <meshStandardMaterial color="#875331" roughness={0.52} />
      </RoundedBox>
      <RoundedBox name="base" args={[0.88, 0.11, 0.66]} radius={0.035} smoothness={4} position={[0, 0.205, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#99643e" roughness={0.54} />
      </RoundedBox>
      {chairs.map((chair, index) => <DemoDiningChair key={index} {...chair} />)}
    </group>
  );
}

function Stage({ modelUrl, componentMaterials }: { modelUrl: string; componentMaterials: Record<string, any> }) {
  const groupRef = useRef<THREE.Group>(null);
  const [loaded, setLoaded] = useState(false);
  const isDemoDiningSet = modelUrl.toLowerCase().includes('demo-organizador');
  const gltf = useGLTF(modelUrl);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.traverse((obj: any) => {
      if (!obj.isMesh || !obj.name || !componentMaterials[obj.name]) return;
      const selected = componentMaterials[obj.name];
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      // Clone material first so selecting a finish never changes another mesh/model.
      const cloned = materials.map((original: THREE.Material) => {
        const material = original.clone() as THREE.MeshStandardMaterial;
        if (selected.color !== undefined && 'color' in material) material.color.set(selected.color);
        if (selected.metalness !== undefined && 'metalness' in material) material.metalness = selected.metalness;
        if (selected.roughness !== undefined && 'roughness' in material) material.roughness = selected.roughness;
        return material;
      });
      obj.material = Array.isArray(obj.material) ? cloned : cloned[0];
    });
  }, [componentMaterials, isDemoDiningSet]);

  useFrame((state) => {
    if (loaded || !groupRef.current) return;
    const box = new THREE.Box3().setFromObject(groupRef.current);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const cam = state.camera as THREE.PerspectiveCamera;
    const fov = (cam.fov * Math.PI) / 180;
    const distance = (maxDim / 2) / Math.tan(fov / 2) * 2.15;
    cam.position.set(center.x + distance * 0.12, center.y + distance * 0.42, center.z + distance);
    cam.lookAt(center.x, center.y, center.z);
    cam.updateProjectionMatrix();
    setLoaded(true);
  });

  useEffect(() => () => {
    groupRef.current?.traverse((obj: any) => {
      if (obj.isMesh) {
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        materials.forEach((material: any) => material.dispose());
      }
    });
  }, []);

  return (
    <>
      <color attach="background" args={['#f3f1ed']} />
      <ambientLight intensity={0.85} />
      <hemisphereLight args={['#fff8ef', '#b9b1a6', 1.15]} />
      <directionalLight position={[-3, 6, 4]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} />
      <directionalLight position={[4, 3, -3]} intensity={1.1} />
      <pointLight position={[0, 3, 2]} intensity={0.45} />
      <group ref={groupRef}>
        {isDemoDiningSet ? <DemoDiningSet /> : <primitive object={gltf.scene} />}
      </group>
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
    loader.load(cacheKey, (gltf) => {
      modelCache.set(cacheKey, gltf);
      onLoad?.();
    }, undefined, (err) => {
      setError(err);
      onError?.(err);
    });
  }, [cacheKey, onLoad, onError]);

  if (error) return null;
  return <Suspense fallback={null}><Stage modelUrl={cacheKey} componentMaterials={componentMaterials} /></Suspense>;
}
