import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

// Read whitelist from JSON file
const whitelistPath = path.join(__dirname, "../Merkle/whitelist.json");
const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));

// Hàm tạo hash từ address và amount
function hashToken(address: string, amount: string) {
  const hashHex = ethers.solidityPackedKeccak256(["address", "uint256"], [address, amount]);
  return Buffer.from(hashHex.slice(2), "hex");
}

// Tạo danh sách các leaf nodes
const leaves = whitelist.map((entry: { address: string; amount: string }) =>
  hashToken(entry.address, entry.amount)
);

// Tạo Merkle Tree
const tree = new MerkleTree(leaves, keccak256, {
  sortPairs: true,
  hashLeaves: false
});

// Save root to file
const rootPath = path.join(__dirname, "../Merkle/root.json");
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

const proofsPath = path.join(__dirname, "../Merkle/proof.json");
fs.writeFileSync(proofsPath, JSON.stringify(proofs, null, 2));

console.log("Merkle root:", tree.getHexRoot());
console.log("Files generated:");
console.log("- Merkle root:", rootPath);
console.log("- Merkle proofs:", proofsPath);
