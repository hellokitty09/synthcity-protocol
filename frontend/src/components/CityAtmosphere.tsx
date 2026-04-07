/* eslint-disable */
// @ts-nocheck
"use client";

import { useRef, useMemo } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ═══════════════════════════════════════════════
//  DATA STREAMS — vertical holographic pillars
//  rising from key intersections
// ═══════════════════════════════════════════════

const STREAM_POSITIONS: [number, number, number][] = [
  [25, 0, 0], [-25, 0, 0], [0, 0, 25], [0, 0, -25],
  [55, 0, 30], [-55, 0, -30], [40, 0, -50], [-40, 0, 50],
  [90, 0, 0], [0, 0, 90], [-90, 0, 0], [0, 0, -90],
  [70, 0, 70], [-70, 0, 70], [70, 0, -70], [-70, 0, -70],
];

const STREAM_COLORS = ["#00ffff", "#6366f1", "#2dd4bf", "#ec4899"];

export function DataStreams() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.elapsedTime;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.06 + Math.sin(t * 0.8 + i * 0.7) * 0.04;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {STREAM_POSITIONS.map(([x, , z], i) => {
        const color = STREAM_COLORS[i % STREAM_COLORS.length];
        const height = 80 + Math.random() * 60;
        return (
          <mesh key={`stream-${i}`} position={[x, height / 2, z]}>
            <cylinderGeometry args={[0.15, 0.8, height, 6]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.08}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        );
      })}
    </group>
  );
}

// ═══════════════════════════════════════════════
//  GROUND FOG — layered transparent planes
//  creating low-lying atmospheric haze
// ═══════════════════════════════════════════════

export function GroundFog() {
  const fogRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!fogRef.current) return;
    const t = clock.elapsedTime;
    fogRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        child.rotation.z = t * 0.02 * (i % 2 === 0 ? 1 : -1);
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.025 + Math.sin(t * 0.3 + i * 1.2) * 0.015;
      }
    });
  });

  return (
    <group ref={fogRef}>
      {[0.5, 1.5, 3, 5].map((y, i) => (
        <mesh key={`fog-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
          <circleGeometry args={[160 + i * 20, 32]} />
          <meshBasicMaterial
            color={i < 2 ? "#00ffff" : "#6366f1"}
            transparent
            opacity={0.03}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════
//  ENERGY GRID — glowing ground grid with pulses
// ═══════════════════════════════════════════════

export function EnergyGrid() {
  const gridRef = useRef<THREE.LineSegments>(null);

  const geometry = useMemo(() => {
    const points: number[] = [];
    const gridSize = 180;
    const spacing = 12;

    for (let x = -gridSize; x <= gridSize; x += spacing) {
      points.push(x, 0.05, -gridSize, x, 0.05, gridSize);
    }
    for (let z = -gridSize; z <= gridSize; z += spacing) {
      points.push(-gridSize, 0.05, z, gridSize, 0.05, z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
    return geo;
  }, []);

  return (
    <lineSegments ref={gridRef} geometry={geometry}>
      <lineBasicMaterial
        color="#0a2540"
        transparent
        opacity={0.18}
        depthWrite={false}
      />
    </lineSegments>
  );
}

// ═══════════════════════════════════════════════
//  PULSE RINGS — expanding energy rings radiating
//  outward from the Protocol HQ core
// ═══════════════════════════════════════════════

function PulseRing({ delay }: { delay: number }) {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = ((clock.elapsedTime + delay) % 6) / 6; // 6s cycle
    const scale = 5 + t * 140;
    ref.current.scale.set(scale, scale, 1);
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    mat.opacity = (1 - t) * 0.12;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
      <ringGeometry args={[0.95, 1, 48]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.1}
        toneMapped={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

export function PulseRings() {
  return (
    <group>
      <PulseRing delay={0} />
      <PulseRing delay={2} />
      <PulseRing delay={4} />
    </group>
  );
}

// ═══════════════════════════════════════════════
//  FLOATING PARTICLES — ambient dust & data motes
//  Uses instanced mesh for performance
// ═══════════════════════════════════════════════

const PARTICLE_COUNT = 200;

export function FloatingParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, () => ({
      x: (Math.random() - 0.5) * 300,
      y: Math.random() * 80 + 2,
      z: (Math.random() - 0.5) * 300,
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      drift: (Math.random() - 0.5) * 0.02,
    }));
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.elapsedTime;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = particles[i];
      const y = p.y + Math.sin(t * p.speed + p.phase) * 3;
      const x = p.x + Math.sin(t * p.drift + p.phase) * 5;

      dummy.position.set(x, y, p.z);
      dummy.scale.setScalar(0.15 + Math.sin(t * 2 + p.phase) * 0.08);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, PARTICLE_COUNT]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        color="#00ffff"
        toneMapped={false}
        transparent
        opacity={0.4}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════
//  HOLOGRAPHIC SCAN LINE — a sweeping horizontal
//  plane that scans across the city
// ═══════════════════════════════════════════════

export function ScanLine() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.elapsedTime;
    // Sweep from -180 to 180 over 12 seconds
    const cycle = ((t % 12) / 12);
    ref.current.position.z = -180 + cycle * 360;
    const mat = ref.current.material as THREE.MeshBasicMaterial;
    // Fade in from edges, bright in center
    const dist = Math.abs(cycle - 0.5) * 2; // 0 at center, 1 at edges
    mat.opacity = (1 - dist * dist) * 0.06;
  });

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
      <planeGeometry args={[400, 3]} />
      <meshBasicMaterial
        color="#00ffff"
        transparent
        opacity={0.05}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ═══════════════════════════════════════════════
//  ORBITAL RINGS — subtle rotating rings around
//  the city center, like a data-orbit
// ═══════════════════════════════════════════════

export function OrbitalRings() {
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (ring1.current) ring1.current.rotation.z = t * 0.08;
    if (ring2.current) ring2.current.rotation.z = -t * 0.05;
    if (ring3.current) ring3.current.rotation.z = t * 0.03;
  });

  return (
    <group position={[0, 40, 0]}>
      <mesh ref={ring1} rotation={[Math.PI / 3, 0, 0]}>
        <torusGeometry args={[35, 0.08, 8, 64]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.12} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring2} rotation={[Math.PI / 2.5, Math.PI / 6, 0]}>
        <torusGeometry args={[42, 0.06, 8, 64]} />
        <meshBasicMaterial color="#6366f1" transparent opacity={0.08} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={ring3} rotation={[Math.PI / 4, -Math.PI / 5, 0]}>
        <torusGeometry args={[28, 0.05, 8, 64]} />
        <meshBasicMaterial color="#ec4899" transparent opacity={0.06} toneMapped={false} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
