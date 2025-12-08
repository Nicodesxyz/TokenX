"use client";

import React, { useMemo, useState } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { formatUnits } from "viem";

import factoryABI from "./abi/TokenFactory.json";
import launchpadABI from "./abi/LaunchpadToken.json";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;

export default function HomePage() {
  const [copiedAddress, setCopiedAddress] = useState(null);

  const {
    data: tokensData,
    isLoading: isTokensLoading,
    error: tokensError,
  } = useReadContract({
    address: FACTORY_ADDRESS,
    abi: factoryABI.abi,
    functionName: "getAllTokens",
  });

  const tokens = useMemo(() => tokensData ?? [], [tokensData]);

  const ownerCalls = tokens.map((t) => ({
    address: t.token,
    abi: launchpadABI.abi,
    functionName: "owner",
  }));

  const supplyCalls = tokens.map((t) => ({
    address: t.token,
    abi: launchpadABI.abi,
    functionName: "totalSupply",
  }));

  const { data: ownersData, isLoading: ownersLoading } = useReadContracts({
    contracts: ownerCalls,
    query: { enabled: tokens.length > 0 },
  });

  const { data: supplyData, isLoading: supplyLoading } = useReadContracts({
    contracts: supplyCalls,
    query: { enabled: tokens.length > 0 },
  });

  const loading = isTokensLoading || ownersLoading || supplyLoading;
  const zeroAddress = "0x0000000000000000000000000000000000000000";

  const handleCopy = (address) => {
    if (!address) return;
    navigator.clipboard
      .writeText(address)
      .then(() => {
        setCopiedAddress(address);
        setTimeout(() => setCopiedAddress(null), 1200);
      })
      .catch((err) => {
        console.error("Copy failed:", err);
      });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Tokens Deployed using TokenX Factory
        </h1>
        <p className="text-sm text-slate-400">
          Compact overview of all tokens you deployed on Sepolia.
        </p>
      </div>

      {tokensError && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm">
          Error loading tokens: {tokensError.message}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-5 text-sm text-slate-300">
          Loading tokens...
        </div>
      )}

      {!loading && tokens.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-5 text-sm text-slate-300">
          No tokens deployed yet.
        </div>
      )}

      <div className="grid gap-3 grid-cols-[repeat(auto-fit,minmax(220px,1fr))]">
        {!loading &&
          tokens.map((tokenInfo, idx) => {
            const {
              name,
              symbol,
              decimals,
              mintable,
              burnable,
              token: tokenAddress,
            } = tokenInfo;

            const decimalsNum = Number(decimals);

            const owner =
              ownersData?.[idx]?.result ?? ownersData?.[idx] ?? null;

            const renounced = owner && owner.toLowerCase() === zeroAddress;

            const supplyRaw =
              supplyData?.[idx]?.result ?? supplyData?.[idx] ?? null;

            let supply = "0";
            try {
              supply = supplyRaw ? formatUnits(supplyRaw, decimalsNum) : "0";
            } catch {
              supply = supplyRaw?.toString?.() || "0";
            }

            const isCopied = copiedAddress === tokenAddress;

            return (
              <div
                key={idx}
                className="
                  rounded-xl 
                  border border-slate-800/80 
                  bg-[#0A1020]/90 
                  p-4 
                  shadow-[0_0_25px_rgba(15,23,42,0.5)]
                  flex flex-col gap-2
                  max-w-[350px]
                "
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-semibold text-slate-50">
                      {name}
                    </h2>
                    <p className="text-xs text-slate-400">({symbol})</p>
                  </div>
                </div>

                <div className="mt-1">
                  <p className="text-xs text-slate-500">Current Supply</p>
                  <p className="font-mono text-sm text-slate-100">
                    {supply} <span className="text-slate-500">{symbol}</span>
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap mt-1">
                  {mintable ? (
                    <span
                      className="
                      text-[0.65rem] px-2 py-0.5 rounded-full
                      border border-emerald-500/60 text-emerald-300 bg-emerald-500/10
                    "
                    >
                      Mintable
                    </span>
                  ) : (
                    <span
                      className="
                      text-[0.65rem] px-2 py-0.5 rounded-full
                      border border-slate-700 text-slate-300 bg-slate-800
                    "
                    >
                      Fixed
                    </span>
                  )}

                  {burnable ? (
                    <span
                      className="
                      text-[0.65rem] px-2 py-0.5 rounded-full
                      border border-orange-400/60 text-orange-200 bg-orange-400/10
                    "
                    >
                      Burnable
                    </span>
                  ) : (
                    <span
                      className="
                      text-[0.65rem] px-2 py-0.5 rounded-full
                      border border-slate-700 text-slate-300 bg-slate-800
                    "
                    >
                      Non-burnable
                    </span>
                  )}
                </div>

                <div className="mt-2 text-xs text-slate-400">
                  Ownership renounced:
                  {renounced ? (
                    <span className="ml-1 text-emerald-400 font-semibold">
                      Yes
                    </span>
                  ) : (
                    <span className="ml-1 text-red-400 font-semibold">No</span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between">
                  <div className="text-[0.70rem] text-slate-500 font-mono">
                    {tokenAddress.slice(0, 6)}...{tokenAddress.slice(-4)}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleCopy(tokenAddress)}
                    className={`
                      text-[0.65rem] px-2 py-1 rounded-full border transition
                      ${
                        isCopied
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-300"
                          : "border-slate-700 bg-slate-800 text-slate-300 hover:border-slate-500"
                      }
                    `}
                  >
                    {isCopied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
