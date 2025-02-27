const { RiskLevel } = require('./risk-level');

/**
 * Comprehensive database of audit findings, vulnerabilities, and security patterns
 * focused on Uniswap V4 hooks and related DeFi protocols
 */
const AuditDatabase = {
  // Uniswap V4 Hook-specific vulnerabilities
  v4Hooks: {
    lifecycle: [
      {
        name: "Hook Initialization Race Condition",
        risk_level: RiskLevel.HIGH,
        description: "Improper initialization of hooks can lead to race conditions where the hook's state can be manipulated before proper setup.",
        vulnerable_pattern: `
function initialize(uint160 sqrtPriceX96) external {
    if (!initialized) {
        initialized = true;
        // ... initialization logic
    }
}`,
        secure_pattern: `
function initialize(uint160 sqrtPriceX96) external {
    if (initialized) revert AlreadyInitialized();
    initialized = true;
    // ... initialization logic
    emit Initialized(msg.sender, sqrtPriceX96);
}`,
        audit_references: ["Uniswap V4 Initial Audit - Finding #H-1"],
        mitigation_strategy: "Implement proper initialization checks with events and reentrancy guards"
      }
    ],
    
    stateManagement: [
      {
        name: "Hook State Corruption",
        risk_level: RiskLevel.CRITICAL,
        description: "Hooks sharing state across multiple pools can lead to state corruption if proper isolation isn't maintained.",
        vulnerable_pattern: `
mapping(address => uint256) public poolBalances;

function afterSwap(address pool, ...) public {
    poolBalances[pool] += amount;
}`,
        secure_pattern: `
mapping(address => mapping(address => uint256)) public poolTokenBalances;

function afterSwap(address pool, address token, ...) public {
    if (!_isPoolValid(pool)) revert InvalidPool();
    poolTokenBalances[pool][token] += amount;
}`,
        audit_references: ["Hook Security Review 2024 - Finding #C-2"],
        mitigation_strategy: "Implement proper state isolation per pool and token"
      }
    ],

    reentrancy: [
      {
        name: "Cross-Function Hook Reentrancy",
        risk_level: RiskLevel.CRITICAL,
        description: "Hooks can be vulnerable to reentrancy attacks across different hook functions.",
        vulnerable_pattern: `
function beforeSwap(...) public {
    // state changes
    _callback();
    // more state changes
}`,
        secure_pattern: `
uint256 private constant _NOT_ENTERED = 1;
uint256 private constant _ENTERED = 2;
uint256 private _status;

modifier nonReentrant() {
    require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
    _status = _ENTERED;
    _;
    _status = _NOT_ENTERED;
}

function beforeSwap(...) public nonReentrant {
    // state changes
    _callback();
    // more state changes
}`,
        audit_references: ["DeFi Security Summit Findings 2024"],
        mitigation_strategy: "Implement reentrancy guards and follow CEI pattern"
      }
    ],

    accessControl: [
      {
        name: "Privileged Hook Operations",
        risk_level: RiskLevel.HIGH,
        description: "Hooks with privileged operations must implement proper access control.",
        vulnerable_pattern: `
function updateHookParameters(uint256 newValue) external {
    parameters = newValue;
}`,
        secure_pattern: `
function updateHookParameters(uint256 newValue) external {
    if (msg.sender != owner) revert NotAuthorized();
    uint256 oldValue = parameters;
    parameters = newValue;
    emit ParametersUpdated(oldValue, newValue);
}`,
        audit_references: ["Uniswap V4 Hook Registry Audit"],
        mitigation_strategy: "Implement role-based access control and proper event emission"
      },
      {
        name: "Unrestricted Callback Functions",
        risk_level: RiskLevel.HIGH,
        description: "Callers of callback functions are not exclusively restricted to the contract itself.",
        vulnerable_pattern: `
function callback() external {
    // Make state changes
    count++;
}`,
        secure_pattern: `
modifier selfOnly() {
    if (msg.sender != address(this)) revert NotSelf();
    _;
}

function callback() external selfOnly {
    // Make state changes
    count++;
}`,
        audit_references: ["Uniswap V4 Hook Security Audit 2024"],
        mitigation_strategy: "Implement a selfOnly modifier and apply it to all callback functions"
      },
      {
        name: "Unrestricted Hook Functions",
        risk_level: RiskLevel.HIGH,
        description: "Callers of hook functions are not exclusively restricted to the pool manager alone.",
        vulnerable_pattern: `
function beforeSwap(
    address,
    PoolKey calldata,
    IPoolManager.SwapParams calldata,
    bytes calldata
) external override returns (bytes4) {
    count++;  // make changes to contract states
    return IHooks.beforeSwap.selector;
}`,
        secure_pattern: `
modifier poolManagerOnly() {
    if (msg.sender != address(poolManager)) revert NotPoolManager();
    _;
}

function beforeSwap(
    address,
    PoolKey calldata,
    IPoolManager.SwapParams calldata,
    bytes calldata
) external override poolManagerOnly returns (bytes4) {
    count++;  // make changes to contract states
    return IHooks.beforeSwap.selector;
}`,
        audit_references: ["Uniswap V4 Hook Security Audit 2024"],
        mitigation_strategy: "Implement a poolManagerOnly modifier and apply it to all hook functions that modify state"
      }
    ],
    
    selfDestruct: [
      {
        name: "Self-Destruct in Hook",
        risk_level: RiskLevel.MEDIUM,
        description: "The contract contains SELFDESTRUCT. No self-destruct is allowed, even with privilege validation.",
        vulnerable_pattern: `
function destroyContract() external onlyOwner {
    selfdestruct(payable(owner));
}`,
        secure_pattern: `
// No secure pattern - self-destruct should be completely removed
// Consider implementing a pause mechanism instead if needed`,
        audit_references: ["Uniswap V4 Hook Security Best Practices"],
        mitigation_strategy: "Remove all self-destruct functionality from hook contracts"
      }
    ],
    
    delegatecall: [
      {
        name: "Delegatecall to Mutable Address",
        risk_level: RiskLevel.HIGH,
        description: "The contract DELEGATECALLs to mutable addresses, which can lead to complete contract takeover.",
        vulnerable_pattern: `
address public implementation;

function setImplementation(address _implementation) external onlyOwner {
    implementation = _implementation;
}

function execute(bytes memory data) external {
    (bool success, ) = implementation.delegatecall(data);
    require(success, "Execution failed");
}`,
        secure_pattern: `
// If delegatecall is necessary, use immutable addresses
address public immutable implementation;

constructor(address _implementation) {
    implementation = _implementation;
}

function execute(bytes memory data) external onlyOwner {
    (bool success, ) = implementation.delegatecall(data);
    require(success, "Execution failed");
}`,
        audit_references: ["Uniswap V4 Hook Security Audit 2024"],
        mitigation_strategy: "Avoid delegatecall entirely, or if necessary, only delegatecall to immutable addresses"
      }
    ]
  },

  // MEV-related vulnerabilities
  mev: [
    {
      name: "Hook Sandwich Attack Vector",
      risk_level: RiskLevel.HIGH,
      description: "Hooks can be sandwiched by MEV bots if they don't implement proper slippage protection.",
      vulnerable_pattern: `
function beforeSwap(address pool, ...) public returns (bytes4) {
    // Perform swap without slippage check
    return IHooks.beforeSwap.selector;
}`,
      secure_pattern: `
function beforeSwap(address pool, ..., uint256 slippageTolerance) public returns (bytes4) {
    if (priceImpact > slippageTolerance) revert ExcessiveSlippage();
    return IHooks.beforeSwap.selector;
}`,
      audit_references: ["MEV Research Report 2024"],
      mitigation_strategy: "Implement slippage protection and minimum output amounts"
    }
  ],

  // Common DeFi vulnerabilities that affect hooks
  defi: [
    {
      name: "Oracle Manipulation via Hooks",
      risk_level: RiskLevel.CRITICAL,
      description: "Hooks relying on pool prices as oracles can be manipulated in a single transaction.",
      vulnerable_pattern: `
function getPoolPrice(address pool) internal view returns (uint256) {
    return IUniswapV4Pool(pool).getSqrtPriceX96();
}`,
      secure_pattern: `
function getPoolPrice(address pool) internal view returns (uint256) {
    uint256 price = IUniswapV4Pool(pool).getSqrtPriceX96();
    require(price >= minPrice && price <= maxPrice, "Price out of bounds");
    return _getTWAP(pool); // Use TWAP instead of spot price
}`,
      audit_references: ["Oracle Security Best Practices 2024"],
      mitigation_strategy: "Use TWAP and implement price bounds"
    }
  ],

  // Testing and validation patterns
  testingPatterns: [
    {
      name: "Hook Integration Testing",
      description: "Patterns for comprehensive hook testing",
      test_scenarios: [
        "Initialize hook with various parameters",
        "Test hook interactions across multiple pools",
        "Verify hook behavior under reentrancy attempts",
        "Validate state changes after hook callbacks",
        "Test access control restrictions"
      ],
      test_template: `
describe("Hook Security Tests", function() {
    beforeEach(async function() {
        // Setup hook and pool
    });

    it("should prevent reentrancy attacks", async function() {
        // Test implementation
    });
});`
    }
  ],

  // NEW SECTION: Malicious code patterns (intentionally harmful implementations)
  maliciousPatterns: {
    liquidityTraps: [
      {
        name: "Liquidity Removal Blocker",
        is_malicious: true,
        risk_level: RiskLevel.CRITICAL,
        description: "A hook that intentionally blocks liquidity removal, causing user funds to be permanently locked in the pool.",
        malicious_pattern: `
function beforeRemoveLiquidity(
    address sender,
    uint256 amount0,
    uint256 amount1,
    bytes calldata data
) external returns (bytes4) {
    // Always revert for non-owner addresses
    if (sender != owner) {
        revert("Liquidity removal not allowed");
    }
    return IHooks.beforeRemoveLiquidity.selector;
}`,
        detection_hints: [
          "Unconditional reverts in beforeRemoveLiquidity for non-privileged addresses",
          "Conditional logic that makes it impossible to meet removal requirements",
          "Time-locks that never expire or have unreasonable durations (e.g., 100 years)"
        ],
        example_scenario: "A malicious protocol launches with attractive yields to attract liquidity. After sufficient funds are deposited, the hook prevents all users except the owner from removing liquidity, effectively stealing user funds.",
        impact: "Users permanently lose access to their deposited funds, with no recourse."
      },
      {
        name: "Conditional Liquidity Trap",
        is_malicious: true,
        risk_level: RiskLevel.HIGH,
        description: "A hook that allows liquidity removal under specific conditions that become impossible to meet after a certain point.",
        malicious_pattern: `
// State that can be manipulated to make liquidity removal impossible
uint256 public requiredWithdrawalFee;
address public feeToken;

function beforeRemoveLiquidity(
    address sender,
    uint256 amount0,
    uint256 amount1,
    bytes calldata data
) external returns (bytes4) {
    // Check if user has paid the "withdrawal fee"
    IERC20 token = IERC20(feeToken);
    require(token.allowance(sender, address(this)) >= requiredWithdrawalFee, 
            "Insufficient withdrawal fee");
    
    // Transfer fee
    token.transferFrom(sender, treasury, requiredWithdrawalFee);
    
    return IHooks.beforeRemoveLiquidity.selector;
}

// Owner can set an impossible fee or change to a non-existent token
function updateWithdrawalParameters(uint256 newFee, address newToken) external onlyOwner {
    requiredWithdrawalFee = newFee;
    feeToken = newToken;
}`,
        detection_hints: [
          "Withdrawal fees that can be changed by privileged roles",
          "Dependency on external tokens for withdrawal approval",
          "Complex conditions that can be manipulated by the protocol owner"
        ],
        example_scenario: "Initially, the protocol has reasonable withdrawal fees. After accumulating significant liquidity, the owner sets the fee to an astronomical amount or changes the fee token to a worthless or non-existent token.",
        impact: "Users are technically able to withdraw but practically cannot meet the requirements, resulting in locked funds."
      }
    ],
    
    atomicSandwichAttacks: [
      {
        name: "Atomic Front-Running Hook",
        is_malicious: true,
        risk_level: RiskLevel.CRITICAL,
        description: "A hook that performs front-running trades within the same transaction as the user's swap, extracting value from every trade.",
        malicious_pattern: `
function beforeSwap(
    address sender,
    address recipient,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    bytes calldata data
) external returns (bytes4) {
    // Execute a trade in the same direction to front-run
    IRouter(router).exactInputSingle(
        IRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            recipient: treasury, // Profits go to attacker
            amountIn: calculateOptimalAmount(tokenIn, tokenOut, amountIn),
            amountOutMinimum: 0, // No slippage protection for the attack
            sqrtPriceLimitX96: 0
        })
    );
    
    return IHooks.beforeSwap.selector;
}`,
        detection_hints: [
          "Hook performs its own swaps in beforeSwap",
          "Hook uses the same token pair as the user's transaction",
          "Profits are directed to a treasury or owner address",
          "No slippage protection on the hook's trades"
        ],
        example_scenario: "When a user attempts to swap tokens, the hook executes its own swap first, moving the price in the direction of the user's trade. The user receives fewer tokens than expected, and the difference is captured by the hook owner.",
        impact: "Every user of the pool experiences worse execution prices, with the extracted value going to the hook deployer."
      },
      {
        name: "Atomic Sandwich Attack Hook",
        is_malicious: true,
        risk_level: RiskLevel.CRITICAL,
        description: "A hook that performs both front-running and back-running trades within the same transaction, sandwiching the user's trade for maximum value extraction.",
        malicious_pattern: `
function beforeSwap(
    address sender,
    address recipient,
    address tokenIn,
    address tokenOut,
    uint256 amountIn,
    bytes calldata data
) external returns (bytes4) {
    // Front-run: Buy the output token before user's swap
    IRouter(router).exactInputSingle(
        IRouter.ExactInputSingleParams({
            tokenIn: tokenIn,
            tokenOut: tokenOut,
            recipient: address(this),
            amountIn: calculateFrontRunAmount(tokenIn, tokenOut, amountIn),
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        })
    );
    
    // Store state for afterSwap
    pendingSandwich[sender] = SandwichData({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        amountOut: IERC20(tokenOut).balanceOf(address(this))
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
    // Back-run: Sell the output token after user's swap
    SandwichData memory sandwich = pendingSandwich[sender];
    
    uint256 newBalance = IERC20(tokenOut).balanceOf(address(this));
    uint256 profit = newBalance - sandwich.amountOut;
    
    // Sell back for profit
    IRouter(router).exactInputSingle(
        IRouter.ExactInputSingleParams({
            tokenIn: tokenOut,
            tokenOut: tokenIn,
            recipient: treasury,
            amountIn: profit,
            amountOutMinimum: 0,
            sqrtPriceLimitX96: 0
        })
    );
    
    delete pendingSandwich[sender];
    return IHooks.afterSwap.selector;
}`,
        detection_hints: [
          "Hook performs swaps in both beforeSwap and afterSwap",
          "Hook maintains state between beforeSwap and afterSwap",
          "Trades are in opposite directions (buy then sell)",
          "Profits are calculated and extracted within the transaction"
        ],
        example_scenario: "The hook buys the output token before the user's swap, driving up the price. After the user swaps at the worse price, the hook sells the tokens back, profiting from both price movements.",
        impact: "Maximum value extraction from users, with potentially severe price impact on smaller pools."
      }
    ]
  }
};

