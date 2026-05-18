import { createHash } from "crypto";
import { network } from "hardhat";

const CONTENT_REGISTRY_ADDR = "0x9B8397f1B0FEcD3a1a40CdD5E8221Fa461898517" as const;
const IPFS_API_URL = "http://localhost:5001/api/v0/add";
const CONTENT_DATA = "Hello, Content Lineage!";
const SIGNER_IDENTIFIER = "DigiCAP/1.0";

type Bytes32Hex = `0x${string}`;

function sha256Hex(input: string): Bytes32Hex {
  return `0x${createHash("sha256").update(input).digest("hex")}`;
}

async function uploadManifestToIpfs(
  manifestJson: string,
): Promise<string> {
  const formData = new FormData();
  const manifestBlob = new Blob([manifestJson], { type: "application/json" });

  formData.append("file", manifestBlob, "sample-c2pa-manifest.json");

  const response = await fetch(IPFS_API_URL, {
    method: "POST",
    body: formData,
  });

  const responseText = await response.text();

  if (!response.ok) {
    throw new Error(`IPFS upload failed (${response.status}): ${responseText}`);
  }

  let parsed: { Name?: string; Hash?: string; Size?: string };
  try {
    parsed = JSON.parse(responseText) as { Name?: string; Hash?: string; Size?: string };
  } catch (error) {
    throw new Error(
      `Failed to parse IPFS response: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }

  if (!parsed.Hash) {
    throw new Error(`IPFS response did not include a CID: ${responseText}`);
  }

  return parsed.Hash;
}

async function main() {
  const { viem } = await network.create("besu_local");
  const publicClient = await viem.getPublicClient();
  const walletClients = await viem.getWalletClients();

  if (walletClients.length < 2) {
    throw new Error("Expected walletClients[1] to be available for the registrar account");
  }

  const registrarClient = walletClients[1];
  const contentHash = sha256Hex(CONTENT_DATA);

  const manifest = {
    claim_generator: "DigiCAP/1.0",
    title: "sample_image.jpg",
    assertions: [
      {
        label: "c2pa.hash.data",
        data: {
          alg: "sha256",
          hash: contentHash,
        },
      },
    ],
    ingredients: [],
  };

  const manifestJson = JSON.stringify(manifest, null, 2);
  const manifestHash = sha256Hex(manifestJson);
  const ipfsCid = await uploadManifestToIpfs(manifestJson);

  const contentRegistry = await viem.getContractAt(
    "ContentRegistry",
    CONTENT_REGISTRY_ADDR,
    { client: { wallet: registrarClient } },
  );

  const txHash = await contentRegistry.write.registerContent([
    contentHash,
    manifestHash,
    ipfsCid,
    SIGNER_IDENTIFIER,
  ]);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

  console.log(`Content     : ${CONTENT_DATA}`);
  console.log(`contentHash : ${contentHash}`);
  console.log(`manifestHash: ${manifestHash}`);
  console.log(`IPFS CID    : ${ipfsCid}`);
  console.log(`Tx hash     : ${txHash}`);
  console.log(`Mined block : ${receipt.blockNumber.toString()}`);
  console.log(`Status      : ${receipt.status}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
