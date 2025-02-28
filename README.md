# UniGuard Documentation

## Introduction
UniGuard is a specialized developer tool designed to enhance the security and reliability of Uniswap V4 hook contracts. By combining AI-powered testing, security auditing, and decentralized validation through the Othentic stack, UniGuard provides a comprehensive solution for developers working with Uniswap V4 hooks.

## Table of Contents
1. [Getting Started](#getting-started)
2. [Features](#features)
3. [Test Generation](#test-generation)
4. [Security Auditing](#security-auditing)
5. [AVS Consensus](#avs-consensus)
6. [Technical Architecture](#technical-architecture)
7. [API Reference](#api-reference)
8. [Troubleshooting](#troubleshooting)
9. [FAQ](#faq)

## Getting Started

### Installation
```bash
# No installation required - UniGuard is a web-based tool
```

### Quick Start
1. Navigate to the UniGuard web interface
2. Paste your Uniswap V4 hook contract code
3. Select either "Generate Tests" or "Run Security Audit"
4. Review the results and implement suggested improvements

## Features

### AI-Powered Test Generation
UniGuard leverages advanced LLM models to analyze your Uniswap V4 hook contracts and generate comprehensive test suites. These tests cover:

- Basic functionality verification
- Edge case handling
- Reentrancy protection
- Gas optimization
- Integration with Uniswap V4 core

### Security Auditing
Our AI-driven security scanner examines your code for:

- Common vulnerabilities (reentrancy, front-running, etc.)
- Uniswap V4-specific security issues
- Gas inefficiencies
- Logic errors
- Compliance with best practices

### Decentralized Validation
UniGuard integrates with the Othentic stack to provide:

- Decentralized verification of security assessments
- Consensus-based validation through an Active Verification Service (AVS)
- Tamper-proof audit records
- Transparent security scoring

## Test Generation

### How It Works
1. **Code Analysis**: Our AI agent analyzes your hook contract to understand its functionality
2. **Test Case Generation**: Based on the analysis, the system generates Forge-compatible test cases
3. **Test Execution**: Tests are run in a sandboxed environment
4. **Result Reporting**: Detailed test results are presented in an easy-to-understand format

### Example Test Output
```
[PASS] testBasicSwapWithHook() (Gas: 123,456)
[PASS] testLiquidityAddition() (Gas: 78,901)
[FAIL] testReentrancyProtection() - Expected revert not received
```

### Interpreting Results
- **Passing Tests**: Functionality working as expected
- **Failing Tests**: Potential issues that need addressing
- **Gas Metrics**: Performance indicators for each operation

## Security Auditing

### Vulnerability Detection
UniGuard scans for multiple categories of vulnerabilities:

1. **Critical**
   - Reentrancy vulnerabilities
   - Unauthorized access to pool funds
   - Logic errors allowing manipulation

2. **High**
   - Front-running opportunities
   - Improper access control
   - Unsafe external calls

3. **Medium**
   - Gas inefficiencies
   - Suboptimal hook implementations
   - Missing validation checks

4. **Low**
   - Code style issues
   - Documentation gaps
   - Minor optimization opportunities

### Audit Report Structure
Each audit generates a comprehensive report containing:

- Executive summary
- Vulnerability breakdown by severity
- Detailed explanations with code references
- Recommended fixes
- Gas optimization suggestions

## AVS Consensus

### Othentic Integration
UniGuard leverages the Othentic stack's Active Verification Service (AVS) to:

1. Distribute security assessments across multiple verification nodes
2. Reach consensus on the security status of submitted contracts
3. Provide tamper-proof verification of audit results
4. Create an immutable record of security assessments

### Consensus Mechanism
The AVS employs a multi-stage verification process:

1. **Initial Assessment**: AI-generated security report
2. **Node Verification**: Multiple nodes independently verify findings
3. **Consensus Building**: Nodes reach agreement on security status
4. **Final Determination**: Aggregated results presented to the user

## Technical Architecture

### System Components
UniGuard consists of several interconnected components:

1. **Web Interface**: User-facing dashboard for code submission and result viewing
2. **AI Engine**: Hyperbolic LLM models for test generation and security analysis
3. **Test Runner**: Foundry-based execution environment for contract testing
4. **Security Scanner**: Specialized code analysis tools for vulnerability detection
5. **Othentic AVS**: Decentralized network for consensus-based validation
6. **Result Aggregator**: System for compiling and presenting findings

### Workflow Diagram
```
User Code → AI Analysis → Test Generation → Test Execution → Results
                        ↓
                Security Scan → AVS Validation → Security Report
```

## API Reference

### REST API Endpoints

#### Test Generation
```
POST /api/compile-and-test
Body: { "code": "contract code here", "testCode": "test code here" }
Response: { "success": true, "results": [...] }
```

#### Security Audit
```
POST /api/security-audit
Body: { "code": "contract code here" }
Response: { "success": true, "vulnerabilities": [...] }
```

#### AVS Verification
```
POST /api/avs-verify
Body: { "auditId": "audit-uuid" }
Response: { "success": true, "consensus": "secure|vulnerable", "score": 85 }
```

## FAQ

### General Questions

**Q: Is UniGuard free to use?**  
A: UniGuard offers both free and premium tiers. Basic testing and security scanning are available at no cost, while advanced features require a subscription.

**Q: How accurate is the AI-powered security analysis?**  
A: Our system achieves approximately 85-90% accuracy in detecting common vulnerabilities. The AVS consensus mechanism helps validate findings and reduce false positives.

**Q: Can UniGuard test hooks for protocols other than Uniswap V4?**  
A: Currently, UniGuard specializes in Uniswap V4 hooks, but support for additional protocols is planned for future releases.

**Q: How does the AVS consensus mechanism work?**  
A: Security assessments are distributed to multiple verification nodes in the Othentic network. Each node independently evaluates the findings, and a consensus is reached based on the collective determination.

**Q: Can I integrate UniGuard into my development workflow?**  
A: Yes, UniGuard offers API endpoints that can be integrated into CI/CD pipelines for automated testing and security scanning.

---

## Future Roadmap

### Upcoming Features
- **Automated Fix Suggestions**: AI-assisted remediation of detected vulnerabilities
- **Expanded Protocol Support**: Extending compatibility beyond Uniswap V4
- **Live Monitoring**: Real-time security monitoring for deployed contracts
- **Community Marketplace**: Platform for sharing and accessing pre-verified hook implementations

### Community Contributions
We welcome contributions from the community! Visit our GitHub repository at [github.com/uniguard/uniguard](https://github.com/uniguard/uniguard) to:
- Submit bug reports
- Propose new features
- Contribute code improvements
- Share test cases

---

*UniGuard is a project developed for the Eigen Games hackathon, leveraging AI and the Othentic stack to enhance the security of Uniswap V4 hook contracts.*
