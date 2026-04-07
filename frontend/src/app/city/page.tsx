/* eslint-disable */
// @ts-nocheck
"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { SpectatorHUD } from "@/components/SpectatorHUD";
import type { AgentInfo } from "@/components/Megatowers";

const Scene = dynamic(() => import("@/components/Scene"), { ssr: false });

export default function CityPage() {
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);

  const handleSelectAgent = useCallback((agent: AgentInfo | null) => {
    setSelectedAgent(agent);
  }, []);

  const handleCloseAgent = useCallback(() => {
    setSelectedAgent(null);
  }, []);

  return (
    <main className="relative w-full h-screen overflow-hidden bg-black font-pixel">
      <Scene onSelectAgent={handleSelectAgent} />
      <SpectatorHUD selectedAgent={selectedAgent} onCloseAgent={handleCloseAgent} />
    </main>
  );
}
