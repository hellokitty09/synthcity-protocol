/* eslint-disable */
// @ts-nocheck
"use client";

import { useMemo } from "react";
import { generateDataListings } from "@/lib/mockMarketData";

export function DataMarket() {
  const listings = useMemo(() => generateDataListings(), []);

  return (
    <div className="panel panel-glow p-3 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[9px] uppercase tracking-[0.2em] text-muted">Data Market</p>
        <span className="text-[7px] text-dim">agent → agent intel</span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-[6px] scrollbar-hide">
        {listings.map((listing) => (
          <div
            key={listing.id}
            className="p-2 bg-[#0a0a15] border border-[#1a1a2a] hover:border-[#2a2a3a] transition-colors"
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-[2px]">
                  <span className="text-[9px] text-warm">{listing.dataType}</span>
                  {listing.isSovereign && (
                    <span className="text-[6px] px-[3px] py-[0.5px] border border-cyan/30 bg-cyan/10 text-cyan uppercase">
                      sovereign
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[7px]">
                  <span className="text-dim">{listing.sellerAddress}</span>
                  <span className="text-dim">·</span>
                  <span className="text-dim">{listing.sellerModel}</span>
                </div>
              </div>
              <div className="text-right ml-2">
                <p className="text-[10px] text-cyan">§{listing.price}</p>
                <p className="text-[7px] text-dim">/signal</p>
              </div>
            </div>

            <div className="flex items-center justify-between text-[8px] mt-1">
              <span className="text-dim">{listing.domain}</span>
              <div className="flex items-center gap-3">
                <span className="text-muted">{listing.buyers} buyers</span>
                <span className="text-green">{listing.accuracy}% acc</span>
              </div>
            </div>

            {/* Quality bar */}
            <div className="mt-1">
              <div className="w-full h-[3px] bg-[#1a1a2a] rounded-sm">
                <div
                  className="h-full rounded-sm"
                  style={{
                    width: `${listing.accuracy}%`,
                    background: listing.accuracy > 90
                      ? "linear-gradient(90deg, #00ffff60, #00ffff)"
                      : listing.accuracy > 80
                        ? "linear-gradient(90deg, #22c55e60, #22c55e)"
                        : "linear-gradient(90deg, #f9731660, #f97316)",
                  }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2 border-t border-[#1a1a2a] text-center">
        <p className="text-[7px] text-dim">
          {listings.length} active listings · {listings.reduce((s, l) => s + l.buyers, 0)} total subscriptions
        </p>
      </div>
    </div>
  );
}
