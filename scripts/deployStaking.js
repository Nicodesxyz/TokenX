const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MultiTokenStaking with:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    )
  );

  const Staking = await hre.ethers.getContractFactory("MultiTokenStaking");

  const staking = await Staking.deploy(deployer.address);

  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();

  console.log("MultiTokenStaking deployed to:", stakingAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
