import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, keccak256, toHex } from "viem";

describe("ContentRegistry", async function () {
  const { viem } = await network.create();

  type ContentRecord = {
    manifestHash: `0x${string}`;
    ipfsCid: string;
    signerIdentifier: string;
    registrar: `0x${string}`;
    timestamp: bigint;
    blockNumber: bigint;
  };

  async function deployFixture() {
    const [admin, registrar, unauthorized] = await viem.getWalletClients();

    const acl = await viem.deployContract("ContentAccessControl", [admin.account.address]);
    const registrarRegistry = await viem.deployContract("RegistrarRegistry", [acl.address]);
    const adminRole = await acl.read.ADMIN_ROLE();
    await acl.write.grantRole([adminRole, registrarRegistry.address]);

    const contentRegistry = await viem.deployContract("ContentRegistry", [
      acl.address,
      registrarRegistry.address,
    ]);

    const registrarRegistryAsAdmin = await viem.getContractAt(
      "RegistrarRegistry",
      registrarRegistry.address,
      { client: { wallet: admin } },
    );

    const contentRegistryAsRegistrar = await viem.getContractAt(
      "ContentRegistry",
      contentRegistry.address,
      { client: { wallet: registrar } },
    );

    const contentRegistryAsUnauthorized = await viem.getContractAt(
      "ContentRegistry",
      contentRegistry.address,
      { client: { wallet: unauthorized } },
    );

    await registrarRegistryAsAdmin.write.addRegistrar([registrar.account.address, "DigiCAP"]);

    return {
      admin,
      registrar,
      unauthorized,
      acl,
      registrarRegistry,
      contentRegistry,
      contentRegistryAsRegistrar,
      contentRegistryAsUnauthorized,
    };
  }

  function makeHash(value: string): `0x${string}` {
    return keccak256(toHex(value));
  }

  function isPositiveBigInt(value: unknown): boolean {
    return typeof value === "bigint" && value > 0n;
  }

  it("TC-SC-01: Unauthorized account calling registerContent() should revert with Not a registrar", async function () {
    const { contentRegistryAsUnauthorized } = await deployFixture();

    await viem.assertions.revertWith(
      contentRegistryAsUnauthorized.write.registerContent([
        makeHash("tc-sc-01-content"),
        makeHash("tc-sc-01-manifest"),
        "ipfs://tc-sc-01",
        "signer-01",
      ]),
      "Not a registrar",
    );
  });

  it("TC-SC-02: Authorized registrar calling registerContent() should succeed and emit ContentRegistered event", async function () {
    const { contentRegistry, contentRegistryAsRegistrar, registrar } = await deployFixture();

    const contentHash = makeHash("tc-sc-02-content");
    const manifestHash = makeHash("tc-sc-02-manifest");
    const ipfsCid = "bafybeigdigicapsc02";
    const signerIdentifier = "signer-02";

    await viem.assertions.emitWithArgs(
      contentRegistryAsRegistrar.write.registerContent([
        contentHash,
        manifestHash,
        ipfsCid,
        signerIdentifier,
      ]),
      contentRegistry,
      "ContentRegistered",
      [
        contentHash,
        manifestHash,
        ipfsCid,
        signerIdentifier,
        getAddress(registrar.account.address),
        isPositiveBigInt,
      ],
    );
  });

  it("TC-SC-03: isRegistered(contentHash) after registration should return true", async function () {
    const { contentRegistry, contentRegistryAsRegistrar } = await deployFixture();

    const contentHash = makeHash("tc-sc-03-content");
    await contentRegistryAsRegistrar.write.registerContent([
      contentHash,
      makeHash("tc-sc-03-manifest"),
      "bafybeigdigicapsc03",
      "signer-03",
    ]);

    assert.equal(await contentRegistry.read.isRegistered([contentHash]), true);
  });

  it("TC-SC-04: getLatestRecord(contentHash) should return the registered record matching input values", async function () {
    const { contentRegistry, contentRegistryAsRegistrar, registrar } = await deployFixture();

    const contentHash = makeHash("tc-sc-04-content");
    const manifestHash = makeHash("tc-sc-04-manifest");
    const ipfsCid = "bafybeigdigicapsc04";
    const signerIdentifier = "signer-04";

    await contentRegistryAsRegistrar.write.registerContent([
      contentHash,
      manifestHash,
      ipfsCid,
      signerIdentifier,
    ]);

    const latestRecord = (await contentRegistry.read.getLatestRecord([
      contentHash,
    ])) as ContentRecord;

    assert.equal(latestRecord.manifestHash, manifestHash);
    assert.equal(latestRecord.ipfsCid, ipfsCid);
    assert.equal(latestRecord.signerIdentifier, signerIdentifier);
    assert.equal(latestRecord.registrar, getAddress(registrar.account.address));
    assert.ok(latestRecord.timestamp > 0n);
    assert.ok(latestRecord.blockNumber > 0n);
  });

  it("TC-SC-05: Re-registering same contentHash should append and getAllRecords() should return 2 items", async function () {
    const { contentRegistry, contentRegistryAsRegistrar } = await deployFixture();

    const contentHash = makeHash("tc-sc-05-content");
    const firstManifestHash = makeHash("tc-sc-05-manifest-1");
    const secondManifestHash = makeHash("tc-sc-05-manifest-2");

    await contentRegistryAsRegistrar.write.registerContent([
      contentHash,
      firstManifestHash,
      "bafybeigdigicapsc05v1",
      "signer-05-v1",
    ]);

    await contentRegistryAsRegistrar.write.registerContent([
      contentHash,
      secondManifestHash,
      "bafybeigdigicapsc05v2",
      "signer-05-v2",
    ]);

    const records = (await contentRegistry.read.getAllRecords([
      contentHash,
    ])) as ContentRecord[];

    assert.equal(records.length, 2);
    assert.equal(records[0].manifestHash, firstManifestHash);
    assert.equal(records[1].manifestHash, secondManifestHash);
  });

  it("TC-SC-06: isRegistered for unregistered contentHash should return false", async function () {
    const { contentRegistry } = await deployFixture();

    assert.equal(
      await contentRegistry.read.isRegistered([makeHash("tc-sc-06-unregistered")]),
      false,
    );
  });
});
