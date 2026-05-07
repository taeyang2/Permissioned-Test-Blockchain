import { network } from "hardhat";
import { keccak256, toHex } from "viem";


// Deployed on besu_local (chainId 1337)
const CONTENT_REGISTRY_ADDR = "0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517" as const;

async function main() {

  const { viem } = await network.create("besu_local");

  const publicClient = await viem.getPublicClient();
  const [walletClient] = await viem.getWalletClients();

  console.log("Wallet :", walletClient.account.address);
  console.log("Block  :", (await publicClient.getBlockNumber()).toString());

  const contentRegistry = await viem.getContractAt(
    "ContentRegistry",
    CONTENT_REGISTRY_ADDR,
    { client: { wallet: walletClient } },
  );

  const testId = Date.now().toString();
  const contentHash = keccak256(toHex(`content-${testId}`));
  const manifestHash = keccak256(toHex(`manifest-${testId}`));
  const ipfsCid = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";
  const signerIdentifier = "DigiCAP/test-signer-v1";

  console.log("\n─── registerContent() ───────────────────────────────");
  console.log("contentHash     :", contentHash);
  console.log("manifestHash    :", manifestHash);
  console.log("ipfsCid         :", ipfsCid);
  console.log("signerIdentifier:", signerIdentifier);

  const txHash = await contentRegistry.write.registerContent([
    contentHash,
    manifestHash,
    ipfsCid,
    signerIdentifier,
  ]);
  console.log("\nTx submitted :", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Mined at block:", receipt.blockNumber.toString(), "| status:", receipt.status);

  // Parse ContentRegistered event
  const logs = await publicClient.getContractEvents({
    address: contentRegistry.address,
    abi: contentRegistry.abi,
    eventName: "ContentRegistered",
    fromBlock: receipt.blockNumber,
    toBlock: receipt.blockNumber,
  });

  console.log("\n─── ContentRegistered event ─────────────────────────");
  const ev = logs[0]?.args;
  if (ev) {
    console.log("contentHash     :", ev.contentHash);
    console.log("manifestHash    :", ev.manifestHash);
    console.log("ipfsCid         :", ev.ipfsCid);
    console.log("signerIdentifier:", ev.signerIdentifier);
    console.log("registrar       :", ev.registrar);
    console.log("timestamp       :", ev.timestamp?.toString());
  } else {
    console.log("(event not found — check tx)");
  }

  // Verify via read calls
  const isReg = await contentRegistry.read.isRegistered([contentHash]);
  const record = await contentRegistry.read.getLatestRecord([contentHash]);

  console.log("\n─── Verification ────────────────────────────────────");
  console.log("isRegistered    :", isReg);
  console.log("manifestHash    :", record.manifestHash);
  console.log("ipfsCid         :", record.ipfsCid);
  console.log("signerIdentifier:", record.signerIdentifier);
  console.log("registrar       :", record.registrar);
  console.log("timestamp       :", record.timestamp.toString());
  console.log("blockNumber     :", record.blockNumber.toString());
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
