"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "wagmi/connectors";
import React from "react";

const queryClient = new QueryClient();

const config = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [
    injected({
      target: "metaMask",
    }),
  ],
});

export default function Providers({ children }) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