// Helper functions to query the database
const AuditDatabaseUtils = {
  /**
   * Get all vulnerabilities for a specific category
   * @param {string} category - Category to query
   * @returns {Array} Array of vulnerabilities
   */
  getVulnerabilities(category) {
    return AuditDatabase[category] || [];
  },

  /**
   * Search for specific vulnerability patterns
   * @param {string} searchTerm - Term to search for
   * @returns {Array} Matching vulnerabilities
   */
  searchVulnerabilities(searchTerm) {
    const results = [];
    const search = searchTerm.toLowerCase();

    // Helper function to search through objects
    const searchObject = (obj) => {
      if (typeof obj !== 'object') return;
      
      Object.entries(obj).forEach(([key, value]) => {
        if (typeof value === 'string' && value.toLowerCase().includes(search)) {
          results.push(obj);
        } else if (typeof value === 'object') {
          searchObject(value);
        }
      });
    };

    searchObject(AuditDatabase);
    return [...new Set(results)]; // Remove duplicates
  },

  /**
   * Get secure implementation patterns
   * @param {string} vulnerability - Vulnerability name
   * @returns {Object|null} Secure pattern if found
   */
  getSecurePattern(vulnerability) {
    // Implementation to find and return secure patterns
    return Object.values(AuditDatabase)
      .flat()
      .find(v => v.name === vulnerability);
  },

  /**
   * Get all malicious code patterns
   * @returns {Object} Malicious code patterns by category
   */
  getMaliciousPatterns() {
    return AuditDatabase.maliciousPatterns || {};
  },

  /**
   * Check if code contains malicious patterns
   * @param {string} code - Solidity code to analyze
   * @returns {Object} Analysis result with detected patterns
   */
  detectMaliciousPatterns(code) {
    const results = {
      containsMaliciousCode: false,
      detectedPatterns: []
    };

    // Get all malicious patterns
    const maliciousPatterns = this.getMaliciousPatterns();
    
    // Check each category of malicious patterns
    Object.entries(maliciousPatterns).forEach(([category, patterns]) => {
      patterns.forEach(pattern => {
        // Simple pattern matching (in a real implementation, this would be more sophisticated)
        const codeNormalized = code.replace(/\s+/g, ' ').toLowerCase();
        const patternNormalized = pattern.malicious_pattern.replace(/\s+/g, ' ').toLowerCase();
        
        // Check for signature elements of the pattern
        const hasPattern = pattern.detection_hints.some(hint => {
          const hintElements = hint.toLowerCase().split(' ');
          return hintElements.every(element => codeNormalized.includes(element.toLowerCase()));
        });
        
        if (hasPattern) {
          results.containsMaliciousCode = true;
          results.detectedPatterns.push({
            name: pattern.name,
            category: category,
            risk_level: pattern.risk_level,
            description: pattern.description
          });
        }
      });
    });
    
    return results;
  }
};

module.exports = {
  AuditDatabase,
  AuditDatabaseUtils
}; 