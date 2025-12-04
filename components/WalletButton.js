"use client";

import React, { useEffect } from "react";
import { useConnect, useConnection, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export default function ConnectButton() {
  const connect = useConnect();
  const { disconnect } = useDisconnect();
  const { address, chainId, status, connector } = useConnection();

  const SUPPORTED_CHAIN_ID = 11155111; // Sepolia
  const chainName =
    chainId === SUPPORTED_CHAIN_ID
      ? "Sepolia"
      : chainId
      ? "Non-supported network"
      : "";

  const isWrongChain =
    chainId !== undefined && chainId !== null && chainId !== SUPPORTED_CHAIN_ID;

  const shortAddress = (addr) =>
    addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : "";

  useEffect(() => {
    console.log("🔄 [ConnectButton] State updated");
    console.log("   status:", status);
    console.log("   address:", address);
    console.log("   chainId:", chainId, `(${chainName})`);
    console.log("   connector:", connector);
    console.log("   isWrongChain:", isWrongChain);
  }, [status, address, chainId, chainName, connector, isWrongChain]);

  const handleConnect = () => {
    console.log("🟢 [Connect] Attempting injected() connect…");
    connect.mutate(
      { connector: injected() },
      {
        onSuccess(data) {
          console.log("✅ [Connect] Success:", data);
        },
        onError(error) {
          console.error("❌ [Connect] Error:", error);
        },
      }
    );
  };

  const handleDisconnect = () => {
    console.log("🔌 [Disconnect] User disconnected");
    disconnect();
  };

  if (!address || status !== "connected") {
    return (
      <button
        className="connect-btn"
        onClick={handleConnect}
        disabled={connect.status === "pending"}
      >
        {connect.status === "pending" ? "Connecting..." : "Connect Wallet"}
      </button>
    );
  }

  if (isWrongChain) {
    return (
      <div className="connect-btn connected wrong-network">
        <span>{shortAddress(address)}</span>
        <small style={{ color: "#ff4d4d", fontSize: "0.75rem" }}>
          {chainName}
        </small>

        <button className="disconnect" onClick={handleDisconnect}>
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="connect-btn connected">
      <span>
        {shortAddress(address)}
        <small style={{ opacity: 0.6, marginLeft: 6 }}>{chainName}</small>
      </span>

      <button className="disconnect" onClick={handleDisconnect}>
        ✕
      </button>
    </div>
  );
}
