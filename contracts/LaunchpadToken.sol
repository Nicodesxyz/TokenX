// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract LaunchpadToken is ERC20, Ownable {
    uint8 private immutable _customDecimals;

    uint256 public immutable maxSupply;
    bool public immutable isMintable;
    bool public immutable isBurnable;

    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,     
        uint256 maxSupply_,       
        address initialOwner_,
        bool mintable_,
        bool burnable_
    )
        ERC20(name_, symbol_)
        Ownable(initialOwner_) // 🔹 pass the owner to the base constructor
    {
        require(maxSupply_ > 0, "Max supply must be > 0");
        require(initialSupply_ <= maxSupply_, "Initial > max supply");

        if (!mintable_) {
            require(
                initialSupply_ == maxSupply_,
                "Fixed supply: initial must equal max"
            );
        }

        _customDecimals = decimals_;
        maxSupply = maxSupply_;
        isMintable = mintable_;
        isBurnable = burnable_;

        if (initialSupply_ > 0) {
            _mint(initialOwner_, initialSupply_);
        }
    }

    function decimals() public view override returns (uint8) {
        return _customDecimals;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        require(isMintable, "Minting disabled");
        require(totalSupply() + amount <= maxSupply, "Max supply exceeded");
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        require(isBurnable, "Burning disabled");
        _burn(_msgSender(), amount);
    }

    function burnFrom(address account, uint256 amount) external {
        require(isBurnable, "Burning disabled");

        uint256 currentAllowance = allowance(account, _msgSender());
        require(currentAllowance >= amount, "ERC20: insufficient allowance");

        _approve(account, _msgSender(), currentAllowance - amount);
        _burn(account, amount);
    }
}
