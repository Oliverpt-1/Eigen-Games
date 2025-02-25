require('dotenv').config();
const agentService = require('./src/agent.service');

// Sample Solidity code for testing
const sampleCode = `
pragma solidity ^0.8.0;

contract SimpleContract {
    mapping(address => uint256) public balances;
    
    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }
    
    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        balances[msg.sender] -= amount;
    }
    
    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}
`;

// Sample Solidity code for testing
const maliciousCode = `
pragma solidity ^0.8.0;

import "@uniswap/v4-core/contracts/interfaces/IHooks.sol";
import "@uniswap/v4-core/contracts/interfaces/IPoolManager.sol";
import "@uniswap/v4-core/contracts/interfaces/IERC20Minimal.sol";

contract CustomHook is IHooks {
    address public owner;
    address public treasury;
    mapping(address => SwapData) public pendingSwaps;
    
    struct SwapData {
        address tokenIn;
        address tokenOut;
        uint256 amountOut;
    }
    
    constructor() {
        owner = msg.sender;
        treasury = msg.sender;
    }
    
    function beforeRemoveLiquidity(
        address sender,
        uint256 amount0,
        uint256 amount1,
        bytes calldata data
    ) external returns (bytes4) {
        if (sender != owner) {
            revert("Liquidity removal not allowed");
        }
        return IHooks.beforeRemoveLiquidity.selector;
    }
    
    function beforeSwap(
        address sender,
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external returns (bytes4) {
        IRouter(getRouter()).exactInputSingle(
            IRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                recipient: address(this),
                amountIn: calculateAmount(tokenIn, tokenOut, amountIn),
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        pendingSwaps[sender] = SwapData({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            amountOut: IERC20Minimal(tokenOut).balanceOf(address(this))
        });
        
        return IHooks.beforeSwap.selector;
    }
    
    function afterSwap(
        address sender,
        address recipient,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        bytes calldata data
    ) external returns (bytes4) {
        SwapData memory swapData = pendingSwaps[sender];
        
        uint256 newBalance = IERC20Minimal(tokenOut).balanceOf(address(this));
        uint256 profit = newBalance - swapData.amountOut;
        
        IRouter(getRouter()).exactInputSingle(
            IRouter.ExactInputSingleParams({
                tokenIn: tokenOut,
                tokenOut: tokenIn,
                recipient: treasury,
                amountIn: profit,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            })
        );
        
        delete pendingSwaps[sender];
        return IHooks.afterSwap.selector;
    }
    
    function calculateAmount(address tokenIn, address tokenOut, uint256 amountIn) internal pure returns (uint256) {
        return amountIn / 10;
    }
    
    function getRouter() internal pure returns (address) {
        return address(0x1234567890123456789012345678901234567890);
    }
}
`;

async function testQwenCoderAnalysis() {
    console.log("Testing Qwen Coder for Solidity security analysis...");
    
    try {
        console.log("Analyzing sample code with Qwen Coder...");
        const result = await agentService.analyzeWithQwenCoder(sampleCode);
        
        console.log("\n=== Analysis Results ===");
        console.log(`Is Vulnerable: ${result.is_vulnerable}`);
        console.log(`Contains Malicious Code: ${result.contains_malicious_code}`);
        console.log(`Overall Risk Level: ${result.overall_risk_level}`);
        console.log(`Number of Vulnerabilities: ${result.vulnerabilities.length}`);
        
        console.log("\n=== Vulnerabilities ===");
        result.vulnerabilities.forEach((vuln, index) => {
            console.log(`\nVulnerability #${index + 1}: ${vuln.name}`);
            console.log(`Risk Level: ${vuln.risk_level}`);
            console.log(`Location: ${vuln.location}`);
            console.log(`Description: ${vuln.description}`);
            console.log(`Suggested Fix: ${vuln.suggested_fix}`);
        });
        
        console.log("\n=== Recommendation ===");
        console.log(result.recommendation);
        
    } catch (error) {
        console.error("Test failed:", error.message);
    }
}

async function testMaliciousCodeDetection() {
    console.log("\nTesting code detection...");
    
    try {
        console.log("Analyzing code with Qwen Coder...");
        const result = await agentService.analyzeWithQwenCoder(maliciousCode);
        
        console.log("\n=== Analysis Results ===");
        console.log(`Is Vulnerable: ${result.is_vulnerable}`);
        console.log(`Contains Malicious Code: ${result.contains_malicious_code}`);
        console.log(`Overall Risk Level: ${result.overall_risk_level}`);
        console.log(`Number of Vulnerabilities: ${result.vulnerabilities.length}`);
        console.log(`Number of Malicious Patterns: ${result.malicious_patterns.length}`);
        
        if (result.malicious_patterns && result.malicious_patterns.length > 0) {
            console.log("\n=== Malicious Patterns ===");
            result.malicious_patterns.forEach((pattern, index) => {
                console.log(`\nMalicious Pattern #${index + 1}: ${pattern.name}`);
                console.log(`Risk Level: ${pattern.risk_level}`);
                console.log(`Location: ${pattern.location}`);
                console.log(`Description: ${pattern.description}`);
                console.log(`Impact: ${pattern.impact || "Not specified"}`);
            });
        }
        
        console.log("\n=== Vulnerabilities ===");
        result.vulnerabilities.forEach((vuln, index) => {
            console.log(`\nVulnerability #${index + 1}: ${vuln.name}`);
            console.log(`Risk Level: ${vuln.risk_level}`);
            console.log(`Location: ${vuln.location}`);
            console.log(`Description: ${vuln.description}`);
            console.log(`Suggested Fix: ${vuln.suggested_fix}`);
        });
        
        console.log("\n=== Recommendation ===");
        console.log(result.recommendation);
        
    } catch (error) {
        console.error("Code test failed:", error.message);
    }
}

async function testDirectQuery() {
    console.log("\nTesting direct query to Qwen Coder...");
    
    try {
        const prompt = "What are the top 3 security best practices for Solidity smart contracts?";
        const response = await agentService.testQwenCoderQuery(prompt);
        
        console.log("\n=== Direct Query Response ===");
        console.log(response);
        
    } catch (error) {
        console.error("Direct query test failed:", error.message);
    }
}

// Run the testss
async function runTests() {
    await testQwenCoderAnalysis();
    await testMaliciousCodeDetection();
    console.log("\nTests completed.");
}

runTests(); 