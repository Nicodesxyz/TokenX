// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./LaunchpadToken.sol";

contract TokenFactory {
    struct TokenInfo {
        address token;
        address owner;
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply; 
        uint256 maxSupply;    
        bool mintable;
        bool burnable;
        uint256 createdAt;
    }

    TokenInfo[] public allTokens;

    event TokenCreated(
        address indexed owner,
        address indexed token,
        string name,
        string symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 maxSupply,
        bool mintable,
        bool burnable
    );

    function createToken(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupplyWholeUnits,
        uint256 maxSupplyWholeUnits,
        bool mintable_,
        bool burnable_
    ) external returns (address tokenAddress) {
        require(bytes(name_).length > 0, "Name required");
        require(bytes(symbol_).length > 0, "Symbol required");
        require(decimals_ <= 18, "Max 18 decimals");
        require(maxSupplyWholeUnits > 0, "Max supply > 0");

        uint256 factor = 10 ** uint256(decimals_);

        uint256 initialSupply = initialSupplyWholeUnits * factor;
        uint256 maxSupply = maxSupplyWholeUnits * factor;

        require(initialSupply <= maxSupply, "Initial > max");

        if (!mintable_) {
            require(initialSupply == maxSupply, "Fixed supply must use full max");
        }

        LaunchpadToken token = new LaunchpadToken(
            name_,
            symbol_,
            decimals_,
            initialSupply,
            maxSupply,
            msg.sender,
            mintable_,
            burnable_
        );

        tokenAddress = address(token);

        allTokens.push(
            TokenInfo({
                token: tokenAddress,
                owner: msg.sender,
                name: name_,
                symbol: symbol_,
                decimals: decimals_,
                initialSupply: initialSupply,
                maxSupply: maxSupply,
                mintable: mintable_,
                burnable: burnable_,
                createdAt: block.timestamp
            })
        );

        emit TokenCreated(
            msg.sender,
            tokenAddress,
            name_,
            symbol_,
            decimals_,
            initialSupply,
            maxSupply,
            mintable_,
            burnable_
        );
    }

    function getAllTokens() external view returns (TokenInfo[] memory) {
        return allTokens;
    }

    function getTokensByOwner(address owner)
        external
        view
        returns (TokenInfo[] memory result)
    {
        uint256 count;
        uint256 len = allTokens.length;

        for (uint256 i = 0; i < len; i++) {
            if (allTokens[i].owner == owner) {
                count++;
            }
        }

        result = new TokenInfo[](count);
        uint256 idx;

        for (uint256 i = 0; i < len; i++) {
            if (allTokens[i].owner == owner) {
                result[idx] = allTokens[i];
                idx++;
            }
        }
    }

    function totalTokens() external view returns (uint256) {
        return allTokens.length;
    }
}
