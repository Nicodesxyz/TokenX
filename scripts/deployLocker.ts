import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying MultiTokenLocker with:", deployer.address);
  console.log(
    "Balance:",
    ethers.formatEther(
      await ethers.provider.getBalance(deployer.address)
    ),
    "ETH"
  );

  const Locker = await ethers.getContractFactory("MultiTokenLocker");
  const locker = await Locker.deploy(deployer.address);

  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();

  console.log("MultiTokenLocker deployed to:", lockerAddress);
}

main().catch((err: Error) => {
  console.error(err);
  process.exit(1);
});
