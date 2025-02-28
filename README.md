# UniGuard

## Project Overview
UniGuard is a sandbox environment developer tool designed to enhance the security and reliability of Uniswap V4 hook contracts. It empowers users by offering AI-powered testing and auditing capabilities through our hyperbolic AI agent LLMs. 

### Core Features
1. **AI-Powered Test Generation & Execution**
   - Users can generate tests for their Uniswap V4 hook contracts powered by a hyperbolic AI agent LLM.
   - Tests are executed within our sandboxed UI, allowing users to validate contract behavior before deployment.

2. **AI-Driven Code Auditing**
   - Another hyperbolic AI agent scans and audits Uniswap V4 hook contracts for potential vulnerabilities or malicious code.
   - The agent performs in-depth security analysis and provides an audit report highlighting risks and recommendations.

3. **Othentic Stack & AVS Consensus**
   - Our infrastructure leverages the **Othentic stack** to run an **Active Verification Service (AVS)**.
   - Each node in the AVS reaches consensus on whether the code is malicious.
   - The aggregated decision is then reported back to the AI agent, providing users with a definitive security assessment.

---

## Architecture & Workflow

### 1. Test Generation and Execution
- Users submit their Uniswap V4 hook contract code.
- The AI agent analyzes the code and generates a comprehensive set of tests.
- Tests are executed within the UniGuard UI, simulating real-world scenarios.
- The results are displayed in a structured format, allowing users to identify potential issues.

### 2. Security Auditing & Malicious Code Detection
- Users can trigger an audit by submitting their contract code.
- The AI agent scans the code for known vulnerabilities and potential exploits.
- The audit results are fed into the Othentic AVS, where each node verifies and reaches a consensus on the threat level.
- The final security report is presented to the user with actionable insights.

---

## Technology Stack
- **Testing Framework:** Foundry (for local and UI-integrated contract testing)
- **AI Agent:** Hyperbolic LLM models for test generation and security auditing
- **AVS & Verification:** Othentic Stack for decentralized validation of security assessments

---

## User Experience Flow
1. **Submit Code** – Users input their Uniswap V4 hook contract code.
2. **Generate Tests** – The AI agent creates relevant test cases.
3. **Execute Tests** – Users run tests in the UI and review results.
4. **Run Audit** – AI agent scans for vulnerabilities and generates a report.
5. **AVS Validation** – The Othentic AVS verifies audit results through consensus.
6. **Final Report** – Users receive a detailed breakdown of test outcomes and security assessments.

---

## Future Enhancements
- **Automated Fix Suggestions** – AI-assisted remediation of detected vulnerabilities.
- **Expanded Protocol Support** – Extend compatibility beyond Uniswap V4.
- **Live Monitoring** – Real-time security monitoring for deployed contracts.
- **Community Marketplace** – Allow users to share and access pre-verified hook implementations.

---

## Conclusion
UniGuard streamlines the development and security of Uniswap V4 hooks by integrating AI-powered testing and auditing with decentralized validation. By leveraging Othentic’s AVS consensus mechanism, it ensures robust security assessments, empowering developers with confidence in their smart contracts before deployment.
