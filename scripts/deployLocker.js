const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  console.log("Deploying MultiTokenLocker with:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(
      await hre.ethers.provider.getBalance(deployer.address)
    ),
    "ETH"
  );

  const Locker = await hre.ethers.getContractFactory("MultiTokenLocker");
  const locker = await Locker.deploy(deployer.address); // initial owner

  await locker.waitForDeployment();
  const lockerAddress = await locker.getAddress();

  console.log("MultiTokenLocker deployed to:", lockerAddress);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
