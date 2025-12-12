<p align="center">
  <svg width="100%" height="200" viewBox="0 0 1100 200" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="tokenxGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#4DB8FF" />
        <stop offset="100%" stop-color="#0070FF" />
      </linearGradient>

      <filter id="tokenxNeon">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Dark background -->
    <rect x="0" y="0" width="1100" height="200" fill="#050816" />

    <!-- Neon border -->
    <rect
      x="15"
      y="15"
      width="1070"
      height="170"
      rx="24"
      fill="none"
      stroke="url(#tokenxGrad)"
      stroke-width="3"
      filter="url(#tokenxNeon)"
    />

    <!-- Main title -->
    <text
      x="50%"
      y="52%"
      text-anchor="middle"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      font-size="34"
      font-weight="700"
      fill="url(#tokenxGrad)"
      filter="url(#tokenxNeon)"
    >
      TOKENX • WEB3 LAUNCHPAD
    </text>

    <!-- Subtitle -->
    <text
      x="50%"
      y="73%"
      text-anchor="middle"
      font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
      font-size="18"
      fill="#B9D9FF"
      opacity="0.9"
    >
      No-code Token Creation · Staking · Locking
    </text>

  </svg>
</p>

## Stack

Next.js • Hardhat • Wagmi

## Public Sepolia contract deployed

Factory: 0x262977b065471D3CC0425519A686435eb7fE2072<br/>
Staking: 0xD98fF66c2199f5BE2abbe9FF9Db747Ef01c2B5c9<br/>
Locker: 0xA945adbd9d3fC36187237Ba11A678c30824Fb5b7<br/>

## How to get started

Step 1: Clone the repository<br/>
Step 2: Run npm install<br/>
Step 3: Fill the .env.example (rename it .env)<br/>

Your local version using public contract should be up and running 🔥
