"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { formatUnits, parseUnits } from "viem";
import lockerABI from "../abi/MultiTokenLocker.json";

const LOCKER_ADDRESS = process.env.NEXT_PUBLIC_LOCKER_ADDRESS;
const DEFAULT_DECIMALS = 18;

export default function LockingPage() {
  const { address, isConnected } = useAccount();

  const [mounted, setMounted] = useState(false);
  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [memo, setMemo] = useState("");
  const [localError, setLocalError] = useState("");
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => setMounted(true), []);
  const isConnectedSafe = mounted && isConnected;

  const isValidToken =
    tokenAddress && tokenAddress.startsWith("0x") && tokenAddress.length === 42;

  useEffect(() => {
    setIsApproved(false);
  }, [tokenAddress]);

  const { data: lockIdsData, refetch: refetchLockIds } = useReadContract({
    address: LOCKER_ADDRESS,
    abi: lockerABI.abi,
    functionName: "getUserLocks",
    args: address ? [address] : undefined,
    query: { enabled: !!LOCKER_ADDRESS && !!address },
  });

  const lockIds = useMemo(
    () => (Array.isArray(lockIdsData) ? lockIdsData : []),
    [lockIdsData]
  );

  const {
    data: locksData,
    isLoading: locksLoading,
    refetch: refetchLocks,
  } = useReadContracts({
    contracts:
      LOCKER_ADDRESS && lockIds.length > 0
        ? lockIds.map((id) => ({
            address: LOCKER_ADDRESS,
            abi: lockerABI.abi,
            functionName: "locks",
            args: [id],
          }))
        : [],
    query: { enabled: !!LOCKER_ADDRESS && lockIds.length > 0 },
  });

  const {
    writeContract: writeApprove,
    data: approveHash,
    isPending: isApprovePending,
    error: approveError,
  } = useWriteContract();

  const {
    writeContract: writeLock,
    data: lockHash,
    isPending: isLockPending,
    error: lockError,
  } = useWriteContract();

  const { isLoading: isApproveConfirming, isSuccess: isApproveConfirmed } =
    useWaitForTransactionReceipt({ hash: approveHash });

  const { isLoading: isLockConfirming, isSuccess: isLockConfirmed } =
    useWaitForTransactionReceipt({ hash: lockHash });

  useEffect(() => {
    if (isApproveConfirmed) setIsApproved(true);
  }, [isApproveConfirmed]);

  useEffect(() => {
    if (isLockConfirmed) {
      refetchLockIds?.();
      refetchLocks?.();
      setAmount("");
      setUnlockAt("");
      setMemo("");
      setLocalError("");
      setIsApproved(false);
    }
  }, [isLockConfirmed, refetchLockIds, refetchLocks]);

  const approving = isApprovePending || isApproveConfirming;
  const locking = isLockPending || isLockConfirming;

  const chainError = approveError || lockError;
  const chainErrorMsg = chainError?.shortMessage || chainError?.message;

  const handleApprove = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Connect your wallet first.");
      return;
    }
    if (!LOCKER_ADDRESS) {
      setLocalError("Locker contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Invalid token address.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount.");
      return;
    }

    let parsedAmount;
    try {
      parsedAmount = parseUnits(amount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid amount format.");
      return;
    }

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

    writeApprove({
      address: tokenAddress,
      abi: approveAbi,
      functionName: "approve",
      args: [LOCKER_ADDRESS, parsedAmount],
    });
  };

  const handleCreateLock = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Connect your wallet first.");
      return;
    }
    if (!LOCKER_ADDRESS) {
      setLocalError("Locker contract address is not configured.");
      return;
    }
    if (!isValidToken) {
      setLocalError("Invalid token address.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount.");
      return;
    }
    if (!unlockAt) {
      setLocalError("Choose an unlock date.");
      return;
    }

    const ms = Date.parse(unlockAt);
    if (Number.isNaN(ms)) {
      setLocalError("Invalid unlock date.");
      return;
    }

    const unlockTimestamp = Math.floor(ms / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (unlockTimestamp <= now) {
      setLocalError("Unlock time must be in the future.");
      return;
    }

    let parsedAmount;
    try {
      parsedAmount = parseUnits(amount, DEFAULT_DECIMALS);
    } catch {
      setLocalError("Invalid amount format.");
      return;
    }

    writeLock({
      address: LOCKER_ADDRESS,
      abi: lockerABI.abi,
      functionName: "lockTokens",
      args: [tokenAddress, parsedAmount, BigInt(unlockTimestamp), memo || ""],
    });
  };

  const handleMainClick = () => {
    if (isApproved) handleCreateLock();
    else handleApprove();
  };

  const mainButtonLabel = () => {
    if (approving) return "Approving...";
    if (locking) return "Locking...";
    if (isApproved) return "Create lock";
    return "Approve";
  };

  const parsedLocks = useMemo(() => {
    if (!locksData || locksData.length === 0) return [];
    return locksData
      .map((entry, idx) => {
        const result = entry?.result ?? entry;
        if (!result) return null;

        const token = result[0];
        const amountRaw = result[2];
        const startRaw = result[3];
        const unlockRaw = result[4];
        const claimed = result[5];
        const memoStr = result[6];
        const lockId = lockIds[idx];

        const amountDisplay =
          typeof amountRaw === "bigint"
            ? formatUnits(amountRaw, DEFAULT_DECIMALS)
            : "0";

        const start =
          typeof startRaw === "bigint"
            ? new Date(Number(startRaw) * 1000).toLocaleString()
            : "-";

        const unlock =
          typeof unlockRaw === "bigint"
            ? new Date(Number(unlockRaw) * 1000).toLocaleString()
            : "-";

        const now = Math.floor(Date.now() / 1000);
        const unlockSec =
          typeof unlockRaw === "bigint"
            ? Number(unlockRaw)
            : Number(unlockRaw || 0);

        const ready = !claimed && unlockSec <= now;

        let status = "Locked";
        if (claimed) status = "Claimed";
        else if (ready) status = "Ready to withdraw";

        return {
          token,
          memo: memoStr,
          amountDisplay,
          start,
          unlock,
          status,
          ready,
          lockId,
        };
      })
      .filter(Boolean);
  }, [locksData, lockIds]);

  const handleWithdraw = (lockId) => {
    if (!isConnectedSafe) {
      setLocalError("Connect your wallet first.");
      return;
    }
    if (!LOCKER_ADDRESS) {
      setLocalError("Locker contract address is not configured.");
      return;
    }
    writeLock({
      address: LOCKER_ADDRESS,
      abi: lockerABI.abi,
      functionName: "withdraw",
      args: [lockId],
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Token Locking</h1>
        <p className="text-sm text-slate-400">
          Lock your ERC-20 tokens until a future date to prove commitment,
          vesting, or liquidity safety.
        </p>
      </div>

      {localError && (
        <div className="rounded-xl border border-yellow-500/40 bg-yellow-950/40 p-4 text-sm text-yellow-100">
          {localError}
        </div>
      )}

      {chainErrorMsg && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/60 p-4 text-sm text-red-100">
          {chainErrorMsg}
        </div>
      )}

      <section className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Create a new lock
        </h2>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Token address</label>
          <input
            type="text"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim())}
            placeholder="0x... (paste from Home → Copy)"
            className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Amount to lock</label>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Unlock date & time</label>
            <input
              type="datetime-local"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
              className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">
            Memo (optional – visible on chain)
          </label>
          <input
            type="text"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            placeholder="e.g. Team vesting 6 months"
            className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={handleMainClick}
          disabled={!isConnectedSafe || !LOCKER_ADDRESS || approving || locking}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mainButtonLabel()}
        </button>

        {!isConnectedSafe && (
          <p className="text-[0.7rem] text-slate-400">
            Connect your wallet to create a lock.
          </p>
        )}
      </section>

      {isConnectedSafe && LOCKER_ADDRESS && (
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-100">
            My locks ({lockIds.length})
          </h2>

          {locksLoading && (
            <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-4 text-sm text-slate-300">
              Loading locks...
            </div>
          )}

          {!locksLoading && parsedLocks.length === 0 && (
            <div className="rounded-xl border border-slate-800 bg-[#0A1020] p-4 text-sm text-slate-300">
              You don’t have any locks yet.
            </div>
          )}

          <div className="space-y-3">
            {parsedLocks.map((lock) => (
              <div
                key={lock.lockId.toString()}
                className="rounded-xl border border-slate-800 bg-[#0A1020]/90 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400">
                    Lock ID:{" "}
                    <span className="font-mono text-slate-100">
                      {lock.lockId.toString()}
                    </span>
                  </div>
                  <span
                    className={`text-[0.65rem] px-2 py-0.5 rounded-full border ${
                      lock.status === "Ready to withdraw"
                        ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                        : lock.status === "Claimed"
                        ? "border-slate-700 bg-slate-800 text-slate-300"
                        : "border-blue-500/60 bg-blue-500/10 text-blue-300"
                    }`}
                  >
                    {lock.status}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Token:{" "}
                  <span className="font-mono text-slate-200">
                    {lock.token.slice(0, 6)}...{lock.token.slice(-4)}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Amount:{" "}
                  <span className="font-mono text-emerald-400">
                    {lock.amountDisplay}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Start:{" "}
                  <span className="font-mono text-slate-200">{lock.start}</span>
                </div>

                <div className="text-xs text-slate-400">
                  Unlock:{" "}
                  <span className="font-mono text-slate-200">
                    {lock.unlock}
                  </span>
                </div>

                {lock.memo && (
                  <div className="text-[0.7rem] text-slate-400">
                    Memo: <span className="text-slate-200">{lock.memo}</span>
                  </div>
                )}

                {lock.ready && (
                  <button
                    type="button"
                    onClick={() => handleWithdraw(lock.lockId)}
                    disabled={locking || approving}
                    className="mt-2 inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-[0.75rem] font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {locking ? "Withdrawing..." : "Withdraw"}
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {!isConnectedSafe && (
        <p className="text-center text-xs text-slate-400">
          Connect your wallet to view and manage your locks.
        </p>
      )}
    </div>
  );
}
