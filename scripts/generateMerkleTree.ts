import fs from "fs";
import path from "path";
import { generateMerkleTree } from "./merkleTree";

const { tree, whitelist, hashToken } = generateMerkleTree();

// Save root to file
const rootPath = path.join(__dirname, "./Merkle/root.json");
fs.writeFileSync(
  rootPath,
  JSON.stringify(
    {
      root: tree.getHexRoot(),
      timestamp: new Date().toISOString(),
    },
    null,
    2
  )
);

// Generate and save proofs
const proofs: { [key: string]: any } = {};
whitelist.forEach((entry: { address: string; amount: string }) => {
  const leaf = hashToken(entry.address, entry.amount);
  proofs[entry.address] = {
    address: entry.address,
    amount: entry.amount,
    proof: tree.getHexProof(leaf),
  };
});

const proofsPath = path.join(__dirname, "./Merkle/proof.json");
fs.writeFileSync(proofsPath, JSON.stringify(proofs, null, 2));

console.log("Merkle root:", tree.getHexRoot());
console.log("Files generated:");
console.log("- Merkle root:", rootPath);
console.log("- Merkle proofs:", proofsPath);
