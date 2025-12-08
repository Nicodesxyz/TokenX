// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiTokenLocker is ReentrancyGuard, Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    struct Lock {
        address token;
        address owner;
        uint256 amount;
        uint256 startTime;
        uint256 unlockTime;
        bool claimed;
        string memo;
    }

    uint256 public nextLockId;
    mapping(uint256 => Lock) public locks;
    mapping(address => uint256[]) public userLocks;
    mapping(address => uint256) public totalLockedPerToken;

    event TokensLocked(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount,
        uint256 startTime,
        uint256 unlockTime,
        string memo
    );

    event LockIncreased(
        uint256 indexed lockId,
        uint256 addedAmount,
        uint256 newTotalAmount
    );

    event LockExtended(
        uint256 indexed lockId,
        uint256 oldUnlockTime,
        uint256 newUnlockTime
    );

    event TokensWithdrawn(
        uint256 indexed lockId,
        address indexed token,
        address indexed owner,
        uint256 amount
    );

    event TokensRescued(address indexed token, uint256 amount);

    function lockTokens(
        address token,
        uint256 amount,
        uint256 unlockTime,
        string calldata memo
    ) external nonReentrant returns (uint256 lockId) {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Amount = 0");
        require(unlockTime > block.timestamp, "Unlock in the past");

        IERC20 erc20 = IERC20(token);
        require(
            erc20.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        lockId = ++nextLockId;

        Lock storage l = locks[lockId];
        l.token = token;
        l.owner = msg.sender;
        l.amount = amount;
        l.startTime = block.timestamp;
        l.unlockTime = unlockTime;
        l.claimed = false;
        l.memo = memo;

        userLocks[msg.sender].push(lockId);
        totalLockedPerToken[token] += amount;

        emit TokensLocked(
            lockId,
            token,
            msg.sender,
            amount,
            l.startTime,
            unlockTime,
            memo
        );
    }

    function increaseLockAmount(
        uint256 lockId,
        uint256 addedAmount
    ) external nonReentrant {
        require(addedAmount > 0, "Added = 0");
        Lock storage l = locks[lockId];
        require(l.owner == msg.sender, "Not lock owner");
        require(!l.claimed, "Lock claimed");

        IERC20 erc20 = IERC20(l.token);
        require(
            erc20.transferFrom(msg.sender, address(this), addedAmount),
            "Transfer failed"
        );

        l.amount += addedAmount;
        totalLockedPerToken[l.token] += addedAmount;

        emit LockIncreased(lockId, addedAmount, l.amount);
    }

    function extendLock(uint256 lockId, uint256 newUnlockTime) external {
        Lock storage l = locks[lockId];
        require(l.owner == msg.sender, "Not lock owner");
        require(!l.claimed, "Lock claimed");
        require(newUnlockTime > l.unlockTime, "Must extend");
        require(newUnlockTime > block.timestamp, "New unlock in past");

        uint256 oldUnlock = l.unlockTime;
        l.unlockTime = newUnlockTime;

        emit LockExtended(lockId, oldUnlock, newUnlockTime);
    }

    function withdraw(uint256 lockId) external nonReentrant {
        Lock storage l = locks[lockId];
        require(l.owner == msg.sender, "Not lock owner");
        require(!l.claimed, "Already claimed");
        require(block.timestamp >= l.unlockTime, "Not unlocked");

        l.claimed = true;

        totalLockedPerToken[l.token] -= l.amount;

        IERC20 erc20 = IERC20(l.token);
        require(
            erc20.transfer(msg.sender, l.amount),
            "Withdraw transfer failed"
        );

        emit TokensWithdrawn(lockId, l.token, msg.sender, l.amount);
    }

    function getUserLocks(
        address user
    ) external view returns (uint256[] memory) {
        return userLocks[user];
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(totalLockedPerToken[token] == 0, "Token still locked");
        IERC20(token).transfer(msg.sender, amount);
        emit TokensRescued(token, amount);
    }
}
