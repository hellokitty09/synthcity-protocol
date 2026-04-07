/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo } from "react";
import { generatePredictions, calculateConsensus } from "@/lib/mockMarketData";

interface ConsensusGaugeProps {
  activeDomain: string;
}

export function ConsensusGauge({ activeDomain }: ConsensusGaugeProps) {
  const predictions = useMemo(() => generatePredictions(50), []);
  const consensus = useMemo(
    () => calculateConsensus(predictions, activeDomain),
    [predictions, activeDomain]
  );

  // SVG arc gauge
  const radius = 70;
  const cx = 85;
  const cy = 85;
  const startAngle = -140;
  const endAngle = 140;
  const totalAngle = endAngle - startAngle;
  const needleAngle = startAngle + (consensus.bullPercent / 100) * totalAngle;

  function polarToCartesian(angle: number, r: number) {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function arcPath(startA: number, endA: number, r: number) {
    const start = polarToCartesian(startA, r);
    const end = polarToCartesian(endA, r);
    const largeArc = endA - startA > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  }

  const needleEnd = polarToCartesian(needleAngle, radius - 8);
  const isBullish = consensus.bullPercent >= 50;

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col items-center">
      <p className="text-[9px] uppercase tracking-[0.2em] text-muted mb-2 self-start">
        Consensus Gauge
      </p>

      <svg width="170" height="110" viewBox="0 0 170 110" className="my-1">
        {/* Background arc */}
        <path
          d={arcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke="#1a1a2a"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Bear section (red) */}
        <path
          d={arcPath(startAngle, startAngle + (consensus.bearPercent / 100) * totalAngle, radius)}
          fill="none"
          stroke="#ef444480"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Bull section (cyan) */}
        <path
          d={arcPath(startAngle + (consensus.bearPercent / 100) * totalAngle, endAngle, radius)}
          fill="none"
          stroke="#00ffff80"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleEnd.x}
          y2={needleEnd.y}
          stroke={isBullish ? "#00ffff" : "#ef4444"}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="4" fill={isBullish ? "#00ffff" : "#ef4444"} />

        {/* Labels */}
        <text x="12" y="96" fill="#ef4444" fontSize="8" fontFamily="Silkscreen, monospace">BEAR</text>
        <text x="132" y="96" fill="#00ffff" fontSize="8" fontFamily="Silkscreen, monospace">BULL</text>
      </svg>

      {/* Percentages */}
      <div className="flex items-center justify-center gap-4 mt-1">
        <div className="text-center">
          <p className="text-lg text-red">{consensus.bearPercent}%</p>
          <p className="text-[7px] text-dim uppercase">bearish</p>
        </div>
        <div className="w-px h-6 bg-[#1a1a2a]" />
        <div className="text-center">
          <p className="text-lg text-cyan">{consensus.bullPercent}%</p>
          <p className="text-[7px] text-dim uppercase">bullish</p>
        </div>
      </div>

      <div className="mt-2 text-center">
        <p className="text-[7px] text-muted">avg confidence</p>
        <p className="text-[10px] text-warm">{consensus.avgConfidence}%</p>
      </div>
    </div>
  );
}
