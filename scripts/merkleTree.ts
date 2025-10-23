import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

// Hàm tạo hash từ address và amount
function hashToken(address: string, amount: string): Buffer {
  const hashHex = ethers.solidityPackedKeccak256(["address", "uint256"], [address, amount]);
  return Buffer.from(hashHex.slice(2), "hex");
}

export function generateMerkleTree() {
  // Read whitelist from JSON file
  const whitelistPath = path.join(__dirname, "./Merkle/whitelist.json");
  const whitelist = JSON.parse(fs.readFileSync(whitelistPath, "utf8"));

  // Tạo danh sách các leaf nodes
  const leaves = whitelist.map((entry: { address: string; amount: string }) =>
    hashToken(entry.address, entry.amount)
  );

  // Tạo Merkle Tree
  const tree = new MerkleTree(leaves, keccak256, {
    sortPairs: true,
    hashLeaves: false
  });

  return { tree, whitelist, hashToken };
}
