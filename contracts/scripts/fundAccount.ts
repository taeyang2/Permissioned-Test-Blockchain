import { network } from "hardhat";
import { parseEther } from "viem";

// Recipient: Registrar EOA (0 ETH balance)
const TO = "0x26D21040Cd8eaDd4dd3e749c521E6435941a7fcD" as const;
const AMOUNT = parseEther("100");

async function main() {
  const { viem } = await network.create("besu_local");

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  // accounts[0] = BESU_DEPLOYER_KEY (Admin EOA, has genesis ETH)
  const adminClient = walletClients[0];

  const before = await publicClient.getBalance({ address: TO });
  console.log("Recipient balance before:", before.toString(), "wei");

  const txHash = await adminClient.sendTransaction({ to: TO, value: AMOUNT });
  console.log("Tx submitted :", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Mined at block:", receipt.blockNumber.toString(), "| status:", receipt.status);

  const after = await publicClient.getBalance({ address: TO });
  console.log("Recipient balance after :", after.toString(), "wei");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
