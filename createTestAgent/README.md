# Foundry Test Suite Generator Agent

This agent uses Hyperbolic's LLM capabilities to automatically generate Foundry test suites for Solidity smart contracts.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Add your Hyperbolic API key to the `.env` file

## Usage

### Starting the Agent

```bash
npm start
```

This will start the agent on the port specified in your `.env` file (default: 3001).

### API Endpoints

- `POST /generate-tests`
  - Generates Foundry test suites for a given Solidity contract
  - Request body:
    ```json
    {
      "contractCode": "// Your Solidity contract code here",
      "contractName": "YourContractName",
      "testType": "unit" // or "integration", "fuzz", etc.
    }
    ```

## How It Works

The agent analyzes the provided Solidity contract using Hyperbolic's LLM capabilities and generates appropriate Foundry test suites. It identifies:

1. Function signatures and their behavior
2. State variables and their usage
3. Potential edge cases and failure modes
4. Security considerations

Based on this analysis, it generates comprehensive test suites that cover:

- Basic functionality tests
- Edge case handling
- Failure mode testing
- Gas optimization checks (optional)

## Customization

You can modify the prompts and templates in the `src/templates` directory to customize the test generation process.

## License

MIT 