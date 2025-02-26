# Solidity Service

A consolidated service for compiling, testing, and deploying Solidity contracts.

## Features

- Compile Solidity contracts using Foundry
- Run tests on Solidity contracts using Foundry
- Deploy compiled contracts to the blockchain
- One-step compile and deploy functionality

## API Endpoints

### Check Server Status
```
GET /
```
Returns a message indicating the server is running.

### Compile Solidity Code
```
POST /api/compile
```
Body:
```json
{
  "code": "// Your Solidity code here"
}
```
Returns compilation results including bytecode and ABI.

### Run Tests
```
POST /api/test
```
Body:
```json
{
  "code": "// Your Solidity code here",
  "testCode": "// Optional custom test code"
}
```
Returns test results.

### Deploy Contract
```
POST /api/deploy
```
Body:
```json
{
  "abi": [],
  "bytecode": "0x..."
}
```
Returns the deployed contract address.

### Compile and Deploy
```
POST /api/compile-and-deploy
```
Body:
```json
{
  "code": "// Your Solidity code here"
}
```
Compiles the code and deploys it in one step.

## Setup

1. Install dependencies:
```
npm install
```

2. Create a `.env` file with the following variables:
```
RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key
```

3. Build the Docker images:
```
./build-images.sh
```

4. Start the server:
```
npm start
```

## Docker Images

This service uses two Docker images:

1. **compiler-image**: Used for compiling Solidity contracts with Foundry
   - Built from `Dockerfile.compiler`
   - Includes Foundry and Uniswap V4 dependencies

2. **tester-image**: Used for running tests on Solidity contracts with Foundry
   - Built from `Dockerfile.tester`
   - Includes Foundry and Uniswap V4 dependencies

## Frontend Integration

The frontend can connect to this service at `http://localhost:3000` to compile, test, and deploy Solidity contracts. 