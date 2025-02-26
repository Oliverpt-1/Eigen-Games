// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../src/SampleContract.sol";

contract sampleHookTest is Test {
    SampleContract public sampleContract;
    address public owner;
    address public user;

    // Set up the test environment before each test
    function setUp() public {
        owner = address(this);
        user = address(0x1);
        
        // Deploy the contract
        sampleContract = new SampleContract();
        
        // Fund the user with some ETH for testing
        vm.deal(user, 10 ether);
    }

    // Test the initialization state
    function testInitialState() public {
        assertEq(sampleContract.owner(), owner);
        assertEq(sampleContract.getValue(), 0);
    }

    // Test the setValue function
    function testSetValue() public {
        uint256 newValue = 42;
        sampleContract.setValue(newValue);
        assertEq(sampleContract.getValue(), newValue);
    }

    // Test that only the owner can set the value
    function testOnlyOwnerCanSetValue() public {
        uint256 newValue = 42;
        
        // Try to set value as a different user
        vm.prank(user);
        vm.expectRevert("Not owner");
        sampleContract.setValue(newValue);
        
        // Verify the value didn't change
        assertEq(sampleContract.getValue(), 0);
    }

    // Test the deposit function
    function testDeposit() public {
        uint256 depositAmount = 1 ether;
        
        // Deposit as user
        vm.prank(user);
        sampleContract.deposit{value: depositAmount}();
        
        // Check the balance
        assertEq(address(sampleContract).balance, depositAmount);
        assertEq(sampleContract.balances(user), depositAmount);
    }

    // Test the withdraw function
    function testWithdraw() public {
        uint256 depositAmount = 1 ether;
        
        // First deposit as user
        vm.startPrank(user);
        sampleContract.deposit{value: depositAmount}();
        
        // Check user's balance before withdrawal
        uint256 balanceBefore = user.balance;
        
        // Withdraw
        sampleContract.withdraw(depositAmount);
        vm.stopPrank();
        
        // Check balances after withdrawal
        assertEq(address(sampleContract).balance, 0);
        assertEq(sampleContract.balances(user), 0);
        assertEq(user.balance, balanceBefore + depositAmount);
    }

    // Test withdrawing more than the balance
    function testWithdrawMoreThanBalance() public {
        uint256 depositAmount = 1 ether;
        
        // First deposit as user
        vm.prank(user);
        sampleContract.deposit{value: depositAmount}();
        
        // Try to withdraw more than deposited
        vm.prank(user);
        vm.expectRevert("Insufficient balance");
        sampleContract.withdraw(2 ether);
    }

    // Fuzz test for deposit and withdraw
    function testFuzz_DepositAndWithdraw(uint256 amount) public {
        // Bound the amount to something reasonable
        amount = bound(amount, 0.1 ether, 5 ether);
        
        // Fund the user with enough ETH
        vm.deal(user, amount);
        
        // Deposit as user
        vm.prank(user);
        sampleContract.deposit{value: amount}();
        
        // Check the balance
        assertEq(address(sampleContract).balance, amount);
        assertEq(sampleContract.balances(user), amount);
        
        // Withdraw
        vm.prank(user);
        sampleContract.withdraw(amount);
        
        // Check balances after withdrawal
        assertEq(address(sampleContract).balance, 0);
        assertEq(sampleContract.balances(user), 0);
    }
} 