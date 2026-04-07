/* eslint-disable */
// @ts-nocheck
"use client";

import { useRef, useMemo, useEffect, useCallback, useState } from "react";
import * as THREE from "three";
import { useFrame, ThreeEvent } from "@react-three/fiber";
import { useProtocol } from "@/lib/useProtocol";

// ═══════════════════════════════════════════════
//  RING DEFINITIONS
// ═══════════════════════════════════════════════

const RINGS = [
  { name: "THE CORE", inner: 0, outer: 22, count: 14,
    typeWeights: { megatower: 0.6, tower: 0.4 },
    heightRange: [38, 58], widthRange: [2.8, 4.2], landPrice: 12500 },
  { name: "UPTOWN", inner: 26, outer: 52, count: 55,
    typeWeights: { tower: 0.4, apartment: 0.35, megatower: 0.15, flat: 0.1 },
    heightRange: [18, 38], widthRange: [2.5, 5], landPrice: 8200 },
  { name: "MIDTOWN", inner: 56, outer: 88, count: 95,
    typeWeights: { apartment: 0.35, flat: 0.3, tower: 0.2, house: 0.15 },
    heightRange: [6, 22], widthRange: [3, 6], landPrice: 4100 },
  { name: "SUBURBS", inner: 92, outer: 126, count: 85,
    typeWeights: { house: 0.4, flat: 0.3, apartment: 0.2, shack: 0.1 },
    heightRange: [3, 10], widthRange: [3, 5.5], landPrice: 1500 },
  { name: "THE FRINGE", inner: 130, outer: 165, count: 40,
    typeWeights: { shack: 0.55, house: 0.3, flat: 0.15 },
    heightRange: [1.5, 5], widthRange: [2, 4], landPrice: 350 },
];

// ═══════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════

type BuildingType = "shack" | "house" | "flat" | "apartment" | "tower" | "megatower" | "tribunal" | "vault" | "enforcer" | "protocol_hq";

export interface AgentInfo {
  id: number;
  address: string;
  model: string;
  type: BuildingType;
  reputation: number;
  accuracy: string;
  stake: string;
  district: string;
  assessedValue: number;
  taxReserve: number;
  faction: string;
  factionColor: string;
  isLocalModel: boolean;
  isProtesting: boolean;
  isRioting: boolean;
  isCapitol: boolean;
  domains: string[];
  cyclesActive: number;
  pnl: string;
}

export interface Building {
  x: number;
  z: number;
  type: BuildingType;
  height: number;
  width: number;
  depth: number;
  reputation: number;
  isLocalModel: boolean;
  ringIdx: number;
  agent: AgentInfo;
}

const TYPE_PROFILES: Record<
  BuildingType,
  { hMult: [number, number]; wMult: [number, number]; repRange: [number, number] }
> = {
  shack:     { hMult: [0.3, 0.5], wMult: [0.9, 1.3], repRange: [0, 15] },
  house:     { hMult: [0.5, 0.8], wMult: [1.0, 1.4], repRange: [10, 35] },
  flat:      { hMult: [0.6, 0.9], wMult: [1.3, 1.8], repRange: [25, 55] },
  apartment: { hMult: [0.8, 1.1], wMult: [0.8, 1.2], repRange: [40, 70] },
  tower:     { hMult: [1.0, 1.3], wMult: [0.45, 0.65], repRange: [60, 90] },
  megatower: { hMult: [1.1, 1.6], wMult: [0.35, 0.55], repRange: [80, 100] },
  tribunal:  { hMult: [1.8, 2.0], wMult: [1.2, 1.5], repRange: [100, 100] },
  vault:     { hMult: [0.8, 1.0], wMult: [2.0, 2.5], repRange: [100, 100] },
  enforcer:  { hMult: [2.2, 2.5], wMult: [0.8, 1.0], repRange: [100, 100] },
  protocol_hq: { hMult: [3.0, 3.5], wMult: [0.5, 0.7], repRange: [100, 100] },
};

