# GateKeeper: Decentralized Sandwich Attack Protection

GateKeeper is a decentralized solution designed to protect users against sandwich attacks in DeFi transactions, leveraging Uniswap V4's hooks system and EigenLayer's AVS (Actively Validated Service) framework.

I put these words here

## Overview

Sandwich attacks are a common MEV (Maximal Extractable Value) exploit where attackers front-run and back-run user transactions to profit from price movements. GateKeeper provides a protective layer that:

1. Validates transactions before they reach Uniswap V4
2. Uses decentralized validators to detect potential sandwich attacks
3. Ensures transaction safety through consensus-based validation

## Architecture

### High-Level Components

```
User Transaction → GateKeeper AVS → Uniswap V4
     ↑               ↓    ↓    ↓         ↓
Front-end    Execution  Validation  Attestation    Hook
Interface    Service    Service     Center      Integration
```

### Key Components

1. **Execution Service**
   - Performs initial transaction analysis
   - Generates Proof of Task for validation
   - Integrates with Uniswap V4's hooks
   - Monitors mempool for potential attacks

2. **Validation Service**
   - Validates transaction safety
   - Runs consensus among validators
   - Ensures transaction integrity
   - Prevents malicious executions

3. **Uniswap V4 Integration**
   - Custom hooks for transaction validation
   - Pre-execution safety checks
   - Dynamic fee adjustment for protection
   - MEV-resistant execution paths

4. **AVS Framework**
   - Decentralized validator network
   - EigenLayer security integration
   - Cross-chain message handling
   - Reward distribution for validators

## Technical Implementation

### AVS Components

1. **Operator Roles**
   - Performer: Executes transaction analysis
   - Attesters: Validate transaction safety
   - Aggregator: Combines validator consensus

2. **Smart Contracts**
   - `GateKeeperAVS.sol`: Main AVS logic
   - `SandwichDetector.sol`: Attack detection
   - `ValidationLogic.sol`: Consensus rules
   - `UniswapHook.sol`: V4 hook integration

### Uniswap V4 Integration

1. **Hook System**
   - Pre-swap validation
   - Price impact analysis
   - MEV protection logic
   - Transaction ordering

2. **Protection Mechanisms**
   - Slippage protection
   - Price impact limits
   - Transaction batching
   - MEV-resistant routing

## Security Features

1. **Attack Prevention**
   - Real-time sandwich attack detection
   - Dynamic slippage adjustment
   - Validator consensus requirements
   - Mempool monitoring

2. **Validator Security**
   - EigenLayer staking requirements
   - Slashing for malicious behavior
   - Multi-signature requirements
   - Decentralized consensus

## Business Goals

1. **User Protection**
   - Minimize MEV exploitation
   - Reduce transaction costs
   - Ensure fair execution
   - Improve DeFi safety

2. **Validator Incentives**
   - Fair reward distribution
   - Stake-based earnings
   - Performance incentives
   - Network growth rewards

3. **Ecosystem Benefits**
   - Improved DeFi security
   - Reduced MEV impact
   - Enhanced user trust
   - Sustainable fee model

## Development Setup

1. **Prerequisites**
   - Node.js v22.6.0
   - Foundry
   - Docker and docker-compose

2. **Network Requirements**
   - Holesky Testnet (L1)
   - Polygon Amoy Testnet (L2)

3. **Required Balances**
   - Deployer: 1.5 holETH (L1) + 5 POL (L2)
   - Operators: 0.02 holETH each
   - Operator1: Additional Amoy (L2) funding

## Getting Started

1. **Environment Setup**
   ```bash
   cp .env.example .env
   # Configure environment variables
   ```

2. **Create Operator Accounts**
   ```bash
   ./scripts/deploy/createAndSaveOperatorAccounts.sh
   ```

3. **Deploy Contracts**
   ```bash
   othentic-cli network deploy \
       --l1-chain holesky \
       --l2-chain amoy \
       --name gatekeeper-avs
   ```

4. **Register Operators**
   ```bash
   othentic-cli operator register
   ```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

## License

[License Type] - See [LICENSE](LICENSE) for details.
