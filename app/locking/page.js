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
  useEffect(() => setMounted(true), []);
  const isConnectedSafe = mounted && isConnected;

  const [tokenAddress, setTokenAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [unlockAt, setUnlockAt] = useState("");
  const [memo, setMemo] = useState("");
  const [localError, setLocalError] = useState("");

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

  const txLoading = isPending || isConfirming;
  const chainError = writeError || txError;
  const chainErrorMsg = chainError?.shortMessage || chainError?.message;

  const isValidToken =
    tokenAddress && tokenAddress.startsWith("0x") && tokenAddress.length === 42;

  const { data: lockIdsData, refetch: refetchLockIds } = useReadContract({
    address: LOCKER_ADDRESS,
    abi: lockerABI.abi,
    functionName: "getUserLocks",
    args: address ? [address] : undefined,
    query: {
      enabled: !!LOCKER_ADDRESS && !!address,
    },
  });

  const lockIds = useMemo(
    () => (Array.isArray(lockIdsData) ? lockIdsData : []),
    [lockIdsData]
  );

  const {
    data: locksData,
    refetch: refetchLocks,
    isLoading: locksLoading,
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
    query: {
      enabled: !!LOCKER_ADDRESS && lockIds.length > 0,
    },
  });

  useEffect(() => {
    if (isConfirmed) {
      refetchLockIds?.();
      refetchLocks?.();
      setAmount("");
      setMemo("");
      setLocalError("");
    }
  }, [isConfirmed, refetchLockIds, refetchLocks]);

  const handleCreateLock = () => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    if (!LOCKER_ADDRESS) {
      setLocalError("Locker contract address is not configured.");
      return;
    }

    if (!isValidToken) {
      setLocalError("Enter a valid token contract address (0x...).");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      setLocalError("Enter a positive amount to lock.");
      return;
    }

    if (!unlockAt) {
      setLocalError("Choose an unlock date and time.");
      return;
    }

    const unlockTimestampMs = Date.parse(unlockAt);
    if (Number.isNaN(unlockTimestampMs)) {
      setLocalError("Invalid unlock date format.");
      return;
    }

    const unlockTimestamp = Math.floor(unlockTimestampMs / 1000);
    const now = Math.floor(Date.now() / 1000);

    if (unlockTimestamp <= now) {
      setLocalError("Unlock time must be in the future.");
      return;
    }

    let parsedAmount;
    try {
      parsedAmount = parseUnits(amount, DEFAULT_DECIMALS);
    } catch (e) {
      setLocalError("Invalid amount format.");
      return;
    }

    writeContract({
      address: LOCKER_ADDRESS,
      abi: lockerABI.abi,
      functionName: "lockTokens",
      args: [tokenAddress, parsedAmount, BigInt(unlockTimestamp), memo || ""],
    });
  };

  const handleWithdraw = (lockId) => {
    setLocalError("");

    if (!isConnectedSafe) {
      setLocalError("Please connect your wallet first.");
      return;
    }

    writeContract({
      address: LOCKER_ADDRESS,
      abi: lockerABI.abi,
      functionName: "withdraw",
      args: [lockId],
    });
  };

  const parsedLocks = useMemo(() => {
    if (!locksData || locksData.length === 0) return [];

    return locksData
      .map((entry, idx) => {
        const result = entry?.result ?? entry;
        if (!result) return null;

        const token = result[0];
        const owner = result[1];
        const amountRaw = result[2];
        const startTimeRaw = result[3];
        const unlockTimeRaw = result[4];
        const claimed = result[5];
        const memoStr = result[6];

        const lockId = lockIds[idx];

        let amountDisplay = "0";
        if (typeof amountRaw === "bigint") {
          amountDisplay = formatUnits(amountRaw, DEFAULT_DECIMALS);
        }

        let startDate = "-";
        if (typeof startTimeRaw === "bigint" && startTimeRaw > 0n) {
          const n = Number(startTimeRaw);
          startDate = new Date(n * 1000).toLocaleString();
        }

        let unlockDate = "-";
        if (typeof unlockTimeRaw === "bigint" && unlockTimeRaw > 0n) {
          const n = Number(unlockTimeRaw);
          unlockDate = new Date(n * 1000).toLocaleString();
        }

        const nowSec = Math.floor(Date.now() / 1000);
        const unlockSec =
          typeof unlockTimeRaw === "bigint"
            ? Number(unlockTimeRaw)
            : Number(unlockTimeRaw || 0);

        const isUnlockable = !claimed && unlockSec > 0 && nowSec >= unlockSec;

        let status = "Locked";
        if (claimed) status = "Claimed";
        else if (isUnlockable) status = "Ready to withdraw";

        return {
          lockId,
          token,
          owner,
          amountDisplay,
          startDate,
          unlockDate,
          claimed,
          isUnlockable,
          status,
          memo: memoStr,
        };
      })
      .filter(Boolean);
  }, [locksData, lockIds]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Token Locking</h1>
        <p className="text-sm text-slate-400">
          Lock your ERC-20 tokens until a future date to prove commitment,
          vesting, or liquidity safety.
        </p>
      </div>

      {!LOCKER_ADDRESS && (
        <div className="rounded-xl border border-red-500/40 bg-red-950/50 p-4 text-sm text-red-100">
          Locker contract address is not configured. Set{" "}
          <code className="font-mono text-xs">NEXT_PUBLIC_LOCKER_ADDRESS</code>{" "}
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

      <section className="bg-[#0A1020] border border-slate-800 rounded-xl p-4 space-y-4">
        <h2 className="text-sm font-semibold text-slate-100">
          Create a new lock
        </h2>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Token address</label>
          <input
            type="text"
            placeholder="0x... (paste from Home → Copy)"
            className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={tokenAddress}
            onChange={(e) => setTokenAddress(e.target.value.trim())}
          />
          {!isValidToken && tokenAddress && (
            <p className="text-[0.7rem] text-red-400">
              Token address must be a valid 42-character 0x address.
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Amount to lock</label>
            <input
              type="text"
              placeholder="0.0"
              className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs text-slate-400">Unlock date & time</label>
            <input
              type="datetime-local"
              className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={unlockAt}
              onChange={(e) => setUnlockAt(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">
            Memo (optional – visible on chain)
          </label>
          <input
            type="text"
            placeholder="e.g. Team vesting 6 months, Liquidity lock 1 year"
            className="w-full bg-[#101528] border border-slate-700 rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
          />
        </div>

        <button
          type="button"
          onClick={handleCreateLock}
          disabled={txLoading || !isConnectedSafe || !LOCKER_ADDRESS}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {txLoading ? "Creating lock..." : "Create lock"}
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
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs text-slate-400">
                    Lock ID:{" "}
                    <span className="font-mono text-slate-100">
                      {lock.lockId.toString()}
                    </span>
                  </div>
                  <span
                    className={`
                      text-[0.65rem] px-2 py-0.5 rounded-full border
                      ${
                        lock.status === "Ready to withdraw"
                          ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-300"
                          : lock.status === "Claimed"
                          ? "border-slate-700 bg-slate-800 text-slate-300"
                          : "border-blue-500/60 bg-blue-500/10 text-blue-300"
                      }
                    `}
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
                  <span className="font-mono text-slate-200">
                    {lock.startDate}
                  </span>
                </div>

                <div className="text-xs text-slate-400">
                  Unlock:{" "}
                  <span className="font-mono text-slate-200">
                    {lock.unlockDate}
                  </span>
                </div>

                {lock.memo && (
                  <div className="text-[0.7rem] text-slate-400">
                    Memo: <span className="text-slate-200">{lock.memo}</span>
                  </div>
                )}

                {lock.isUnlockable && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleWithdraw(lock.lockId)}
                      disabled={txLoading}
                      className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-3 py-1.5 text-[0.75rem] font-semibold hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {txLoading ? "Withdrawing..." : "Withdraw"}
                    </button>
                  </div>
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
