const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deploys ProductAuthentication.sol to whichever network is passed via
 * --network (localhost or sepolia), then saves the contract address + ABI
 * to a JSON file so the backend and frontend can pick it up without any
 * manual copy-pasting.
 */
async function main() {
  const network = hre.network.name;

  console.log(`\n🚀 Deploying ProductAuthentication to "${network}"...\n`);

  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  if (balance === 0n && network !== "hardhat") {
    console.warn(
      "\n⚠️  WARNING: Deployer balance is 0. If this is Sepolia, get test ETH from a faucet first.\n"
    );
  }

  const ProductAuthentication = await hre.ethers.getContractFactory("ProductAuthentication");
  const contract = await ProductAuthentication.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log("\n✅ ProductAuthentication deployed to:", contractAddress);

  // Grab the ABI straight from the compiled artifact.
  const artifact = await hre.artifacts.readArtifact("ProductAuthentication");

  const deploymentInfo = {
    network,
    contractAddress,
    deployerAddress: deployer.address,
    deployedAt: new Date().toISOString(),
    abi: artifact.abi,
  };

  // Save into blockchain/deployments/<network>.json
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }
  const outputPath = path.join(deploymentsDir, `${network}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${outputPath}`);

  console.log(
    "\nNext steps:\n" +
      "  1. Copy this contract address into backend/.env as CONTRACT_ADDRESS\n" +
      "  2. Copy this contract address into frontend/.env as VITE_CONTRACT_ADDRESS\n" +
      "  3. The ABI in deployments/" +
      network +
      ".json will be imported by both backend and frontend (Phase 6)\n"
  );

  if (network === "sepolia") {
    console.log(
      `🔍 View on Etherscan: https://sepolia.etherscan.io/address/${contractAddress}\n`
    );
  }
}

main().catch((error) => {
  console.error("\n❌ Deployment failed:\n", error);
  process.exitCode = 1;
});
