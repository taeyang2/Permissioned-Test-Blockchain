import { network } from "hardhat";
import { parseEther } from "viem";

const ACL_ADDR = "0xa50a51c09a5c451C52BB714527E1974b686D8e77" as const;

const OLD_ADMIN = "0xfe3b557e8fb62b89f4916b721be55ceb828dbd73" as const;
const NEW_ADMIN = "0xEDf12B3ec45Eeb205D2b35267e65e987635aE4cF" as const;

async function main() {
  const { viem } = await network.create("besu_local");

  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  // accounts[0] = BESU_DEPLOYER_KEY (구 Admin EOA)
  const oldAdminClient = walletClients[0];
  console.log("Old Admin EOA :", oldAdminClient.account.address);
  console.log("New Admin EOA :", NEW_ADMIN);
  console.log("Block         :", (await publicClient.getBlockNumber()).toString());

  const acl = await viem.getContractAt("ContentAccessControl", ACL_ADDR, {
    client: { wallet: oldAdminClient },
  });

  const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000" as const;
  const ADMIN_ROLE = await acl.read.ADMIN_ROLE();

  // 1. Fund new Admin EOA for gas
  console.log("\n─── Step 1: Fund new Admin EOA ─────────────────────");
  const fundTx = await oldAdminClient.sendTransaction({
    to: NEW_ADMIN,
    value: parseEther("100"),
  });
  await publicClient.waitForTransactionReceipt({ hash: fundTx });
  console.log("Funded 100 ETH ✓");

  // 2. Grant DEFAULT_ADMIN_ROLE to new Admin EOA
  console.log("\n─── Step 2: Grant DEFAULT_ADMIN_ROLE ────────────────");
  const grantDefaultTx = await acl.write.grantRole([DEFAULT_ADMIN_ROLE, NEW_ADMIN]);
  await publicClient.waitForTransactionReceipt({ hash: grantDefaultTx });
  console.log("DEFAULT_ADMIN_ROLE granted ✓");

  // 3. Grant ADMIN_ROLE to new Admin EOA
  console.log("\n─── Step 3: Grant ADMIN_ROLE ────────────────────────");
  const grantAdminTx = await acl.write.grantRole([ADMIN_ROLE, NEW_ADMIN]);
  await publicClient.waitForTransactionReceipt({ hash: grantAdminTx });
  console.log("ADMIN_ROLE granted ✓");

  // 4. Revoke ADMIN_ROLE from old Admin EOA
  console.log("\n─── Step 4: Revoke ADMIN_ROLE from old EOA ─────────");
  const revokeAdminTx = await acl.write.revokeRole([ADMIN_ROLE, OLD_ADMIN]);
  await publicClient.waitForTransactionReceipt({ hash: revokeAdminTx });
  console.log("ADMIN_ROLE revoked from old EOA ✓");

  // 5. Revoke DEFAULT_ADMIN_ROLE from old Admin EOA
  //    Must be called by old EOA itself (renounceRole) or by new Admin
  console.log("\n─── Step 5: Renounce DEFAULT_ADMIN_ROLE from old EOA ");
  const renounceDefaultTx = await acl.write.renounceRole([DEFAULT_ADMIN_ROLE, OLD_ADMIN]);
  await publicClient.waitForTransactionReceipt({ hash: renounceDefaultTx });
  console.log("DEFAULT_ADMIN_ROLE renounced ✓");

  // Verify
  console.log("\n─── Verification ────────────────────────────────────");
  const newHasDefault = await acl.read.hasRole([DEFAULT_ADMIN_ROLE, NEW_ADMIN]);
  const newHasAdmin   = await acl.read.hasRole([ADMIN_ROLE, NEW_ADMIN]);
  const oldHasDefault = await acl.read.hasRole([DEFAULT_ADMIN_ROLE, OLD_ADMIN]);
  const oldHasAdmin   = await acl.read.hasRole([ADMIN_ROLE, OLD_ADMIN]);

  console.log("New Admin — DEFAULT_ADMIN_ROLE:", newHasDefault);
  console.log("New Admin — ADMIN_ROLE        :", newHasAdmin);
  console.log("Old Admin — DEFAULT_ADMIN_ROLE:", oldHasDefault, "(should be false)");
  console.log("Old Admin — ADMIN_ROLE        :", oldHasAdmin,   "(should be false)");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
