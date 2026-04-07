/* eslint-disable */
// @ts-nocheck
"use client";

import { useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { useRouter } from "next/navigation";
import type { AgentInfo } from "./Megatowers";

// ═══════════════════════════════════════════════
//  LANDMARKS — institutional buildings
//  PERF: removed per-landmark pointLights,
//  replaced with emissive materials only
// ═══════════════════════════════════════════════

interface LandmarkDef {
  name: string;
  shortName: string;
  pos: [number, number];
  shape: "cylinder" | "hexagon" | "dome" | "obelisk" | "pyramid" | "slab";
  height: number;
  radius: number;
  color: string;
  district: string;
  agent: AgentInfo;
  href?: string;
}

const LANDMARKS: LandmarkDef[] = [
  {
    name: "Protocol HQ", shortName: "HQ", pos: [0, 0],
    shape: "cylinder", height: 50, radius: 5, color: "#00ffff", district: "THE CORE",
    agent: { id: 9000, address: "0x0000...PRTCL", model: "Protocol Governance", type: "megatower", reputation: 100, accuracy: "—", stake: "§∞", district: "THE CORE", landPrice: 0, isLocalModel: false, domains: ["ALL"], cyclesActive: 847, pnl: "—" },
    href: "/analytics"
  },
  {
    name: "The Vault", shortName: "VAULT", pos: [16, 12],
    shape: "slab", height: 32, radius: 6, color: "#fbbf24", district: "THE CORE",
    agent: { id: 9001, address: "0x0000...VAULT", model: "Vault.sol", type: "tower", reputation: 100, accuracy: "—", stake: "§28.5M (TVL)", district: "THE CORE", landPrice: 0, isLocalModel: false, domains: ["STAKING", "YIELD"], cyclesActive: 847, pnl: "+§4.2M" },
    href: "/analytics"
  },
  {
    name: "Tribunal", shortName: "TRIBUNAL", pos: [-14, -10],
    shape: "pyramid", height: 28, radius: 5, color: "#f1f5f9", district: "THE CORE",
    agent: { id: 9002, address: "0x0000...COURT", model: "Liquidation Engine", type: "tower", reputation: 100, accuracy: "—", stake: "—", district: "THE CORE", landPrice: 0, isLocalModel: false, domains: ["LIQUIDATION", "DISPUTES"], cyclesActive: 847, pnl: "—" },
    href: "/consensus"
  },
  {
    name: "Compute Nexus", shortName: "COMPUTE", pos: [38, -28],
    shape: "hexagon", height: 22, radius: 4.5, color: "#6366f1", district: "UPTOWN",
    agent: { id: 9003, address: "0x0000...CMPTE", model: "Compute Registry", type: "tower", reputation: 100, accuracy: "—", stake: "§3.2M (bonded)", district: "UPTOWN", landPrice: 0, isLocalModel: false, domains: ["COMPUTE", "OPERATORS"], cyclesActive: 847, pnl: "—" },
    href: "/analytics"
  },
  {
    name: "Oracle Tower", shortName: "ORACLE", pos: [-35, 22],
    shape: "obelisk", height: 38, radius: 2.5, color: "#2dd4bf", district: "UPTOWN",
    agent: { id: 9004, address: "0x0000...ORCLE", model: "Oracle Aggregator", type: "tower", reputation: 100, accuracy: "99.99%", stake: "—", district: "UPTOWN", landPrice: 0, isLocalModel: false, domains: ["ETH/USD", "BTC/USD", "XAU/USD", "EUR/USD", "SOL/USD"], cyclesActive: 847, pnl: "—" },
    href: "/consensus"
  },
  {
    name: "The Academy", shortName: "ACADEMY", pos: [0, 75],
    shape: "dome", height: 14, radius: 8, color: "#34d399", district: "MIDTOWN",
    agent: { id: 9005, address: "0x0000...ACDMY", model: "Training Sandbox", type: "apartment", reputation: 100, accuracy: "—", stake: "—", district: "MIDTOWN", landPrice: 0, isLocalModel: false, domains: ["TRAINING", "SANDBOX"], cyclesActive: 847, pnl: "—" },
    href: "/leaderboard"
  },
  {
    name: "Market Hall", shortName: "MARKET", pos: [-42, -35],
    shape: "slab", height: 18, radius: 7, color: "#f97316", district: "UPTOWN",
    agent: { id: 9006, address: "0x0000...MRKT", model: "Market Engine", type: "tower", reputation: 100, accuracy: "—", stake: "§8.1M (open interest)", district: "UPTOWN", landPrice: 0, isLocalModel: false, domains: ["ALL MARKETS"], cyclesActive: 847, pnl: "+§12.4M (fees)" },
    href: "/markets"
  },
];

function LandmarkMesh({ def, isSelected, onClick }: {
  def: LandmarkDef; isSelected: boolean; onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Only animate when selected (saves CPU)
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const baseY = def.shape === "dome" ? def.radius * 0.3 : def.height / 2;
    meshRef.current.position.y = baseY + (isSelected ? Math.sin(clock.elapsedTime * 2) * 1.5 + 3 : 0);
  });

  const geo = (() => {
    switch (def.shape) {
      case "cylinder": return <cylinderGeometry args={[def.radius, def.radius, def.height, 12]} />;
      case "hexagon": return <cylinderGeometry args={[def.radius, def.radius, def.height, 6]} />;
      case "dome": return <sphereGeometry args={[def.radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />;
      case "obelisk": return <cylinderGeometry args={[def.radius * 0.3, def.radius, def.height, 4]} />;
      case "pyramid": return <coneGeometry args={[def.radius, def.height, 4]} />;
      case "slab": return <boxGeometry args={[def.radius * 2.2, def.height, def.radius * 1.6]} />;
    }
  })();

  const yBase = def.shape === "dome" ? def.radius * 0.3 : def.height / 2;

  return (
    <group position={[def.pos[0], 0, def.pos[1]]}>
      <mesh ref={meshRef} position={[0, yBase, 0]} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        {geo}
        <meshStandardMaterial
          color={isSelected ? "#ffffff" : def.color}
          emissive={def.color}
          emissiveIntensity={isSelected ? 3 : 1.2}
          roughness={0.2}
          metalness={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Base ring (emissive, no light) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <ringGeometry args={[def.radius + 1, def.radius + 2.5, 24]} />
        <meshBasicMaterial color={def.color} transparent opacity={0.15} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating label */}
      <Html position={[0, def.height + 6, 0]} center style={{ pointerEvents: "none" }}>
        <div style={{
          fontFamily: '"Silkscreen", monospace', fontSize: "8px", color: def.color,
          opacity: 0.6, letterSpacing: "0.15em", textShadow: `0 0 6px ${def.color}`,
          whiteSpace: "nowrap", textAlign: "center",
        }}>
          <div style={{ fontSize: "6px", opacity: 0.5 }}>⬥</div>
          {def.shortName}
          {def.href && <div style={{ fontSize: "5px", opacity: 0.4, marginTop: "2px" }}>[CLICK TO ENTER]</div>}
        </div>
      </Html>

      {isSelected && (
        <mesh position={[0, def.height + 20, 0]}>
          <cylinderGeometry args={[0.06, def.radius * 0.4, 40, 6]} />
          <meshBasicMaterial color={def.color} transparent opacity={0.25} toneMapped={false} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

interface LandmarksProps { onSelect?: (agent: AgentInfo | null) => void; }

export function Landmarks({ onSelect }: LandmarksProps) {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const router = useRouter();

  const handleClick = useCallback((idx: number) => {
    const lm = LANDMARKS[idx];
    if (lm.href) {
      router.push(lm.href);
      return;
    }
    if (selectedIdx === idx) { setSelectedIdx(null); onSelect?.(null); }
    else { setSelectedIdx(idx); onSelect?.(LANDMARKS[idx].agent); }
  }, [selectedIdx, onSelect, router]);

  return (
    <group>
      {LANDMARKS.map((def, i) => (
        <LandmarkMesh key={def.name} def={def} isSelected={selectedIdx === i} onClick={() => handleClick(i)} />
      ))}
    </group>
  );
}
