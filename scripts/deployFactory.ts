import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();

  console.log("Deploying contracts with:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  const Factory = await ethers.getContractFactory("TokenFactory");
  const factory = await Factory.deploy();

  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("TokenFactory deployed to:", address);
}

main().catch((error: Error) => {
  console.error(error);
  process.exitCode = 1;
});
