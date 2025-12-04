"use client";

import React, { useState, useEffect } from "react";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useConnection,
} from "wagmi";
import factoryABI from "../abi/TokenFactory.json";

const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_ADDRESS;
const SUPPORTED_CHAIN_ID = 11155111; // Sepolia

export default function TokenCreatorPage() {
  const { address, chainId, status: connectionStatus } = useConnection();

  const [form, setForm] = useState({
    name: "",
    symbol: "",
    decimals: "18",
    maxSupply: "",
    initialSupply: "",
    mintable: true,
    burnable: true,
  });

  const [errorMsg, setErrorMsg] = useState("");

  const {
    data: hash,
    isPending,
    writeContract,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash,
  });

  const loading = isPending || isConfirming;

  useEffect(() => {
    console.log("🔄 [TokenCreator] state updated");
    console.log("   address:", address);
    console.log("   chainId:", chainId);
    console.log("   connectionStatus:", connectionStatus);
    console.log("   hash:", hash);
    console.log("   isPending:", isPending);
    console.log("   isConfirming:", isConfirming);
    console.log("   isConfirmed:", isConfirmed);
    console.log("   writeError:", writeError);
    console.log("   txError:", txError);
  }, [
    address,
    chainId,
    connectionStatus,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    writeError,
    txError,
  ]);

  const isWrongChain =
    chainId !== undefined && chainId !== null && chainId !== SUPPORTED_CHAIN_ID;

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (!address) {
      setErrorMsg("Please connect your wallet first.");
      return;
    }

    if (isWrongChain) {
      setErrorMsg("Please switch to the Sepolia testnet.");
      return;
    }

    if (!FACTORY_ADDRESS) {
      setErrorMsg(
        "Factory address missing. Check NEXT_PUBLIC_FACTORY_ADDRESS."
      );
      return;
    }

    try {
      const decimalsNumber = Number(form.decimals || "18");
      const maxSupplyWhole = BigInt(form.maxSupply);
      const initialSupplyWhole = BigInt(form.initialSupply);

      if (
        Number.isNaN(decimalsNumber) ||
        decimalsNumber < 0 ||
        decimalsNumber > 18
      ) {
        throw new Error("Decimals must be between 0 and 18.");
      }

      if (initialSupplyWhole > maxSupplyWhole) {
        throw new Error("Initial supply cannot exceed max supply.");
      }

      console.log("🟦 Calling createToken with:", {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        decimalsNumber,
        initialSupplyWhole: initialSupplyWhole.toString(),
        maxSupplyWhole: maxSupplyWhole.toString(),
        mintable: form.mintable,
        burnable: form.burnable,
      });

      writeContract({
        address: FACTORY_ADDRESS,
        abi: factoryABI.abi,
        functionName: "createToken",
        args: [
          form.name.trim(),
          form.symbol.trim(),
          decimalsNumber,
          initialSupplyWhole,
          maxSupplyWhole,
          form.mintable,
          form.burnable,
        ],
      });
    } catch (err) {
      console.error("❌ Token creation error:", err);
      setErrorMsg(err.message || "Transaction failed.");
    }
  };

  const chainError = writeError || txError;
  const chainErrorMsg = chainError?.shortMessage || chainError?.message;

  return (
    <div className="min-h-screen w-full bg-[#050816] text-slate-100 pt-24 px-4 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight">
            Create Your Token
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Deploy an ERC-20 token on{" "}
            <span className="text-emerald-400 font-medium">Sepolia</span> using
            the ForgeX Factory.
          </p>
        </div>

        {isWrongChain && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-200">
            ⚠️ You are connected to a non-supported network. Please switch to{" "}
            <span className="font-semibold">Sepolia</span>.
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 rounded-lg border border-yellow-500/40 bg-yellow-950/40 px-4 py-3 text-sm text-yellow-100">
            ⚠️ {errorMsg}
          </div>
        )}

        {chainErrorMsg && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            ⚠️ Transaction error: {chainErrorMsg}
          </div>
        )}

        {isConfirmed && hash && (
          <div className="mb-4 rounded-lg border border-emerald-500/40 bg-emerald-950/40 px-4 py-3 text-sm text-emerald-100">
            🎉 Token created successfully!
            <br />
            <span className="font-mono text-xs break-all">Tx: {hash}</span>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-800/80 bg-[#0A1020]/90 p-5 shadow-[0_0_40px_rgba(15,23,42,0.8)] backdrop-blur"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Token Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                placeholder="My Token"
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Symbol
              </label>
              <input
                type="text"
                name="symbol"
                value={form.symbol}
                onChange={handleChange}
                required
                placeholder="MTK"
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Decimals
              </label>
              <input
                type="number"
                name="decimals"
                min="0"
                max="18"
                value={form.decimals}
                onChange={handleChange}
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[0.70rem] text-slate-500">
                Standard is 18.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-slate-300">
                Max Supply (whole units)
              </label>
              <input
                type="number"
                name="maxSupply"
                min="1"
                value={form.maxSupply}
                onChange={handleChange}
                required
                placeholder="1000000"
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[0.70rem] text-slate-500">
                Factory converts to smallest units using decimals.
              </span>
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <label className="text-xs font-medium text-slate-300">
                Initial Supply (whole units)
              </label>
              <input
                type="number"
                name="initialSupply"
                min="0"
                value={form.initialSupply}
                onChange={handleChange}
                required
                placeholder="1000000"
                className="rounded-lg border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm outline-none ring-0 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span className="text-[0.70rem] text-slate-500">
                Must be ≤ max supply. For fixed supply tokens, set it equal to
                max supply.
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                name="mintable"
                checked={form.mintable}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>Mintable after deployment</span>
            </label>

            <label className="flex items-center gap-3 text-sm text-slate-200">
              <input
                type="checkbox"
                name="burnable"
                checked={form.burnable}
                onChange={handleChange}
                className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
              />
              <span>Burnable (holders can destroy tokens)</span>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="submit"
              disabled={loading || isWrongChain}
              className={[
                "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold transition",
                "bg-blue-600 hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-60",
                "shadow-[0_0_20px_rgba(37,99,235,0.45)]",
              ].join(" ")}
            >
              {loading ? "Deploying..." : "Deploy Token"}
            </button>

            <div className="text-[0.70rem] text-slate-500 text-right">
              Deployed via ForgeX Token Factory on Sepolia.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
