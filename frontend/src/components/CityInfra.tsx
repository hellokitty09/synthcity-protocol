/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

// ═══════════════════════════════════════════════
//  ROADS — radial arteries + ring highways
//  Now with neon edge lighting and traffic particles
// ═══════════════════════════════════════════════

const RING_RADII = [25, 55, 90, 128, 165];
const RING_COLORS = ["#00ffff", "#6366f1", "#2dd4bf", "#fbbf24", "#475569"];
const RADIAL_COUNT = 12;

export function CityRoads() {
  const radialPoints = useMemo(() => {
    const groups: [THREE.Vector3, THREE.Vector3][] = [];
    for (let i = 0; i < RADIAL_COUNT; i++) {
      const angle = (i / RADIAL_COUNT) * Math.PI * 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      groups.push([
        new THREE.Vector3(cos * 5, 0, sin * 5),
        new THREE.Vector3(cos * 170, 0, sin * 170),
      ]);
    }
    return groups;
  }, []);

  return (
    <group>
      {/* Ring highways — dark asphalt */}
      {RING_RADII.map((r, i) => (
        <mesh key={`ring-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.15, 0]}>
          <ringGeometry args={[r - 0.8, r + 0.8, 64, 1]} />
          <meshBasicMaterial color={i < 2 ? "#0c1929" : "#090f18"} transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Neon edge glow on inner 3 rings */}
      {RING_RADII.slice(0, 3).map((r, i) => (
        <group key={`neon-ring-${i}`}>
          {/* Outer edge */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
            <ringGeometry args={[r + 0.6, r + 0.9, 64, 1]} />
            <meshBasicMaterial
              color={RING_COLORS[i]}
              transparent
              opacity={0.2}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Inner edge */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, 0]}>
            <ringGeometry args={[r - 0.9, r - 0.6, 64, 1]} />
            <meshBasicMaterial
              color={RING_COLORS[i]}
              transparent
              opacity={0.15}
              toneMapped={false}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}

      {/* Radial roads */}
      {radialPoints.map(([start, end], i) => {
        const dir = end.clone().sub(start);
        const length = dir.length();
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const angle = Math.atan2(dir.x, dir.z);
        return (
          <group key={`radial-${i}`}>
            {/* Road surface */}
            <mesh position={[mid.x, -0.18, mid.z]} rotation={[0, angle, 0]}>
              <boxGeometry args={[1.2, 0.02, length]} />
              <meshBasicMaterial color="#0c1929" transparent opacity={0.6} />
            </mesh>
            {/* Neon center line */}
            <mesh position={[mid.x, -0.1, mid.z]} rotation={[0, angle, 0]}>
              <boxGeometry args={[0.08, 0.01, length]} />
              <meshBasicMaterial
                color="#00ffff"
                transparent
                opacity={0.12}
                toneMapped={false}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
              />
            </mesh>
          </group>
        );
      })}

      {/* Street lamps with improved glow orbs */}
      {RING_RADII.slice(0, 3).map((r, ri) => {
        const lampCount = ri === 0 ? 12 : ri === 1 ? 16 : 20;
        return Array.from({ length: lampCount }, (_, i) => {
          const angle = (i / lampCount) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          const lampColor = RING_COLORS[ri];
          return (
            <group key={`lamp-${ri}-${i}`} position={[x, 0, z]}>
              {/* Pole */}
              <mesh position={[0, 2, 0]}>
                <cylinderGeometry args={[0.04, 0.06, 4, 4]} />
                <meshBasicMaterial color="#0a1628" />
              </mesh>
              {/* Orb */}
              <mesh position={[0, 4.2, 0]}>
                <sphereGeometry args={[0.25, 6, 6]} />
                <meshBasicMaterial color={lampColor} toneMapped={false} />
              </mesh>
              {/* Ground pool of light (emissive circle) */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
                <circleGeometry args={[2, 8]} />
                <meshBasicMaterial
                  color={lampColor}
                  transparent
                  opacity={0.04}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          );
        });
      })}

      {/* Intersection nodes — glowing hexagons */}
      {RING_RADII.slice(0, 3).map((r, ri) =>
        Array.from({ length: RADIAL_COUNT }, (_, i) => {
          const angle = (i / RADIAL_COUNT) * Math.PI * 2;
          const x = Math.cos(angle) * r;
          const z = Math.sin(angle) * r;
          return (
            <group key={`node-${ri}-${i}`}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, -0.05, z]}>
                <circleGeometry args={[1.5, 6]} />
                <meshBasicMaterial color="#0c1929" transparent opacity={0.5} />
              </mesh>
              {/* Glow overlay */}
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.02, z]}>
                <ringGeometry args={[1.2, 1.6, 6]} />
                <meshBasicMaterial
                  color={RING_COLORS[ri]}
                  transparent
                  opacity={0.1}
                  toneMapped={false}
                  depthWrite={false}
                  blending={THREE.AdditiveBlending}
                />
              </mesh>
            </group>
          );
        })
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════
//  TRAFFIC PARTICLES — tiny dots that travel
//  along the ring roads, simulating data flow
// ═══════════════════════════════════════════════

const TRAFFIC_PER_RING = [18, 14, 10, 6, 4];

export function TrafficParticles() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const traffic = useMemo(() => {
    const arr: { ring: number; radius: number; angle: number; speed: number; color: THREE.Color; y: number }[] = [];
    RING_RADII.forEach((r, ri) => {
      const count = TRAFFIC_PER_RING[ri];
      for (let i = 0; i < count; i++) {
        arr.push({
          ring: ri,
          radius: r + (Math.random() - 0.5) * 0.6,
          angle: Math.random() * Math.PI * 2,
          speed: (0.15 + Math.random() * 0.2) * (Math.random() > 0.5 ? 1 : -1),
          color: new THREE.Color(RING_COLORS[ri]),
          y: 0.3 + Math.random() * 0.4,
        });
      }
    });
    return arr;
  }, []);

  const totalCount = traffic.length;
  const col = useMemo(() => new THREE.Color(), []);

  // Set initial colors
  useMemo(() => {
    if (!meshRef.current) return;
    traffic.forEach((t, i) => {
      meshRef.current!.setColorAt(i, t.color);
    });
    if (meshRef.current?.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [traffic]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const elapsed = clock.elapsedTime;

    for (let i = 0; i < totalCount; i++) {
      const t = traffic[i];
      const angle = t.angle + elapsed * t.speed;
      const x = Math.cos(angle) * t.radius;
      const z = Math.sin(angle) * t.radius;

      dummy.position.set(x, t.y, z);
      dummy.scale.setScalar(0.25);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);

      // Set color on first frame
      if (clock.elapsedTime < 0.1) {
        col.copy(t.color);
        meshRef.current.setColorAt(i, col);
      }
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (clock.elapsedTime < 0.1 && meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, totalCount]}>
      <sphereGeometry args={[1, 4, 4]} />
      <meshBasicMaterial
        vertexColors
        toneMapped={false}
        transparent
        opacity={0.7}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </instancedMesh>
  );
}

// ═══════════════════════════════════════════════
//  PARKS — green breathing spaces with glow
// ═══════════════════════════════════════════════

const PARK_POSITIONS: [number, number][] = [
  [65, 45], [-55, 60], [80, -50], [-70, -65], [100, 85],
  [-95, -80], [30, 75], [-30, -40],
];

export function CityParks() {
  return (
    <group>
      {PARK_POSITIONS.map(([x, z], i) => (
        <group key={`park-${i}`} position={[x, 0.05, z]}>
          {/* Ground patch */}
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[5 + Math.random() * 2, 6]} />
            <meshBasicMaterial color="#0a2810" transparent opacity={0.5} />
          </mesh>
          {/* Glow ring */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <ringGeometry args={[4, 5.5, 6]} />
            <meshBasicMaterial
              color="#34d399"
              transparent
              opacity={0.06}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
          {/* Tree canopy */}
          <mesh position={[0, 1.8, 0]}>
            <sphereGeometry args={[1.5, 6, 6]} />
            <meshBasicMaterial color="#166534" transparent opacity={0.45} />
          </mesh>
          {/* Second smaller tree */}
          <mesh position={[2, 1.2, 1.5]}>
            <sphereGeometry args={[0.8, 4, 4]} />
            <meshBasicMaterial color="#15803d" transparent opacity={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ═══════════════════════════════════════════════
//  ENERGY BRIDGES — arced connections between
//  key district intersections
// ═══════════════════════════════════════════════

const BRIDGE_PAIRS: [number, number, number, number][] = [
  [25, 0, 0, 55],
  [-25, 0, 0, -55],
  [0, 25, 55, 0],
  [0, -25, -55, 0],
];

export function EnergyBridges() {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const mat = child.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.04 + Math.sin(clock.elapsedTime * 1.5 + i) * 0.03;
      }
    });
  });

  return (
    <group ref={groupRef}>
      {BRIDGE_PAIRS.map(([x1, z1, x2, z2], i) => {
        const midX = (x1 + x2) / 2;
        const midZ = (z1 + z2) / 2;
        const dist = Math.sqrt((x2 - x1) ** 2 + (z2 - z1) ** 2);
        const arcHeight = dist * 0.25;
        const angle = Math.atan2(x2 - x1, z2 - z1);

        return (
          <mesh
            key={`bridge-${i}`}
            position={[midX, arcHeight / 2 + 2, midZ]}
            rotation={[0, angle, 0]}
          >
            <torusGeometry args={[dist / 2, 0.06, 4, 32, Math.PI]} />
            <meshBasicMaterial
              color="#00ffff"
              transparent
              opacity={0.05}
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
