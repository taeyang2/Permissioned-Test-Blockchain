import { network } from "hardhat";

// Deployed on besu_local (chainId 1337)
const REGISTRAR_REGISTRY_ADDR = "0x9a3DBCa554e9f6b9257aAa24010DA8377C57c17e" as const;

// New Registrar EOA (generated in Phase 2)
const REGISTRAR_ADDR = "0x26D21040Cd8eaDd4dd3e749c521E6435941a7fcD" as const;
const REGISTRAR_NAME = "DigiCAP";

async function main() {
  const { viem } = await network.create("besu_local");

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  // accounts[0] = BESU_DEPLOYER_KEY (Admin EOA)
  const adminClient = walletClients[0];
  console.log("Admin EOA :", adminClient.account.address);
  console.log("Block     :", (await publicClient.getBlockNumber()).toString());

  const registrarRegistry = await viem.getContractAt(
    "RegistrarRegistry",
    REGISTRAR_REGISTRY_ADDR,
    { client: { wallet: adminClient } },
  );

  // Check if already registered
  const existing = await registrarRegistry.read.registrars([REGISTRAR_ADDR]);
  if (existing[1]) {
    console.log(`\n[SKIP] ${REGISTRAR_ADDR} is already an active registrar (${existing[0]})`);
    return;
  }

  console.log(`\n─── addRegistrar() ───────────────────────────────`);
  console.log("address :", REGISTRAR_ADDR);
  console.log("name    :", REGISTRAR_NAME);

  const txHash = await registrarRegistry.write.addRegistrar([REGISTRAR_ADDR, REGISTRAR_NAME]);
  console.log("\nTx submitted :", txHash);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
  console.log("Mined at block:", receipt.blockNumber.toString(), "| status:", receipt.status);

  // Verify
  const registered = await registrarRegistry.read.registrars([REGISTRAR_ADDR]);
  console.log("\n─── Verification ────────────────────────────────");
  console.log("name     :", registered[0]);
  console.log("isActive :", registered[1]);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
