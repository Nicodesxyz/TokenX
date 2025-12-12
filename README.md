<p align="center">
<svg width="100%" height="200" viewBox="0 0 1100 200" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#4db8ff"/>
      <stop offset="100%" stop-color="#0070ff"/>
    </linearGradient>

    <filter id="neon">
      <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
      <feMerge>
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

  </defs>

  <!-- Border -->

<rect x="10" y="10" width="1080" height="180" rx="20"
        fill="none" stroke="url(#grad)" stroke-width="4"
        filter="url(#neon)"/>

  <!-- Text -->

<text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle"
        font-size="42" font-weight="700"
        fill="url(#grad)" filter="url(#neon)">
TOKENX — WEB3 LAUNCHPAD
</text>

<text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle"
        font-size="20" fill="#b9d9ff" opacity="0.85">
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
