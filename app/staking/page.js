"use client";

import React, { useEffect, useMemo, useState } from "react";
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

const approveAbi = [
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
];

export default function StakingPage() {
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [selectedToken, setSelectedToken] = useState("");
  const [amount, setAmount] = useState("");
  const [rewardAmount, setRewardAmount] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [localError, setLocalError] = useState("");
  const [isStakeApproved, setIsStakeApproved] = useState(false);
  const [isPoolApproved, setIsPoolApproved] = useState(false);
  const [currentAction, setCurrentAction] = useState(null);

  useEffect(() => setMounted(true), []);
  const isConnectedSafe = mounted && isConnected;

  const isValidToken =
    selectedToken &&
    selectedToken.startsWith("0x") &&
    selectedToken.length === 42;

  useEffect(() => {
    setIsStakeApproved(false);
    setIsPoolApproved(false);
  }, [selectedToken, address]);

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

  const poolExists = !!(poolInfo && poolInfo[0]);

  const { data: earned, refetch: refetchEarned } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "earned",
    args:
      isValidToken && address && poolExists
        ? [selectedToken, address]
        : undefined,
    query: {
      enabled: !!STAKING_ADDRESS && isValidToken && !!address && poolExists,
    },
  });

  const { data: userData, refetch: refetchUser } = useReadContract({
    address: STAKING_ADDRESS,
    abi: stakingABI.abi,
    functionName: "userData",
    args:
      isValidToken && address && poolExists
        ? [selectedToken, address]
        : undefined,
    query: {
      enabled: !!STAKING_ADDRESS && isValidToken && !!address && poolExists,
    },
  });

  const stakedBalance = useMemo(() => {
    if (!userData) return 0n;
    return userData[0] ?? 0n;
  }, [userData]);

  const {
    writeContract: writeApproveStake,
    data: stakeApproveHash,
    isPending: isStakeApprovePending,
    error: stakeApproveError,
  } = useWriteContract();

  const {
    writeContract: writeApprovePool,
    data: poolApproveHash,
    isPending: isPoolApprovePending,
    error: poolApproveError,
  } = useWriteContract();

  const {
    writeContract: writeMain,
    data: mainHash,
    isPending: isMainPending,
    error: mainError,
  } = useWriteContract();

  const {
    isLoading: isStakeApproveConfirming,
    isSuccess: stakeApproveConfirmed,
  } = useWaitForTransactionReceipt({ hash: stakeApproveHash });

  const {
    isLoading: isPoolApproveConfirming,
    isSuccess: poolApproveConfirmed,
  } = useWaitForTransactionReceipt({ hash: poolApproveHash });

  const { isLoading: isMainConfirming, isSuccess: isMainConfirmed } =
    useWaitForTransactionReceipt({ hash: mainHash });

  useEffect(() => {
    if (stakeApproveConfirmed) setIsStakeApproved(true);
  }, [stakeApproveConfirmed]);

  useEffect(() => {
    if (poolApproveConfirmed) setIsPoolApproved(true);
  }, [poolApproveConfirmed]);

  useEffect(() => {
    if (isMainConfirmed) {
      refetchPool?.();
      refetchEarned?.();
      refetchUser?.();
      if (currentAction === "stake") {
        setAmount("");
      }
      setLocalError("");
      setCurrentAction(null);
    }
  }, [isMainConfirmed, currentAction, refetchPool, refetchEarned, refetchUser]);

  const approvingStake = isStakeApprovePending || isStakeApproveConfirming;
  const approvingPool = isPoolApprovePending || isPoolApproveConfirming;
  const mainLoading = isMainPending || isMainConfirming;

  const chainError = stakeApproveError || poolApproveError || mainError;
  const chainErrorMsg = chainError?.shortMessage || chainError?.message;

  const handleApproveStake = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to approve.");
      return;
    }

    let parsed;
    try {
      parsed = parseUnits(amount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid amount format.");
      return;
    }

    setCurrentAction("approve-stake");

    writeApproveStake({
      address: selectedToken,
      abi: approveAbi,
      functionName: "approve",
      args: [STAKING_ADDRESS, parsed],
    });
  };

  const handleStake = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }
    if (!poolExists) {
      setLocalError(
        "This token does not have a staking pool yet. From the creator wallet, use the admin section below to fund rewards and create the pool."
      );
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to stake.");
      return;
    }

    let parsed;
    try {
      parsed = parseUnits(amount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid amount format.");
      return;
    }

    setCurrentAction("stake");

    writeMain({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "stake",
      args: [selectedToken, parsed],
      gas: 800000n,
    });
  };

  const handleWithdraw = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }
    if (!poolExists) {
      setLocalError("This token has no active pool yet.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to withdraw.");
      return;
    }

    let parsed;
    try {
      parsed = parseUnits(amount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid amount format.");
      return;
    }

    setCurrentAction("withdraw");

    writeMain({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "withdraw",
      args: [selectedToken, parsed],
    });
  };

  const handleClaim = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Enter a valid token address (0x…).");
      return;
    }
    if (!poolExists) {
      setLocalError("This token has no active pool yet.");
      return;
    }

    setCurrentAction("claim");

    writeMain({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "getReward",
      args: [selectedToken],
    });
  };

  const handleApprovePool = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
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

    let parsed;
    try {
      parsed = parseUnits(rewardAmount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid reward amount format.");
      return;
    }

    setCurrentAction("approve-pool");

    writeApprovePool({
      address: selectedToken,
      abi: approveAbi,
      functionName: "approve",
      args: [STAKING_ADDRESS, parsed],
    });
  };

  const handleFund = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }
    if (!STAKING_ADDRESS) {
      setLocalError("Staking contract address is not configured.");
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
    } catch {
      setLocalError("Invalid reward amount format.");
      return;
    }

    let daysBigInt;
    try {
      daysBigInt = BigInt(durationDays);
    } catch {
      setLocalError("Invalid duration format.");
      return;
    }

    const durationSeconds = daysBigInt * 24n * 60n * 60n;

    setCurrentAction("fund");

    writeMain({
      address: STAKING_ADDRESS,
      abi: stakingABI.abi,
      functionName: "fundRewards",
      args: [selectedToken, parsedReward, durationSeconds],
    });
  };

  let totalStaked = "0";
  let periodEndString = "-";
  let rewardRateDisplay = "0";

  if (poolInfo && poolExists) {
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

  const handleMainButtonClick = () => {
    if (isStakeApproved) handleStake();
    else handleApproveStake();
  };

  const mainButtonLabel = () => {
    if (currentAction === "approve-stake" && approvingStake)
      return "Approving...";
    if (currentAction === "stake" && mainLoading) return "Staking...";
    if (isStakeApproved) return "Stake";
    return "Approve";
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Staking</h1>
        <p className="text-sm text-slate-400">
          Stake any TokenX asset to earn rewards. Pools are created and funded
          by the token creator wallet, then anyone can stake.
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

      {isValidToken && poolExists && (
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

      {isValidToken && !poolExists && (
        <div className="bg-[#0A1020] border border-yellow-600/50 rounded-xl p-4 space-y-2">
          <h2 className="text-sm font-semibold text-yellow-300">
            No pool yet for this token
          </h2>
          <p className="text-xs text-yellow-100">
            This token does not have a staking pool yet. The token creator (or
            the wallet that deployed the TokenX staking contract) must create
            and fund a pool once:
          </p>
          <ul className="text-[0.7rem] text-yellow-100 list-disc list-inside space-y-1">
            <li>Connect with the creator/deployer wallet.</li>
            <li>Paste this token address.</li>
            <li>Use the “Admin – Fund rewards” section below.</li>
            <li>Approve and Fund rewards to create the pool.</li>
          </ul>
          <p className="text-[0.7rem] text-yellow-100">
            After that, anyone can Approve &amp; Stake this token.
          </p>
        </div>
      )}

      {isConnectedSafe && isValidToken && poolExists && (
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
            disabled={mainLoading || !earned || earned === 0n}
            className="mt-3 inline-flex items-center rounded-lg bg-yellow-600 px-4 py-2 text-xs font-semibold text-black hover:bg-yellow-500 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {mainLoading && currentAction === "claim"
              ? "Claiming..."
              : "Claim rewards"}
          </button>
        </div>
      )}

      {isConnectedSafe && isValidToken && (
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
              onClick={handleMainButtonClick}
              disabled={!isValidToken || approvingStake || mainLoading}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mainButtonLabel()}
            </button>

            <button
              type="button"
              onClick={handleWithdraw}
              disabled={mainLoading || approvingStake}
              className="flex-1 inline-flex items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mainLoading && currentAction === "withdraw"
                ? "Processing..."
                : "Withdraw"}
            </button>
          </div>
        </div>
      )}

      {isConnectedSafe && isValidToken && isOwner && (
        <div className="bg-[#0A1020] border border-emerald-700 rounded-xl p-4 space-y-3">
          <h2 className="text-sm font-semibold text-emerald-400">
            Admin – Create and fund pool
          </h2>

          <p className="text-[0.7rem] text-slate-300">
            Use this section from the token creator/deployer wallet to create
            and fund a staking pool. Once funded, everyone can stake this token
            above.
          </p>

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
              onClick={handleApprovePool}
              disabled={approvingPool || mainLoading || !rewardAmount}
              className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {approvingPool && currentAction === "approve-pool"
                ? "Approving..."
                : "Approve contract"}
            </button>

            <button
              type="button"
              onClick={handleFund}
              disabled={
                mainLoading ||
                approvingPool ||
                !rewardAmount ||
                Number(rewardAmount) <= 0 ||
                !durationDays ||
                Number(durationDays) <= 0 ||
                !isPoolApproved
              }
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-black hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mainLoading && currentAction === "fund"
                ? "Funding..."
                : "Fund rewards"}
            </button>
          </div>

          <p className="text-[0.7rem] text-slate-400">
            Step 1: Approve the reward amount from the token creator wallet.{" "}
            Step 2: Fund rewards to create/update the pool.
          </p>
        </div>
      )}

      {!isConnectedSafe && (
        <p className="text-center text-xs text-slate-400">
          Connect your wallet to use staking.
        </p>
      )}
    </div>
  );
}
