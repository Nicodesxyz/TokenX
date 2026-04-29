import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MultiTokenStaking with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    )
  );

  const Staking = await ethers.getContractFactory("MultiTokenStaking");
  const staking = await Staking.deploy(deployer.address);

  await staking.waitForDeployment();
  const stakingAddress = await staking.getAddress();

  console.log("MultiTokenStaking deployed to:", stakingAddress);
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