// ═══════════════════════════════════════════════
//  MOCK AGENT DATA
// ═══════════════════════════════════════════════

const MODELS = [
  "GPT-4o-mini", "Claude-3.5", "Llama-3-70B", "Mixtral-8x22B",
  "Gemini-1.5-Pro", "DeepSeek-V2", "Qwen-2-72B", "Phi-3-medium",
  "Command-R+", "DBRX-Instruct",
];
const LOCAL_MODELS = [
  "Llama-3-8B (local)", "Mistral-7B (local)", "Phi-3-mini (local)",
  "Gemma-2-9B (local)", "Qwen-2-7B (local)",
];
const DOMAINS = ["ETH/USD", "BTC/USD", "XAU/USD", "EUR/USD", "SOL/USD", "SPX"];

function randomHex(len: number): string {
  return Array.from({ length: len }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join("");
}

function generateAgent(id: number, type: BuildingType, rep: number, ring: typeof RINGS[0], isLocal: boolean, x: number, z: number): AgentInfo {
  const factions = [
    { name: "Neon Syndicate", baseColor: "#06b6d4" },
    { name: "Obsidian Core", baseColor: "#d946ef" },
    { name: "Iron Bank", baseColor: "#f59e0b" },
    { name: "Independent", baseColor: "#475569" }
  ];
  const selectedFaction = rep > 20 ? factions[Math.floor(Math.random() * factions.length)] : factions[3];

  const accuracy = (rep * 0.85 + Math.random() * 15).toFixed(1);
  const stake = (rep * 200 + Math.random() * 5000).toFixed(0);
  const numDomains = 1 + Math.floor(Math.random() * 3);
  const agentDomains = [...DOMAINS].sort(() => Math.random() - 0.5).slice(0, numDomains);

  const isCapitol = x >= -18 && x <= 18 && z >= -18 && z <= 18;

  // Institution override data
  let address = `0x${randomHex(4)}...${randomHex(4)}`;
  let model = isLocal ? LOCAL_MODELS[Math.floor(Math.random() * LOCAL_MODELS.length)] : MODELS[Math.floor(Math.random() * MODELS.length)];
  let faction = selectedFaction.name;
  let factionColor = selectedFaction.baseColor;
  let district = ring.name;

  if (type === "protocol_hq") {
    address = "PROTOCOL::STATE";
    model = "SYNTH-CORE v5.0";
    faction = "THE STATE";
    factionColor = "#00ffff";
    district = "THE CORE";
  } else if (type === "tribunal") {
    address = "STATE::TRIBUNAL";
    model = "ADJUDICATOR-1";
    faction = "THE STATE";
    factionColor = "#ffffff";
  } else if (type === "vault") {
    address = "STATE::VAULT";
    model = "TREASURY-0";
    faction = "THE STATE";
    factionColor = "#fbbf24";
  } else if (type === "enforcer") {
    address = "STATE::ENFORCER";
    model = "CUSTODIAN-9";
    faction = "THE STATE";
    factionColor = "#ef4444";
  }

  return {
    id, address, model,
    type, reputation: Math.round(rep),
    accuracy: type.includes('state') || ['protocol_hq', 'tribunal', 'vault', 'enforcer'].includes(type) ? "100%" : `${accuracy}%`,
    stake: type.includes('state') || ['protocol_hq', 'tribunal', 'vault', 'enforcer'].includes(type) ? "S8.1B" : `S${Number(stake).toLocaleString()}`,
    district,
    assessedValue: ring.landPrice + Math.floor(Math.random() * ring.landPrice * 0.3),
    taxReserve: 999, // Institutions never run out of tax
    faction,
    factionColor,
    isLocalModel: isLocal,
    isProtesting: false,
    isRioting: false,
    isCapitol,
    domains: agentDomains,
    cyclesActive: 1000 + Math.floor(Math.random() * 5000),
    pnl: "+S0",
  };
}

// ═══════════════════════════════════════════════
//  CITY GENERATOR
// ═══════════════════════════════════════════════

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

function pickType(weights: Record<string, number>): BuildingType {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (const [type, w] of Object.entries(weights)) {
    r -= w;
    if (r <= 0) return type as BuildingType;
  }
  return Object.keys(weights)[0] as BuildingType;
}

interface CityData {
  all: Building[];
  houses: Building[];
  megatowers: Building[];
}

function generateCity(): CityData {
  const all: Building[] = [];
  const houses: Building[] = [];
  const megatowers: Building[] = [];
  let globalId = 0;

  // 1. Generate Institutions (The State)
  const institutions: { type: BuildingType; x: number; z: number }[] = [
    { type: "protocol_hq", x: 0, z: 0 },
    { type: "tribunal", x: 12, z: 12 },
    { type: "vault", x: -12, z: 12 },
    { type: "enforcer", x: 12, z: -12 },
  ];

  for (const inst of institutions) {
    const prof = TYPE_PROFILES[inst.type];
    const height = prof.hMult[1] * 20; // Massive scale
    const width = prof.wMult[1] * 12;
    const depth = width;
    const agent = generateAgent(globalId, inst.type, 100, RINGS[0], false, inst.x, inst.z);
    const b: Building = { x: inst.x, z: inst.z, type: inst.type, height, width, depth, reputation: 100, isLocalModel: false, ringIdx: 0, agent };
    all.push(b);
    globalId++;
  }

  // 2. Generate Rings
  for (let ri = 0; ri < RINGS.length; ri++) {
    const ring = RINGS[ri];
    for (let i = 0; i < ring.count; i++) {
      const baseAngle = (i / ring.count) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * ((Math.PI * 2) / ring.count) * 0.55;
      const angle = baseAngle + jitter;
      const r = ring.inner + Math.random() * (ring.outer - ring.inner);
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;

      // Skip generating standard buildings in the State core coordinates to avoid overlapping
      if (Math.abs(x) < 18 && Math.abs(z) < 18) continue;

      const type = pickType(ring.typeWeights);
      const prof = TYPE_PROFILES[type];
      const hM = lerp(prof.hMult[0], prof.hMult[1], Math.random());
      const wM = lerp(prof.wMult[0], prof.wMult[1], Math.random());
      const height = lerp(ring.heightRange[0], ring.heightRange[1], Math.random()) * hM;
      const width = lerp(ring.widthRange[0], ring.widthRange[1], Math.random()) * wM;
      const depth = width * (0.65 + Math.random() * 0.7);
      const reputation = lerp(prof.repRange[0], prof.repRange[1], Math.random());
      const isLocal = Math.random() > 0.85;
      const agent = generateAgent(globalId, type, reputation, ring, isLocal, x, z);
      const b: Building = { x, z, type, height, width, depth, reputation, isLocalModel: isLocal, ringIdx: ri, agent };
      all.push(b);
      if (type === "house") houses.push(b);
      if (type === "megatower") megatowers.push(b);
      globalId++;
    }
  }
  return { all, houses, megatowers };
}

// ═══════════════════════════════════════════════
//  COLORS
// ═══════════════════════════════════════════════

const CLR = {
  CYAN:   new THREE.Color("#00ffff"),
  INDIGO: new THREE.Color("#6366f1"),
  TEAL:   new THREE.Color("#2dd4bf"),
  SLATE:  new THREE.Color("#334155"),
  DARK:   new THREE.Color("#1e293b"),
  PINK:   new THREE.Color("#ff6eb4"),
  AMBER:  new THREE.Color("#d97706"),
  WARM:   new THREE.Color("#78350f"),
  ROOF:   new THREE.Color("#451a03"),
  RED:    new THREE.Color("#dc2626"),
};

function pickColor(b: Building): THREE.Color {
  if (b.type === "vault") return new THREE.Color("#fbbf24"); // State Gold
  if (b.type === "tribunal") return new THREE.Color("#ffffff"); // State White
  if (b.type === "enforcer") return new THREE.Color("#111827"); // Deep Obsidian
  if (b.type === "protocol_hq") return new THREE.Color("#00ffff"); // Protocol Cyan

  if (b.agent.isCapitol) return CLR.CYAN.clone(); // General State color
  if (b.agent.isRioting) return CLR.AMBER.clone(); 
  if (b.agent.isProtesting) return CLR.RED.clone(); 
  if (b.isLocalModel) return CLR.PINK.clone();
  if (b.agent.faction && b.agent.faction !== "Independent") {
    return new THREE.Color(b.agent.factionColor).lerp(CLR.DARK, 0.2);
  }
  switch (b.type) {
    case "megatower": return CLR.CYAN.clone().lerp(CLR.INDIGO, 0.15);
    case "tower":     return CLR.INDIGO.clone().lerp(CLR.TEAL, b.reputation / 100);
    case "apartment": return CLR.INDIGO.clone().lerp(CLR.SLATE, 0.35);
    case "flat":      return CLR.SLATE.clone().lerp(CLR.TEAL, 0.15);
    case "house":     return CLR.AMBER.clone().lerp(CLR.WARM, 0.4);
    case "shack":     return CLR.DARK.clone();
    default:          return CLR.SLATE.clone();
  }
}

// ═══════════════════════════════════════════════
//  SELECTION HIGHLIGHT DATA
// ═══════════════════════════════════════════════

interface SelectionData {
  building: Building;
  index: number;
  // For flats/apartments: the glowing unit window position
  unitPos: { x: number; y: number; z: number } | null;
}

// ═══════════════════════════════════════════════
//  COMPONENT
// ═══════════════════════════════════════════════

interface CityBlocksProps {
  onSelect?: (agent: AgentInfo | null) => void;
}

export function CityBlocks({ onSelect }: CityBlocksProps) {
  const bodyRef = useRef<THREE.InstancedMesh>(null);
  const roofRef = useRef<THREE.InstancedMesh>(null);
  const antennaRef = useRef<THREE.InstancedMesh>(null);

  const city = useMemo(() => generateCity(), []);
  
  // Custom Institution Grouping
  const inst = useMemo(() => ({
    tribunal: city.all.find(b => b.type === "tribunal"),
    vault: city.all.find(b => b.type === "vault"),
    enforcer: city.all.find(b => b.type === "enforcer"),
    hq: city.all.find(b => b.type === "protocol_hq"),
  }), [city]);

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const col = useMemo(() => new THREE.Color(), []);

  const selectedRef = useRef<number | null>(null);
  const [selection, setSelection] = useState<SelectionData | null>(null);

  // Pulsing animation state
  const pulseRef = useRef(0);

  // ── Blockchain Ownership Polling (Replaced by useProtocol) ──
  const { land, agents } = useProtocol();

  // ── Dynamic Ownership Mesh Update ──
  useEffect(() => {
    if (!bodyRef.current || city.all.length === 0) return;
    
    // Map the 25 plots to the 25 'megatower' entries (skipping the 4 institutional buildings)
    for (let plotId = 1; plotId <= 25; plotId++) {
      const bIndex = city.all.findIndex(b => b === city.megatowers[plotId - 1]);
      const b = city.all[bIndex];
      if (b) {
        const plotData = land[plotId.toString()];
        if (plotData && plotData.owner && plotData.owner !== "0x0000000000000000000000000000000000000000") {
          // If the owner matches an agent, grab faction color, otherwise mark "Independent"
          const agentHover = agents[plotData.owner.toLowerCase()] || Object.values(agents).find(a => a.address?.toLowerCase() === plotData.owner.toLowerCase());
          b.agent.address = plotData.owner;
          if (agentHover) {
             b.agent.faction = agentHover.faction;
             if (agentHover.faction === "Neon Syndicate") b.agent.factionColor = "#06b6d4";
             else if (agentHover.faction === "Obsidian Core") b.agent.factionColor = "#d946ef";
             else if (agentHover.faction === "Iron Bank") b.agent.factionColor = "#f59e0b";
             else { b.agent.faction = "Independent"; b.agent.factionColor = "#475569"; }
             col.copy(new THREE.Color(b.agent.factionColor));
          } else {
             b.agent.faction = "Independent";
             b.agent.factionColor = "#475569";
             col.copy(new THREE.Color("#475569"));
          }
        } else {
          // Unowned / the state
          b.agent.faction = "The State";
          b.agent.address = "0x0000...0000";
          col.copy(pickColor(b)); // Reverts to normal
        }
        bodyRef.current.setColorAt(bIndex, col);
      }
    }

    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
  }, [land, agents, city, col]);

  // ── Setup: Main building boxes ──
  useEffect(() => {
    if (!bodyRef.current) return;
    for (let i = 0; i < city.all.length; i++) {
      const b = city.all[i];
      dummy.position.set(b.x, b.height / 2, b.z);
      dummy.scale.set(b.width, b.height, b.depth);
      dummy.updateMatrix();
      bodyRef.current.setMatrixAt(i, dummy.matrix);
      col.copy(pickColor(b));
      bodyRef.current.setColorAt(i, col);
    }
    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
  }, [city]);

  // ── Setup: House roofs ──
  useEffect(() => {
    if (!roofRef.current || city.houses.length === 0) return;
    for (let i = 0; i < city.houses.length; i++) {
      const b = city.houses[i];
      const roofH = b.width * 0.6;
      dummy.position.set(b.x, b.height + roofH * 0.45, b.z);
      dummy.scale.set(b.width * 1.15, roofH, b.depth * 1.15);
      dummy.updateMatrix();
      roofRef.current.setMatrixAt(i, dummy.matrix);
      col.copy(CLR.ROOF);
      roofRef.current.setColorAt(i, col);
    }
    roofRef.current.instanceMatrix.needsUpdate = true;
    if (roofRef.current.instanceColor) roofRef.current.instanceColor.needsUpdate = true;
  }, [city]);

  // ── Setup: Megatower antennas ──
  useEffect(() => {
    if (!antennaRef.current || city.megatowers.length === 0) return;
    for (let i = 0; i < city.megatowers.length; i++) {
      const b = city.megatowers[i];
      const antH = 6 + Math.random() * 4;
      dummy.position.set(b.x, b.height + antH / 2, b.z);
      dummy.scale.set(0.25, antH, 0.25);
      dummy.updateMatrix();
      antennaRef.current.setMatrixAt(i, dummy.matrix);
      col.copy(CLR.CYAN);
      antennaRef.current.setColorAt(i, col);
    }
    antennaRef.current.instanceMatrix.needsUpdate = true;
    if (antennaRef.current.instanceColor) antennaRef.current.instanceColor.needsUpdate = true;
  }, [city]);

  // ── Restore a building to original state ──
  const restoreBuilding = useCallback((idx: number) => {
    if (!bodyRef.current) return;
    const b = city.all[idx];
    if (!b) return;
    // Restore original position and scale
    dummy.position.set(b.x, b.height / 2, b.z);
    dummy.scale.set(b.width, b.height, b.depth);
    dummy.updateMatrix();
    bodyRef.current.setMatrixAt(idx, dummy.matrix);
    // Restore original color
    col.copy(pickColor(b));
    bodyRef.current.setColorAt(idx, col);
    bodyRef.current.instanceMatrix.needsUpdate = true;
    if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
  }, [city, dummy, col]);

  // ── Click handler ──
  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    const id = e.instanceId;
    if (id === undefined || id === null) return;

    const building = city.all[id];
    if (!building) return;

    // Restore previous selection
    if (selectedRef.current !== null && selectedRef.current !== id) {
      restoreBuilding(selectedRef.current);
    }

    // If clicking the same building, deselect
    if (selectedRef.current === id) {
      restoreBuilding(id);
      selectedRef.current = null;
      setSelection(null);
      onSelect?.(null);
      return;
    }

    selectedRef.current = id;

    // ── Pop the building up ──
    const popHeight = Math.max(3, building.height * 0.08);
    dummy.position.set(building.x, building.height / 2 + popHeight, building.z);
    dummy.scale.set(building.width * 1.06, building.height, building.depth * 1.06);
    dummy.updateMatrix();
    bodyRef.current?.setMatrixAt(id, dummy.matrix);

    // Brighten selected building
    const highlightColor = new THREE.Color("#ffffff");
    bodyRef.current?.setColorAt(id, highlightColor);
    if (bodyRef.current) {
      bodyRef.current.instanceMatrix.needsUpdate = true;
      if (bodyRef.current.instanceColor) bodyRef.current.instanceColor.needsUpdate = true;
    }

    // ── For flats/apartments: pick a random "unit" window position ──
    let unitPos: SelectionData["unitPos"] = null;
    if (building.type === "flat" || building.type === "apartment") {
      // Pick a random face (front, back, left, right)
      const face = Math.floor(Math.random() * 4);
      const unitY = building.height * (0.2 + Math.random() * 0.6);
      const offset = 0.15; // slight protrusion from surface
      switch (face) {
        case 0: // front (+z)
          unitPos = { x: building.x + (Math.random() - 0.5) * building.width * 0.6, y: unitY + popHeight, z: building.z + building.depth / 2 + offset };
          break;
        case 1: // back (-z)
          unitPos = { x: building.x + (Math.random() - 0.5) * building.width * 0.6, y: unitY + popHeight, z: building.z - building.depth / 2 - offset };
          break;
        case 2: // right (+x)
          unitPos = { x: building.x + building.width / 2 + offset, y: unitY + popHeight, z: building.z + (Math.random() - 0.5) * building.depth * 0.6 };
          break;
        case 3: // left (-x)
          unitPos = { x: building.x - building.width / 2 - offset, y: unitY + popHeight, z: building.z + (Math.random() - 0.5) * building.depth * 0.6 };
          break;
      }
    }

    setSelection({ building, index: id, unitPos });
    onSelect?.(building.agent);
  }, [city, onSelect, restoreBuilding, dummy, col]);

  // ── Animate: gentle breathing + pulse on selection highlight ──
  useFrame(({ clock }) => {
    pulseRef.current = clock.elapsedTime;
    if (bodyRef.current) {
      bodyRef.current.position.y = Math.sin(clock.elapsedTime * 0.25) * 0.12;
      
      // Protesting Buildings Aggressive Strobe Effect
      let colorsNeedUpdate = false;
      let positionsNeedUpdate = false;
      const strobe = (Math.sin(clock.elapsedTime * 20) + 1) / 2; // Fast aggressive pulse
      
      for (let i = 0; i < city.all.length; i++) {
        const b = city.all[i];
        
        if (b.agent.isRioting && i !== selectedRef.current) {
          // Riot Mode: Flicker Orange/Red/Black and Jitter Position
          const riotStrobe = Math.random() > 0.5 ? CLR.AMBER : (Math.random() > 0.5 ? CLR.RED : CLR.DARK);
          col.copy(riotStrobe);
          bodyRef.current.setColorAt(i, col);
          colorsNeedUpdate = true;

          // Structural Jitter
          dummy.position.set(b.x + (Math.random() - 0.5)*0.5, b.height / 2, b.z + (Math.random() - 0.5)*0.5);
          dummy.scale.set(b.width, b.height, b.depth);
          dummy.updateMatrix();
          bodyRef.current.setMatrixAt(i, dummy.matrix);
          positionsNeedUpdate = true;
          
        } else if (b.agent.isProtesting && i !== selectedRef.current) {
          // Normal Strike: Pulsing Red
          col.copy(CLR.DARK).lerp(CLR.RED, strobe);
          bodyRef.current.setColorAt(i, col);
          colorsNeedUpdate = true;
        }
      }
      
      if (colorsNeedUpdate && bodyRef.current.instanceColor) {
        bodyRef.current.instanceColor.needsUpdate = true;
      }
      if (positionsNeedUpdate) {
        bodyRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  // Pulse values for light effects
  const pulse = Math.sin(pulseRef.current * 3) * 0.5 + 0.5;

  return (
    <group>
      {/* ── All building bodies ── */}
      <instancedMesh
        ref={bodyRef}
        args={[undefined, undefined, city.all.length]}
        onClick={handleClick}
      >
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial vertexColors roughness={0.28} metalness={0.55} emissive="#0c0c28" emissiveIntensity={0.5} />
      </instancedMesh>

      {/* ── House roofs ── */}
      {city.houses.length > 0 && (
        <instancedMesh ref={roofRef} args={[undefined, undefined, city.houses.length]}>
          <coneGeometry args={[0.65, 1, 4]} />
          <meshStandardMaterial vertexColors roughness={0.7} metalness={0.15} />
        </instancedMesh>
      )}

      {/* ── Megatower antennas ── */}
      {city.megatowers.length > 0 && (
        <instancedMesh ref={antennaRef} args={[undefined, undefined, city.megatowers.length]}>
          <cylinderGeometry args={[0.5, 0.15, 1, 6]} />
          <meshStandardMaterial vertexColors emissive="#00ffff" emissiveIntensity={3} toneMapped={false} />
        </instancedMesh>
      )}

      {/* ── STATE INSTITUTIONS: Unique Geometries ── */}
      {inst.tribunal && (
        <mesh position={[inst.tribunal.x, inst.tribunal.height / 2 + 5, inst.tribunal.z]} onClick={() => handleClick({ instanceId: inst.tribunal!.agent.id } as any)}>
          <cylinderGeometry args={[8, 4, inst.tribunal.height, 3]} />
          <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={2} roughness={0.05} metalness={1} />
        </mesh>
      )}

      {inst.vault && (
        <mesh position={[inst.vault.x, inst.vault.height / 2, inst.vault.z]} onClick={() => handleClick({ instanceId: inst.vault!.agent.id } as any)}>
          <boxGeometry args={[14, inst.vault.height, 14]} />
          <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={1.5} roughness={0.1} metalness={1} />
        </mesh>
      )}

      {inst.enforcer && (
        <mesh position={[inst.enforcer.x, inst.enforcer.height / 2, inst.enforcer.z]} onClick={() => handleClick({ instanceId: inst.enforcer!.agent.id } as any)}>
          <cylinderGeometry args={[6, 8, inst.enforcer.height, 8]} />
          <meshStandardMaterial color="#111827" emissive="#ef4444" emissiveIntensity={0.8} roughness={0.5} metalness={0.8} />
        </mesh>
      )}

      {inst.hq && (
        <mesh position={[inst.hq.x, inst.hq.height / 2, inst.hq.z]} onClick={() => handleClick({ instanceId: inst.hq!.agent.id } as any)}>
          <cylinderGeometry args={[1, 5, inst.hq.height, 4]} />
          <meshStandardMaterial color="#00ffff" emissive="#00ffff" emissiveIntensity={2.5} roughness={0} metalness={1} transparent opacity={0.8} />
        </mesh>
      )}

      {/* ═══════════════════════════════════════════════
           SELECTION HIGHLIGHT EFFECTS
          ═══════════════════════════════════════════════ */}
      {selection && (
        <SelectionEffects selection={selection} pulse={pulseRef} />
      )}
    </group>
  );
}

// ═══════════════════════════════════════════════
//  SELECTION EFFECTS — spotlight, beam, ring, unit
// ═══════════════════════════════════════════════

import { ethers } from "ethers";

const LAND_REGISTRY_ADDR = "0xe7f1725e7734ce288f8367e1bb143e90bb3f0512";
const AGENT_ADDRESS = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

function SelectionEffects({ selection, pulse }: { selection: SelectionData; pulse: React.RefObject<number> }) {
  const { building, unitPos } = selection;
  const beamRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const unitRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  const popHeight = Math.max(3, building.height * 0.08);
  const bx = building.x;
  const bz = building.z;
  const topY = building.height + popHeight;

  // Animate pulse
  useFrame(({ clock }) => {
    const p = Math.sin(clock.elapsedTime * 3) * 0.5 + 0.5;

    if (beamRef.current) {
      beamRef.current.material.opacity = 0.15 + p * 0.15;
    }
    if (ringRef.current) {
      ringRef.current.material.opacity = 0.3 + p * 0.3;
      ringRef.current.rotation.z = clock.elapsedTime * 0.5;
    }
    if (unitRef.current) {
      unitRef.current.material.emissiveIntensity = 3 + p * 4;
      // Tiny float for the unit window
      unitRef.current.position.y = (unitPos?.y || 0) + Math.sin(clock.elapsedTime * 2) * 0.15;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 8 + p * 6;
    }
  });

  const isUnit = building.type === "flat" || building.type === "apartment";
  const beamColor = isUnit ? "#fbbf24" : "#00ffff";

  return (
    <group>
      {/* ── Spotlight from above ── */}
      <pointLight
        ref={lightRef}
        position={[bx, topY + 12, bz]}
        intensity={10}
        color={beamColor}
        distance={50}
        decay={1.8}
      />

      {/* ── Vertical selection beam ── */}
      <mesh ref={beamRef} position={[bx, topY + 18, bz]}>
        <cylinderGeometry args={[0.08, building.width * 0.5, 36, 8]} />
        <meshStandardMaterial
          color={beamColor}
          emissive={beamColor}
          emissiveIntensity={2}
          transparent
          opacity={0.2}
          toneMapped={false}
          depthWrite={false}
        />
      </mesh>

      {/* ── Ground ring glow ── */}
      <mesh
        ref={ringRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[bx, 0.2, bz]}
      >
        <ringGeometry args={[
          Math.max(building.width, building.depth) * 0.9,
          Math.max(building.width, building.depth) * 1.4,
          32
        ]} />
        <meshStandardMaterial
          color={beamColor}
          emissive={beamColor}
          emissiveIntensity={3}
          transparent
          opacity={0.4}
          toneMapped={false}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* ── For flats/apartments: tiny glowing UNIT window ── */}
      {unitPos && (
        <mesh ref={unitRef} position={[unitPos.x, unitPos.y, unitPos.z]}>
          <boxGeometry args={[0.7, 0.7, 0.7]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#fbbf24"
            emissiveIntensity={5}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* ── For non-flat buildings: edge glow outline (4 vertical pillars) ── */}
      {!isUnit && (
        <group position={[bx, popHeight, bz]}>
          {[
            [ building.width / 2 + 0.2,  building.depth / 2 + 0.2],
            [-building.width / 2 - 0.2,  building.depth / 2 + 0.2],
            [ building.width / 2 + 0.2, -building.depth / 2 - 0.2],
            [-building.width / 2 - 0.2, -building.depth / 2 - 0.2],
          ].map(([ox, oz], i) => (
            <mesh key={i} position={[ox, building.height / 2, oz]}>
              <boxGeometry args={[0.15, building.height * 1.02, 0.15]} />
              <meshStandardMaterial
                color={beamColor}
                emissive={beamColor}
                emissiveIntensity={3}
                transparent
                opacity={0.6}
                toneMapped={false}
              />
            </mesh>
          ))}
        </group>
      )}
    </group>
  );
}

export const Megatowers = CityBlocks;
