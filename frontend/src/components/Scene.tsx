/* eslint-disable */
// @ts-nocheck
"use client";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars, Float, Html } from "@react-three/drei";
import { CityBlocks } from "./Megatowers";
import { Landmarks } from "./Landmarks";
import { CityRoads, CityParks, TrafficParticles, EnergyBridges } from "./CityInfra";
import { DataStreams, GroundFog, EnergyGrid, PulseRings, FloatingParticles, ScanLine, OrbitalRings } from "./CityAtmosphere";
import type { AgentInfo } from "./Megatowers";

// ═══════════════════════════════════════════════
//  ZONE GROUND — concentric rings with improved
//  glow and gradient transitions
// ═══════════════════════════════════════════════

const ZONE_RINGS = [
  { inner: 0,   outer: 24,  color: "#00ffff", opacity: 0.14 },
  { inner: 26,  outer: 54,  color: "#6366f1", opacity: 0.09 },
  { inner: 56,  outer: 90,  color: "#2dd4bf", opacity: 0.065 },
  { inner: 92,  outer: 128, color: "#d97706", opacity: 0.04 },
  { inner: 130, outer: 168, color: "#1e293b", opacity: 0.025 },
];

function ZoneGround() {
  return (
    <group>
      {/* Zone rings (wireframe) */}
      {ZONE_RINGS.map((ring, i) => (
        <mesh key={`ring-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]}>
          <ringGeometry args={[ring.inner, ring.outer, 64, 1]} />
          <meshBasicMaterial color={ring.color} wireframe transparent opacity={ring.opacity} />
        </mesh>
      ))}

      {/* Zone boundary glow lines */}
      {ZONE_RINGS.slice(0, 4).map((ring, i) => (
        <mesh key={`boundary-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <ringGeometry args={[ring.outer - 0.5, ring.outer + 0.5, 64, 1]} />
          <meshBasicMaterial
            color={ring.color}
            transparent
            opacity={ring.opacity * 1.5}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      ))}

      {/* Dark ground base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <circleGeometry args={[240, 64]} />
        <meshBasicMaterial color="#020206" />
      </mesh>
    </group>
  );
}

function DistrictLabels() {
  const s = (color: string, sz = 9) => ({
    fontFamily: '"Silkscreen", monospace',
    fontSize: `${sz}px`, color, opacity: 0.55,
    letterSpacing: "0.18em", textShadow: `0 0 10px ${color}`,
    pointerEvents: "none" as const, userSelect: "none" as const, whiteSpace: "nowrap" as const,
  });
  return (
    <group>
      <Html position={[0, 70, 0]} center><span style={s("#00ffff", 12)}>THE CORE</span></Html>
      <Html position={[45, 38, 0]} center><span style={s("#a5b4fc", 10)}>UPTOWN</span></Html>
      <Html position={[-80, 20, 0]} center><span style={s("#5eead4", 10)}>MIDTOWN</span></Html>
      <Html position={[0, 12, 115]} center><span style={s("#fbbf24", 10)}>SUBURBS</span></Html>
      <Html position={[155, 6, 0]} center><span style={s("#475569", 8)}>THE FRINGE</span></Html>
    </group>
  );
}

// ═══════════════════════════════════════════════
//  PROTOCOL CORE BEACON — enhanced central
//  floating crystal with light effects
// ═══════════════════════════════════════════════

function CoreBeacon() {
  return (
    <Float speed={0.8} rotationIntensity={0.5} floatIntensity={2}>
      <group position={[0, 68, 0]}>
        {/* Main crystal */}
        <mesh>
          <octahedronGeometry args={[3, 0]} />
          <meshBasicMaterial color="#00ffff" toneMapped={false} transparent opacity={0.9} />
        </mesh>
        {/* Inner glow */}
        <mesh>
          <octahedronGeometry args={[3.5, 0]} />
          <meshBasicMaterial
            color="#00ffff"
            toneMapped={false}
            transparent
            opacity={0.15}
            wireframe
          />
        </mesh>
        {/* Outer aura */}
        <mesh>
          <sphereGeometry args={[5, 12, 12]} />
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.04}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      </group>
    </Float>
  );
}

// ═══════════════════════════════════════════════
//  SCENE — enhanced with atmosphere
// ═══════════════════════════════════════════════

interface SceneProps {
  onSelectAgent?: (agent: AgentInfo | null) => void;
}

export default function Scene({ onSelectAgent }: SceneProps) {
  return (
    <div className="w-full h-full absolute inset-0 z-0">
      <Canvas
        camera={{ position: [90, 70, 90], fov: 48, near: 0.1, far: 800 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        performance={{ min: 0.5 }}
      >
        <color attach="background" args={["#020206"]} />
        <fog attach="fog" args={["#020206", 160, 420]} />

        {/* Lighting — dramatic with rim lights */}
        <directionalLight position={[60, 220, 50]} intensity={3.5} color="#c8d0ff" />
        <directionalLight position={[-50, 180, -40]} intensity={1.8} color="#a5b4fc" />
        <ambientLight intensity={0.35} color="#1e1b4b" />
        <pointLight position={[0, 55, 0]} intensity={5} color="#00ffff" distance={120} decay={1.2} />
        {/* Rim accent lights */}
        <pointLight position={[120, 20, 0]} intensity={1.5} color="#6366f1" distance={100} decay={2} />
        <pointLight position={[-120, 20, 0]} intensity={1.5} color="#ec4899" distance={100} decay={2} />
        <pointLight position={[0, 20, 120]} intensity={1} color="#2dd4bf" distance={80} decay={2} />

        {/* Starfield — denser with more depth */}
        <Stars radius={280} depth={100} count={3000} factor={3.5} saturation={0.15} fade speed={0.2} />

        {/* Terrain & Infrastructure */}
        <ZoneGround />
        <EnergyGrid />
        <CityRoads />
        <CityParks />
        <TrafficParticles />
        <EnergyBridges />

        {/* Atmospheric Effects */}
        <GroundFog />
        <PulseRings />
        <DataStreams />
        <FloatingParticles />
        <ScanLine />
        <OrbitalRings />

        {/* Core Beacon */}
        <CoreBeacon />

        {/* District Labels */}
        <DistrictLabels />

        {/* City Buildings & Landmarks */}
        <CityBlocks onSelect={onSelectAgent} />
        <Landmarks onSelect={onSelectAgent} />

        <OrbitControls
          enablePan enableZoom enableDamping
          dampingFactor={0.04}
          maxPolarAngle={Math.PI / 2 - 0.06}
          minDistance={20}
          maxDistance={320}
          autoRotate
          autoRotateSpeed={0.12}
        />
      </Canvas>
    </div>
  );
}
