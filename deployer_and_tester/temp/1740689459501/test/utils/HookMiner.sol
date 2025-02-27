// SPDX-License-Identifier: MIT
pragma solidity >=0.8.19 <0.9.0;

library HookMiner {
    // Find an address with the specified flags
    function find(
        address deployer,
        uint160 flags,
        bytes memory creationCode,
        bytes memory constructorArgs
    ) internal pure returns (address hookAddress, bytes32 salt) {
        // Concatenate the creation code and constructor arguments
        bytes memory bytecode = abi.encodePacked(creationCode, constructorArgs);
        
        // Calculate the address prefix we're looking for
        bytes memory addressPrefix = abi.encodePacked(
            bytes1(0xFF),
            deployer,
            bytes32(0)
        );
        
        // Iterate until we find a salt that gives us the desired flags
        uint256 nonce = 0;
        while (true) {
            salt = bytes32(nonce);
            bytes32 addressBytes = keccak256(abi.encodePacked(addressPrefix, salt, keccak256(bytecode)));
            
            // Check if the last 20 bytes of the address have the desired flags
            if (uint160(uint256(addressBytes)) & flags == flags) {
                hookAddress = address(uint160(uint256(addressBytes)));
                break;
            }
            
            nonce++;
        }
    }
}