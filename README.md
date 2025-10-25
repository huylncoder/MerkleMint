# MerkleMint - Upgradeable Merkle Airdrop System

[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-FFDB1C.svg)](https://hardhat.org/)
[![Solidity](https://img.shields.io/badge/Solidity-^0.8.28-blue.svg)](https://soliditylang.org/)
[![OpenZeppelin](https://img.shields.io/badge/OpenZeppelin-Contracts-green.svg)](https://openzeppelin.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Author:** nexm  
**Project Type:** Production-Ready Merkle Airdrop Implementation

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Key Components](#key-components)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Quick Start](#quick-start)
  - [Detailed Workflow](#detailed-workflow)
- [Testing](#testing)
- [Deployed Contracts](#deployed-contracts)
- [Architecture Deep Dive](#architecture-deep-dive)
- [Gas Optimization](#gas-optimization)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)
- [Security Considerations](#security-considerations)
- [Project Structure](#project-structure)
- [Contributing](#contributing)
- [Educational Notes](#educational-notes)
- [License](#license)
- [Acknowledgments](#acknowledgments)
- [Resources & Further Reading](#resources--further-reading)

## Overview

This project demonstrates a sophisticated **upgradeable Merkle Airdrop system** built on Ethereum using the **UUPS (Universal Upgradeable Proxy Standard)** pattern. It serves as a production-ready implementation suitable for real-world token distribution with gas-efficient Merkle proof verification.

### Purpose

- **Production-Ready**: Implements robust security measures, gas optimizations, and upgrade mechanisms suitable for mainnet deployment
- **Gas Efficient**: Uses Merkle trees for scalable airdrop distribution without storing individual whitelist entries
- **Upgradeable**: UUPS proxy pattern allows seamless contract upgrades without changing proxy address

## Key Features

- 🚀 **Merkle Proof-Based Distribution**: Gas-efficient airdrop using Merkle trees
- 🔄 **UUPS Upgradeability**: Seamless contract upgrades without changing proxy address
- 🛡️ **Role-Based Access Control**: Secure upgrade authorization and administrative functions
- ⚡ **Gas Optimized**: Efficient storage and calldata usage
- 🔒 **Double-Claim Prevention**: Built-in protection against duplicate claims
- 📊 **Comprehensive Testing**: Full test coverage with Hardhat framework
- 🛠️ **Developer Tools**: Automated deployment, upgrade, and Merkle tree generation scripts
- 🚨 **Emergency Functions**: Pause/unpause and emergency withdraw capabilities
- 📈 **Statistics Tracking**: Real-time claim statistics and analytics
- 🔧 **Custom Errors**: Gas-efficient error handling with custom error types
- 🌐 **Vietnamese Documentation**: Complete NatSpec documentation in Vietnamese

## Architecture

The system uses a **UUPS Proxy Pattern** where:

- **Proxy Contract**: ERC1967 proxy that delegates calls to implementation
- **Implementation Contract**: Contains the actual business logic (AirDrop.sol)
- **Storage**: All state is stored in the proxy, implementation is stateless
- **Upgrades**: New implementation contracts can be deployed and the proxy updated

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Call     │───▶│   Proxy Contract │───▶│ Implementation  │
│                 │    │   (ERC1967)      │    │   (Logic)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │   Storage        │
                       │   (State)        │
                       └──────────────────┘
```

## Key Components

### Smart Contracts (`contracts/`)

#### `MyMintableToken.sol`

- **Purpose**: ERC20 token with mint/burn role management
- **Features**:
  - Standard ERC20 functionality
  - Role-based minting with `MINTER_ROLE`
  - Access control integration
  - Owner-controlled role assignment

#### `AirDrop.sol`

- **Purpose**: Upgradeable Merkle airdrop implementation
- **Features**:
  - Merkle proof verification
  - Token claiming mechanism
  - Double-claim prevention
  - UUPS upgrade support
  - Role-based access control
  - Emergency pause/unpause functionality
  - Emergency withdraw for stuck tokens
  - Real-time claim statistics
  - Custom error handling for gas efficiency
  - Vietnamese NatSpec documentation

#### `AirDropV2.sol`

- **Purpose**: Enhanced version with advanced features
- **Features**:
  - Multiple Merkle root support
  - Batch claim functionality
  - Enhanced statistics tracking
  - Version management
  - Backward compatibility with V1

### Scripts (`scripts/`)

#### `deploy/deploy.ts`

- **Purpose**: Initial deployment script
- **Deploys**: MyMintableToken, AirDrop implementation, UUPS Proxy
- **Configures**: Merkle root, token distribution, role assignments

#### `merkleTree.ts`

- **Purpose**: Generate Merkle tree utilities
- **Features**: Hash generation, tree construction, proof generation

#### `generateMerkleTree.ts`

- **Purpose**: Generate Merkle proofs and root hash
- **Input**: `whitelist.json` with addresses and amounts
- **Output**: `root.json` and `proof.json` files

#### `airdrop/1_airdrop.ts`

- **Purpose**: Test airdrop flow end-to-end
- **Features**: Claim testing, balance verification, proof validation

### Data Files (`scripts/Merkle/`)

#### `whitelist.json`

- **Purpose**: Contains whitelist addresses and token amounts
- **Format**: Array of objects with `address` and `amount` fields

#### `root.json`

- **Purpose**: Stores Merkle root hash
- **Usage**: Deployed to contract during initialization

#### `proof.json`

- **Purpose**: Contains Merkle proofs for each whitelisted address
- **Usage**: Users need these proofs to claim tokens

## Prerequisites

- **Node.js**: Version 16 or higher
- **Yarn**: Package manager
- **Git**: For version control
- **RPC Endpoint**: Alchemy/Infura for testnet/mainnet deployment
- **Private Key**: For deployment and testing (use testnet keys only)

### Node.js Installation

```bash
# Install Node.js (if not already installed)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
nvm use 18

# Install Yarn
npm install -g yarn
```

## Installation

### Quick Start

```bash
git clone <repository-url>
cd MerkleMint
yarn install
yarn compile
```

### Verify Installation

```bash
yarn hardhat --version
yarn test
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# RPC Endpoints
SEPOLIA_RPC_URL=https://eth-sepolia.public.blastapi.io
MAINNET_RPC_URL=https://eth-mainnet.public.blastapi.io

# Private Keys (use testnet keys only)
TESTNET_PRIVATE_KEY=your_testnet_private_key_here
MAINNET_PRIVATE_KEY=your_mainnet_private_key_here

# Optional: Etherscan API for verification
ETHERSCAN_API_KEY=your_etherscan_api_key
```

### Hardhat Configuration

The `hardhat.config.ts` includes:

```typescript
networks: {
  "sepolia": {
    url: "https://eth-sepolia.public.blastapi.io",
    chainId: 11155111,
    accounts: [testnetPrivateKey],
    timeout: 40000,
  },
  "ethereum": {
    url: "https://eth-mainnet.public.blastapi.io",
    chainId: 1,
    accounts: [mainnetPrivateKey],
    timeout: 60000,
  }
}
```

## Usage

### Quick Start

```bash
# Compile contracts
yarn compile

# Run tests
yarn test

# Deploy to local network
yarn hardhat node
# In another terminal:
yarn hardhat run deploy/deploy.ts --network localhost
```

### Detailed Workflow

#### Step 1: Generate Merkle Tree

```bash
# Generate Merkle tree from whitelist
yarn hardhat run scripts/generateMerkleTree.ts
```

**Whitelist Structure** (`scripts/Merkle/whitelist.json`):

```json
[
  { "address": "0x8fF1580fcD7022dD5F26cbccE6d586aF655Dd0BA", "amount": "1000" },
  { "address": "0x1bB2fC040616C2e6bB7D9c7dc137069860a555bB", "amount": "1200" }
]
```

**Generated Files**:

- `root.json`: Merkle root hash
- `proof.json`: Merkle proofs for each address

#### Step 2: Deploy Contracts

```bash
# Deploy to Sepolia testnet
yarn hardhat run deploy/deploy.ts --network sepolia
```

**What Gets Deployed:**

1. **MyMintableToken**: ERC20 token contract
2. **AirDrop Implementation**: Logic contract
3. **UUPS Proxy**: Points to implementation, stores state
4. **Role Assignment**: MINTER_ROLE granted to AirDrop contract

#### Step 3: Users Claim Tokens

Users interact with the `claim(uint256 amount, bytes32[] calldata proof)` function:

```typescript
// Using ethers.js (example)
const airDrop = await ethers.getContractAt("AirDrop", PROXY_ADDRESS);
const proof = JSON.parse(fs.readFileSync("proof.json"))[userAddress].proof;

await airDrop.claim(amount, proof);
```

#### Step 4: Test Airdrop Flow

```bash
# Test the complete airdrop flow
yarn hardhat run scripts/airdrop/1_airdrop.ts --network sepolia
```

## Testing

### Running Tests

```bash
# Run all tests
yarn test

# Run with gas reporting
yarn hardhat test --gas-report

# Run specific test
yarn hardhat test --grep "should claim tokens"
```

### Test Descriptions

#### `AirDrop.test.ts` (Comprehensive Tests)

**Core Functionality Tests:**

- **Claim Validation**: Legitimate users can claim tokens
- **Access Control**: Non-whitelisted addresses are rejected
- **Double-Claim Prevention**: Users cannot claim twice
- **Merkle Proof Verification**: Invalid proofs are rejected
- **Emergency Functions**: Pause/unpause and emergency withdraw
- **Statistics Tracking**: Real-time claim analytics
- **Edge Cases**: Multiple users, invalid inputs, boundary conditions

#### `AirDrop.simple.test.ts` (Quick Tests)

**Basic Functionality Tests:**

- **Contract Initialization**: Proper setup and configuration
- **Basic Claiming**: Core claim functionality
- **Access Control**: Role-based permissions
- **Gas Optimization**: Efficient gas usage
- **Statistics**: Basic claim tracking

#### `Integration.test.ts` (End-to-End Tests)

**Integration Scenarios:**

- **Complete Airdrop Flow**: Full user journey testing
- **Merkle Root Updates**: Dynamic root management
- **Pause and Resume**: Emergency scenario handling
- **Large Whitelist**: Scalability testing
- **Gas Optimization**: Multi-user gas analysis

### Test Strategy

- **Unit Tests**: Individual contract function testing
- **Integration Tests**: Deployment and upgrade flow testing
- **Merkle Proof Tests**: Verification logic testing
- **Access Control Tests**: Role-based permission testing
- **Edge Cases**: Invalid inputs, boundary conditions

## Deployed Contracts

```
Network: Sepolia Testnet (Chain ID: 11155111)
AirDrop Proxy: [Deployed Address]
MyMintableToken: [Deployed Address]
Merkle Root: 0x08f367931976a91f5f9c53602606b54e58dec72fd089495ea8214cfa83295d5b
```

_Note: Always verify contract addresses before interacting._

## Architecture Deep Dive

### UUPS Proxy Pattern

**Why UUPS over Transparent Proxy:**

- **Gas Efficiency**: Direct calls to implementation (no admin overhead)
- **Upgrade Control**: Implementation contract controls upgrades
- **Security**: Upgrade authorization in implementation logic

**Storage Layout Considerations:**

```solidity
// Storage gap for future upgrades
uint256[50] private __gap;
```

**Authorization Mechanism:**

```solidity
bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyRole(UPGRADER_ROLE)
{}
```

### Merkle Tree Implementation

**Leaf Construction:**

```solidity
bytes32 leaf = keccak256(abi.encodePacked(msg.sender, amount));
```

**Proof Verification Process:**

1. User provides `(amount, merkleProof)`
2. Contract constructs leaf hash from `msg.sender` and `amount`
3. `MerkleProof.verify()` validates proof against stored root
4. If valid, tokens are minted directly to user

### Security Features

- **Double-Claim Prevention**: `mapping(address => bool) public claimed`
- **Role-Based Upgrades**: `UPGRADER_ROLE` authorization
- **Safe Token Minting**: Direct minting to user address
- **Merkle Root Updates**: Admin can update root for new airdrop rounds
- **Emergency Pause**: Contract can be paused/unpaused by authorized roles
- **Emergency Withdraw**: Admin can recover stuck tokens
- **Custom Errors**: Gas-efficient error handling
- **Input Validation**: Comprehensive parameter validation
- **Access Control**: Granular role-based permissions

## Gas Optimization

### Merkle Proofs vs Storage

**Traditional Approach (Inefficient):**

```solidity
mapping(address => uint256) public whitelist;
// Gas cost: ~20,000 per address stored
```

**Merkle Tree Approach (Efficient):**

```solidity
bytes32 public merkleRoot;
// Gas cost: ~5,000 per claim (regardless of whitelist size)
```

**Savings Calculation:**

- 1,000 addresses: 20M gas vs 5M gas (75% savings)
- 10,000 addresses: 200M gas vs 5M gas (97.5% savings)

### Additional Optimizations

- **Calldata Usage**: Proof arrays passed as `calldata` (cheaper than `memory`)
- **Storage Gaps**: `__gap` prevents storage collision during upgrades
- **Direct Minting**: Tokens minted directly to user (no transfer overhead)

## Development Workflow

### Code Quality

```bash
# Format code
yarn prettier --write .

# Check formatting
yarn prettier --check .

# Lint
yarn eslint .
```

### Gas Analysis

```bash
# Generate gas snapshots
yarn hardhat test --gas-report

# Check contract sizes
yarn hardhat size-contracts
```

### Testing Workflow

```bash
# Run specific test with detailed output
yarn hardhat test --grep "should claim tokens" --verbose

# Run tests with gas reporting
yarn hardhat test --gas-report

# Run tests in parallel
yarn hardhat test --parallel
```

### Deployment Workflow

```bash
# Deploy and verify
yarn hardhat run deploy/deploy.ts --network sepolia

# Verify contracts
yarn hardhat verify --network sepolia [CONTRACT_ADDRESS]
```

## Troubleshooting

### Common Issues

**Compilation Errors:**

```bash
# Solution: Clean and recompile
yarn hardhat clean
yarn compile
```

**Deployment Failures:**

```bash
# Check network configuration
# Verify private key is correct
# Ensure sufficient balance for gas
```

**Merkle Proof Verification Fails:**

```bash
# Verify leaf construction matches proof generation
# Check that account and amount match exactly
# Ensure proof array is in correct order
```

**Upgrade Validation Failures:**

```bash
# Verify storage layout compatibility
# Check that new implementation inherits from previous
# Ensure __gap variables are properly sized
```

## Security Considerations

### Audit Recommendations

- **Professional Audit**: Recommended for mainnet deployment
- **Storage Layout**: Verify upgrade compatibility
- **Access Control**: Review role assignments and permissions
- **Merkle Root**: Ensure secure generation and distribution

### Known Limitations

- **Single Token**: Currently supports one token type per airdrop
- **Fixed Amounts**: Token amounts are fixed per address
- **Centralized Control**: Admin controls Merkle root updates

### Upgrade Safety Checklist

- [ ] Storage layout compatibility verified
- [ ] New functions don't conflict with existing
- [ ] Access control properly configured
- [ ] Events properly emitted
- [ ] Gas limits considered for new functions

### Private Key Management

- **Never commit private keys to repository**
- **Use environment variables for sensitive data**
- **Use hardware wallets for production deployments**
- **Rotate keys regularly**

## Project Structure

```
MerkleMint/
├── contracts/                 # Smart contracts
│   ├── AirDrop.sol           # Main airdrop contract (V1)
│   ├── AirDropV2.sol         # Enhanced airdrop contract (V2)
│   └── MyMintableToken.sol   # ERC20 token
├── scripts/                   # Scripts and utilities
│   ├── airdrop/
│   │   └── 1_airdrop.ts      # Airdrop testing
│   ├── Merkle/               # Merkle tree data
│   │   ├── whitelist.json    # Whitelist addresses
│   │   ├── root.json         # Merkle root
│   │   └── proof.json        # Merkle proofs
│   ├── generateMerkleTree.ts # Generate Merkle tree
│   ├── merkleTree.ts         # Merkle utilities
│   └── test-deployment.ts    # Deployment testing
├── deploy/                   # Deployment scripts
│   └── deploy.ts             # Main deployment
├── test/                     # Test suite
│   ├── AirDrop.test.ts       # Comprehensive tests
│   ├── AirDrop.simple.test.ts # Quick tests
│   ├── MyMintableToken.test.ts # Token tests
│   ├── Integration.test.ts    # End-to-end tests
│   └── Upgrade.test.ts        # Upgrade tests
├── deployments/              # Deployment artifacts
├── typechain/                # TypeScript bindings
├── data/                     # ABI exports
├── README.md                 # Project documentation
└── TESTING.md                # Testing guide
```

## Contributing

### Development Guidelines

1. **Code Style**: Follow Solidity style guide
2. **Testing**: Write tests for all new functionality
3. **Documentation**: Update README for new features
4. **Commits**: Use conventional commit messages

### Pull Request Process

1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request with description
5. Address review feedback

## Educational Notes

### Key Learning Objectives Achieved

- **UUPS Upgrade Pattern**: Understanding proxy-based upgrades
- **Merkle Proof Systems**: Efficient cryptographic verification
- **Production Practices**: Testing, deployment, and security
- **Gas Optimization**: Efficient smart contract design

### Project Value

This project demonstrates:

- **Advanced Solidity Patterns**: UUPS, role-based access control
- **Cryptographic Security**: Merkle proof implementation
- **Production Readiness**: Comprehensive testing and documentation
- **Upgrade Mechanisms**: Safe contract evolution

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **OpenZeppelin**: For upgradeable contracts and security standards
- **Hardhat Team**: For the excellent development framework
- **Ethereum Community**: For Merkle proof standards and best practices
- **TypeScript Community**: For robust development tooling

## Resources & Further Reading

### UUPS Documentation

- [OpenZeppelin UUPS Guide](https://docs.openzeppelin.com/contracts/4.x/api/proxy#UUPSUpgradeable)
- [UUPS vs Transparent Proxies](https://docs.openzeppelin.com/contracts/4.x/api/proxy#transparent-vs-uups)

### Merkle Tree Resources

- [Merkle Trees in Solidity](https://blog.ethereum.org/2015/11/15/merkling-in-ethereum/)
- [OpenZeppelin MerkleProof](https://docs.openzeppelin.com/contracts/4.x/api/utils#MerkleProof)

### Hardhat Development

- [Hardhat Documentation](https://hardhat.org/docs)
- [Hardhat Testing](https://hardhat.org/docs/guides/test)
- [Hardhat Deployment](https://hardhat.org/docs/guides/deploying)

### Security Best Practices

- [Smart Contract Security](https://consensys.github.io/smart-contract-best-practices/)
- [OpenZeppelin Security](https://docs.openzeppelin.com/contracts/4.x/security)
