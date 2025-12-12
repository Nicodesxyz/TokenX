<!-- Banner -->
<p align="center">
  <img src="https://dummyimage.com/1100x260/0b0f1a/4ab0ff&text=TOKENX:+Build.+Launch.+Scale." width="100%"/>
</p>

<h1 align="left">⚡ TokenX Web3 Launchpad</h1>

<p align="left">
  <b>ERC-20 generator + staking + token locking + dashboard</b><br/>
  Create production-ready contracts deployed instantly to Sepolia/Mainnet.
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

## Deploy your own Contract Address

Step 1: Compile

```bash
npx hardhat compile

```

Step 2: Deploy

Factory

```bash
npx hardhat run scripts/deployFactory.js --network sepolia
```

Stacking

```bash
npx hardhat run scripts/deployStaking.js --network sepolia
```

Locker

```bash
npx hardhat run scripts/deployLocker.js --network sepolia
```

## Built by Nicodes.xyz
