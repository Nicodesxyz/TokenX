"use client";

import React, { useEffect, useState, useMemo } from "react";
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";

import stakingABI from "../abi/MultiTokenStaking.json";

const STAKING_ADDRESS = process.env.NEXT_PUBLIC_STAKING_ADDRESS;
const DEFAULT_DECIMALS = 18;

export default function StakingPage() {
  const { address, isConnected } = useAccount();

  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [localError, setLocalError] = useState("");

  const isValidToken =
    selectedToken &&
    selectedToken.startsWith("0x") &&
    selectedToken.length === 42;

  const { data: owner } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "owner",
    query: { enabled: !!STAKING_ADDRESS },
  });

  const isOwner = useMemo(() => {
    if (!address || !owner) return false;
    try {
      return address.toLowerCase() === String(owner).toLowerCase();
    } catch {
      return false;
    }
  }, [address, owner]);

  const { data: poolInfo, refetch: refetchPool } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "getPoolInfo",
    args: isValidToken ? [selectedToken] : undefined,
    query: { enabled: !!STAKING_ADDRESS && isValidToken },
  });

  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "earned",
    args: isValidToken && address ? [selectedToken, address] : undefined,
    query: { enabled: !!STAKING_ADDRESS && isValidToken && !!address },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "userData",
    args: isValidToken && address ? [selectedToken, address] : undefined,
    query: { enabled: !!STAKING_ADDRESS && isValidToken && !!address },
  });

  const stakedBalance = useMemo(() => {
    if (!userData) return 0n;
    return userData[0] ?? 0n;
  }, [userData]);

  const {
    writeContract,
    data: txHash,
    isPending,
    error: writeError,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: txError,
  } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const loading = isPending || isConfirming;
  const chainError = writeError || txError;
  const chainErrorMsg = chainError?.shortMessage || chainError?.message;

  useEffect(() => {
    if (isConfirmed) {
      refetchPool?.();
      refetchEarned?.();
      refetchUser?.();
      setAmount("");
      setLocalError("");
    }
  }, [isConfirmed, refetchPool, refetchEarned, refetchUser]);

  const handleStake = () => {
    setLocalError("");

    if (!isConnected) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to stake.");
      return;
    }

    let parsed;
    try {
      parsed = parseUnits(amount, DEFAULT_DECIMALS);
    } catch (e) {
      setLocalError("Invalid amount format.");
      return;
    }

    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "stake",
      args: [selectedToken, parsed],
    });
  };

  const handleWithdraw = () => {
    setLocalError("");

    if (!isConnected) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to withdraw.");
      return;
    }

    let parsed;
    try {
      parsed = parseUnits(amount, DEFAULT_DECIMALS);
    } catch (e) {
      setLocalError("Invalid amount format.");
      return;
    }

    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "withdraw",
      args: [selectedToken, parsed],
    });
  };

  const handleClaim = () => {
    setLocalError("");

    if (!isConnected) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }

    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "getReward",
      args: [selectedToken],
    });
  };

  const handleFund = () => {
    setLocalError("");

    if (!isConnected) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }

    if (!isOwner) {
      setLocalError("Only the contract owner can fund rewards.");
      return;
    }

    if (!rewardAmount || Number(rewardAmount) <= 0) {
      setLocalError("Enter a positive reward amount.");
      return;
    }

    if (!durationDays || Number(durationDays) <= 0) {
      setLocalError("Enter a positive duration in days.");
      return;
    }

    let parsedReward;
    try {
      parsedReward = parseUnits(rewardAmount, DEFAULT_DECIMALS);
    } catch (e) {
      setLocalError("Invalid reward amount format.");
      return;
    }

    let daysBigInt;
    try {
      daysBigInt = BigInt(durationDays);
    } catch (e) {
      setLocalError("Invalid duration format.");
      return;
    }

    const durationSeconds = daysBigInt * 24n * 60n * 60n;

    writeContract({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "fundRewards",
      args: [selectedToken, parsedReward, durationSeconds],
    });
  };

  let totalStaked = "0";
  let periodEndString = "-";
  let rewardRateDisplay = "0";

  if (poolInfo) {
    try {
      const totalStakedRaw = poolInfo[5];
      const rewardRateRaw = poolInfo[1];
      const periodFinishRaw = poolInfo[4];
      if (typeof totalStakedRaw === "bigint") {
        totalStaked = formatUnits(totalStakedRaw, DEFAULT_DECIMALS);
      }

      rewardRateDisplay =
        typeof rewardRateRaw === "bigint"
          ? rewardRateRaw.toString()
          : String(rewardRateRaw ?? "0");

      if (typeof periodFinishRaw === "bigint" && periodFinishRaw > 0n) {
        const ts = Number(periodFinishRaw);
        periodEndString = new Date(ts * 1000).toLocaleString();
      }
    } catch (e) {
      console.error("Error formatting pool info:", e);
    }
  }

  const earnedDisplay =
    typeof earned === "bigint" ? formatUnits(earned, DEFAULT_DECIMALS) : "0";

  const stakedDisplay = formatUnits(stakedBalance, DEFAULT_DECIMALS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staking</h1>
        <p className="text-sm text-slate-400">
          Stake any whitelisted TokenX asset to earn rewards from your
          MultiTokenStaking contract.
        </p>
      </div>

      {!STAKING_ADDRESS && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-100">
          Staking contract address is not configured. Set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_STAKING_ADDRESS</code>{" "}
          in your <code>.env</code>.
        </div>
      )}

      {localError && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/40 p-4 text-sm text-yellow-100">
          ⚠️ {localError}
        </div>
      )}

      {chainErrorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-100">
          ⚠️ Transaction error: {chainErrorMsg}
        </div>
      )}

      <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 space-y-2">
        <label className="text-sm text-slate-400">Token address</label>
        <input
          type="text"
          placeholder="0x... (paste from Home → Copy)"
          className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          value={selectedToken}
          onChange={(e) => setSelectedToken(e.target.value.trim())}
        />
        {!isValidToken && selectedToken && (
          <p className="text-[0.7rem] text-red-400">
            Token address must be a valid 42-character 0x address.
          </p>
        )}
      </div>

      {isValidToken && poolInfo && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Pool stats
          </h2>

          <p className="text-xs text-slate-400">
            Total staked:{" "}
            <span className="font-mono text-slate-100">{totalStaked}</span>
          </p>

          <p className="text-xs text-slate-400">
            Reward rate:{" "}
            <span className="font-mono text-slate-100">
              {rewardRateDisplay} tokens/sec
            </span>
          </p>

          <p className="text-xs text-slate-400">
            Period ends:{" "}
            <span className="font-mono text-slate-100">{periodEndString}</span>
          </p>
        </div>
      )}

      {isConnected && isValidToken && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            Your position
          </h2>

          <p className="text-xs text-slate-400">
            Staked:{" "}
            <span className="font-mono text-emerald-400">{stakedDisplay}</span>
          </p>

          <p className="text-xs text-slate-400">
            Earned:{" "}
            <span className="font-mono text-yellow-300">{earnedDisplay}</span>
          </p>

          <button
            type="button"
            onClick={handleClaim}
            disabled={loading || !earned || earned === 0n}
            className="mt-3 inline-flex items-center rounded-lg bg-yellow-600 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Claiming..." : "Claim rewards"}
          </button>
        </div>
      )}

      {isConnected && isValidToken && (
        <div className="bg-[#0A1020] border border-slate-800 rounded-xl p-4">
          <label className="text-sm text-slate-400">Amount</label>
          <input
            type="text"
            className="w-full mt-1 bg-[#111728] border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.0"
          />

          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleStake}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Stake"}
            </button>

            <button
              type="button"
              onClick={handleWithdraw}
              disabled={loading}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Processing..." : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {isConnected && isValidToken && isOwner && (
        <div className="bg-[#0A1020] border border-emerald-700 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-400">
            Admin – Fund rewards
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Reward amount</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={rewardAmount}
                onChange={(e) => setRewardAmount(e.target.value)}
                className="w-full bg-[#111728] border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="100000"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-sm text-slate-400">Duration (days)</label>
              <input
                type="number"
                min="1"
                step="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
                className="w-full bg-[#111728] border border-slate-800 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="30"
              />
            </div>
          </div>
          <div className="flex flex-row gap-1">
            <button
              type="button"
              onClick={() => {
                if (!isOwner || !isValidToken || !rewardAmount) return;
                const parsed = parseUnits(rewardAmount, DEFAULT_DECIMALS);
                writeContract({
                  address: selectedToken,
                  abi: [
                    {
                      name: "approve",
                      type: "function",
                      stateMutability: "nonpayable",
                      inputs: [
                        { name: "spender", type: "address" },
                        { name: "amount", type: "uint256" },
                      ],
                      outputs: [],
                    },
                  ],
                  functionName: "approve",
                  args: [STAKING_ADDRESS, parsed],
                });
              }}
              disabled={loading || !rewardAmount || Number(rewardAmount) <= 0}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Approving..." : "Approve contract"}
            </button>

            <button
              type="button"
              onClick={handleFund}
              disabled={
                loading ||
                !rewardAmount ||
                Number(rewardAmount) <= 0 ||
                !durationDays ||
                Number(durationDays) <= 0
              }
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Funding..." : "Fund rewards"}
            </button>
          </div>

          <p className="text-[0.7rem] text-slate-400">
            Step 1: Approve the amount. Step 2: Fund rewards.
          </p>
        </div>
      )}

      {!isConnected && (
        <p className="text-center text-xs text-slate-400">
          Connect your wallet to use staking.
        </p>
      )}
    </div>
  );
}
