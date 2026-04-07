/* eslint-disable */
// @ts-nocheck
"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { createChart, CandlestickSeries, HistogramSeries, ColorType } from "lightweight-charts";
import { generateOHLCV, DOMAINS } from "@/lib/mockMarketData";

interface PriceChartProps {
  activeDomain: string;
}

export function PriceChart({ activeDomain }: PriceChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);

  const data = useMemo(() => generateOHLCV(activeDomain, 120), [activeDomain]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clean up previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#64748b",
        fontFamily: '"Silkscreen", monospace',
        fontSize: 9,
      },
      grid: {
        vertLines: { color: "#0f172a" },
        horzLines: { color: "#0f172a" },
      },
      crosshair: {
        vertLine: { color: "#00ffff40", width: 1, style: 2 },
        horzLine: { color: "#00ffff40", width: 1, style: 2 },
      },
      timeScale: {
        borderColor: "#1e293b",
        timeVisible: true,
      },
      rightPriceScale: {
        borderColor: "#1e293b",
      },
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
    });

    chartRef.current = chart;

    // Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00ffff",
      downColor: "#ef4444",
      borderUpColor: "#00ffff",
      borderDownColor: "#ef4444",
      wickUpColor: "#00ffff80",
      wickDownColor: "#ef444480",
    });

    candleSeries.setData(data);

    // Volume series
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });

    volumeSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.85, bottom: 0 },
    });

    volumeSeries.setData(
      data.map((d) => ({
        time: d.time,
        value: d.volume,
        color: d.close >= d.open ? "#00ffff15" : "#ef444415",
      }))
    );

    chart.timeScale().fitContent();

    // Resize observer
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [data, activeDomain]);

  // Current price info
  const lastCandle = data[data.length - 1];
  const prevCandle = data[data.length - 2];
  const priceChange = lastCandle && prevCandle
    ? ((lastCandle.close - prevCandle.close) / prevCandle.close * 100).toFixed(2)
    : "0.00";
  const isUp = Number(priceChange) >= 0;

  return (
    <div className="panel panel-glow p-0 overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-[#1a1a2a]">
        <div className="flex items-center gap-3">
          <span className="text-sm text-warm tracking-wider">{activeDomain}</span>
          {lastCandle && (
            <>
              <span className="text-lg text-cyan">
                {activeDomain === "EUR/USD"
                  ? lastCandle.close.toFixed(4)
                  : lastCandle.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-[10px] ${isUp ? "text-green" : "text-red"}`}>
                {isUp ? "▲" : "▼"} {priceChange}%
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2 text-[8px] text-muted">
          <span className="px-2 py-1 border border-[#1a1a2a] bg-cyan/5 text-cyan">1H</span>
          <span className="px-2 py-1 border border-[#1a1a2a]">4H</span>
          <span className="px-2 py-1 border border-[#1a1a2a]">1D</span>
          <span className="px-2 py-1 border border-[#1a1a2a]">1W</span>
        </div>
      </div>
      {/* Chart container */}
      <div ref={containerRef} className="flex-1 min-h-0" />
    </div>
  );
}
