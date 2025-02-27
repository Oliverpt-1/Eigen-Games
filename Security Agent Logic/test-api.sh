#!/bin/bash

# Test the security analysis endpoint
echo "Testing security analysis endpoint..."
curl -X POST http://localhost:4004/task/execute \
  -H "Content-Type: application/json" \
  -d '{
    "code": "pragma solidity ^0.8.0;\n\ncontract VulnerableContract {\n    mapping(address => uint256) public balances;\n    \n    function deposit() public payable {\n        balances[msg.sender] += msg.value;\n    }\n    \n    function withdraw(uint256 amount) public {\n        require(balances[msg.sender] >= amount, \"Insufficient balance\");\n        \n        // Vulnerable to reentrancy\n        (bool success, ) = msg.sender.call{value: amount}(\"\");\n        require(success, \"Transfer failed\");\n        \n        balances[msg.sender] -= amount;\n    }\n    \n    function getBalance() public view returns (uint256) {\n        return address(this).balance;\n    }\n}",
    "taskDefinitionId": 0
  }'

echo ""
echo "Testing direct query endpoint..."
curl -X POST http://localhost:4003/test/qwen \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What are the top 3 security best practices for Solidity smart contracts?"
  }' 