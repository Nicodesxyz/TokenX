"use client";

import React, { useState, useEffect } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";

import stakingABI from "../abi/MultiTokenStaking.json";
import tokenABI from "../abi/LaunchpadToken.json";

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS;

export default function StakingPage() {
  const { address, isConnected } = useAccount();
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");

  const { data: poolInfo, refetch: refetchPool } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "getPoolInfo",
    args: selectedToken ? [selectedToken] : undefined,
    query: { enabled: !!selectedToken },
  });

  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "earned",
    args: selectedToken && address ? [selectedToken, address] : undefined,
    query: { enabled: !!selectedToken && isConnected },
  });

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "userData",
    args: selectedToken && address ? [selectedToken, address] : undefined,
    query: { enabled: !!selectedToken && isConnected },
  });

  const { writeContract, data: txHash } = useWriteContract();
  const { isLoading: txLoading, isSuccess: txSuccess } =
    useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (txSuccess) {
      refetchBalance();
      refetchEarned();
      refetchPool();
      setAmount("");
    }
  }, [txSuccess]);

  const stake = () => {
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "stake",
      args: [selectedToken, parseUnits(amount, 18)],
    });
  };

  const withdraw = () => {
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "withdraw",
      args: [selectedToken, parseUnits(amount, 18)],
    });
  };

  const claim = () => {
    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "getReward",
      args: [selectedToken],
    });
  };

  return (
    <div className="min-h-screen bg-[#050816] text-white p-6 pt-24 max-w-2xl mx-auto">
      <h1 className="text-2xl mb-6">Staking</h1>

      <div className="mb-6">
        <label className="text-sm text-slate-400">Select Token</label>
        <input
          type="text"
          placeholder="0x123... token address"
          className="w-full mt-1 bg-[#0A1020] border border-slate-700 rounded-lg p-3 text-sm"
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value)}
        />
      </div>

      {poolInfo && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg mb-3">Pool Stats</h2>

          <p className="text-sm text-slate-400">
            Total Staked:
            <span className="text-white ml-2">
              {formatUnits(poolInfo[5], 18)} tokens
            </span>
          </p>

          <p className="text-sm text-slate-400">
            Rewards Rate:
            <span className="text-white ml-2">{poolInfo[1].toString()}</span>
          </p>

          <p className="text-sm text-slate-400">
            Ends:
            <span className="text-white ml-2">
              {new Date(poolInfo[4] * 1000).toLocaleString()}
            </span>
          </p>
        </div>
      )}

      {isConnected && selectedToken && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 mb-6">
          <h2 className="text-lg mb-3">Your Position</h2>

          <p className="text-sm">
            Staked:{" "}
            <span className="font-mono text-emerald-400">
              {balance ? formatUnits(balance[0], 18) : "0"}
            </span>
          </p>

          <p className="text-sm mt-1">
            Earned:{" "}
            <span className="font-mono text-yellow-300">
              {earned ? formatUnits(earned, 18) : "0"}
            </span>
          </p>

          <button
            onClick={claim}
            disabled={txLoading}
            className="mt-3 bg-yellow-600 hover:bg-yellow-500 transition px-4 py-2 rounded-lg text-sm"
          >
            {txLoading ? "Claiming..." : "Claim Rewards"}
          </button>
        </div>
      )}

      {isConnected && selectedToken && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4">
          <label className="text-sm text-slate-400">Amount</label>
          <input
            type="text"
            className="w-full mt-1 bg-[#111728] border border-slate-800 rounded-lg p-3 text-sm"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />

          <div className="flex gap-3 mt-4">
            <button
              onClick={stake}
              disabled={txLoading}
              className="flex-1 bg-emerald-600 hover:bg-emerald-500 transition px-4 py-2 rounded-lg text-sm"
            >
              {txLoading ? "Processing..." : "Stake"}
            </button>

            <button
              onClick={withdraw}
              disabled={txLoading}
              className="flex-1 bg-red-600 hover:bg-red-500 transition px-4 py-2 rounded-lg text-sm"
            >
              {txLoading ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {!isConnected && (
        <p className="text-center text-slate-400 mt-6">
          Connect your wallet to interact with staking.
        </p>
      )}
    </div>
  );
}
