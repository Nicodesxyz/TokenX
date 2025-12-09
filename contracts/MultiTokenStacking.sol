// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiTokenStaking is ReentrancyGuard, Ownable {
    constructor(address initialOwner) Ownable(initialOwner) {}

    struct Pool {
        bool exists;
        IERC20 stakingToken;
        uint256 rewardRate;
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored;
        uint256 periodFinish;
        uint256 totalStaked;
    }

    struct UserData {
        uint256 balance;
        uint256 rewards;
        uint256 userRewardPerTokenPaid;
    }

    mapping(address => Pool) public pools;
    mapping(address => mapping(address => UserData)) public userData;

    event PoolFunded(
        address indexed stakingToken,
        uint256 rewardAmount,
        uint256 duration,
        uint256 newRewardRate,
        uint256 periodFinish
    );
    event Staked(address indexed stakingToken, address indexed user, uint256 amount);
    event Withdrawn(address indexed stakingToken, address indexed user, uint256 amount);
    event RewardPaid(address indexed stakingToken, address indexed user, uint256 reward);
    event TokensRescued(address indexed token, uint256 amount);

    function lastTimeRewardApplicable(address stakingToken) public view returns (uint256) {
        uint256 periodFinish = pools[stakingToken].periodFinish;
        if (periodFinish == 0) return block.timestamp;
        return block.timestamp < periodFinish ? block.timestamp : periodFinish;
    }

    function rewardPerToken(address stakingToken) public view returns (uint256) {
        Pool storage pool = pools[stakingToken];
        if (!pool.exists) return 0;
        if (pool.totalStaked == 0) return pool.rewardPerTokenStored;

        uint256 timeDelta = lastTimeRewardApplicable(stakingToken) - pool.lastUpdateTime;
        return pool.rewardPerTokenStored + ((timeDelta * pool.rewardRate * 1e18) / pool.totalStaked);
    }

    function earned(address stakingToken, address account) public view returns (uint256) {
        Pool storage pool = pools[stakingToken];
        UserData storage user = userData[stakingToken][account];

        uint256 rpt = rewardPerToken(stakingToken);
        uint256 pending = (user.balance * (rpt - user.userRewardPerTokenPaid)) / 1e18;

        return user.rewards + pending;
    }

    function getPoolInfo(address stakingToken)
        external
        view
        returns (
            bool exists,
            uint256 rewardRate,
            uint256 lastUpdateTime,
            uint256 rewardPerTokenStored,
            uint256 periodFinish,
            uint256 totalStaked
        )
    {
        Pool storage pool = pools[stakingToken];
        return (
            pool.exists,
            pool.rewardRate,
            pool.lastUpdateTime,
            pool.rewardPerTokenStored,
            pool.periodFinish,
            pool.totalStaked
        );
    }

    function fundRewards(address stakingToken, uint256 rewardAmount, uint256 duration)
        external
        nonReentrant
        onlyOwner
    {
        require(rewardAmount > 0, "rewardAmount = 0");
        require(duration > 0, "duration = 0");

        Pool storage pool = pools[stakingToken];
        IERC20 token = IERC20(stakingToken);

        require(token.transferFrom(msg.sender, address(this), rewardAmount), "Reward transfer failed");

        uint256 currentTime = block.timestamp;

        if (!pool.exists) {
            pool.exists = true;
            pool.stakingToken = token;
            pool.lastUpdateTime = currentTime;
        } else {
            uint256 lastApplicable = lastTimeRewardApplicable(stakingToken);
            if (pool.totalStaked > 0) {
                uint256 timeDelta = lastApplicable - pool.lastUpdateTime;
                pool.rewardPerTokenStored =
                    pool.rewardPerTokenStored +
                    ((timeDelta * pool.rewardRate * 1e18) / pool.totalStaked);
            }
            pool.lastUpdateTime = lastApplicable;
        }

        if (currentTime >= pool.periodFinish) {
            pool.rewardRate = rewardAmount / duration;
        } else {
            uint256 remaining = pool.periodFinish - currentTime;
            uint256 leftover = remaining * pool.rewardRate;
            pool.rewardRate = (rewardAmount + leftover) / duration;
        }

        pool.periodFinish = currentTime + duration;

        emit PoolFunded(stakingToken, rewardAmount, duration, pool.rewardRate, pool.periodFinish);
    }

    function _updateReward(address stakingToken, address account) internal {
        Pool storage pool = pools[stakingToken];
        pool.rewardPerTokenStored = rewardPerToken(stakingToken);
        pool.lastUpdateTime = lastTimeRewardApplicable(stakingToken);

        if (account != address(0)) {
            UserData storage user = userData[stakingToken][account];
            user.rewards = earned(stakingToken, account);
            user.userRewardPerTokenPaid = pool.rewardPerTokenStored;
        }
    }

    function stake(address stakingToken, uint256 amount) external nonReentrant {
        require(amount > 0, "stake = 0");

        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded");

        _updateReward(stakingToken, msg.sender);

        pool.totalStaked += amount;
        userData[stakingToken][msg.sender].balance += amount;

        require(pool.stakingToken.transferFrom(msg.sender, address(this), amount), "Stake transfer failed");

        emit Staked(stakingToken, msg.sender, amount);
    }

    function _withdraw(address stakingToken, address userAddr, uint256 amount) internal {
        require(amount > 0, "withdraw = 0");

        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded");

        _updateReward(stakingToken, userAddr);

        UserData storage user = userData[stakingToken][userAddr];
        require(user.balance >= amount, "withdraw > balance");

        user.balance -= amount;
        pool.totalStaked -= amount;

        require(pool.stakingToken.transfer(userAddr, amount), "Withdraw transfer failed");

        emit Withdrawn(stakingToken, userAddr, amount);
    }

    function withdraw(address stakingToken, uint256 amount) external nonReentrant {
        _withdraw(stakingToken, msg.sender, amount);
    }

    function _getReward(address stakingToken, address userAddr) internal {
        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded");

        _updateReward(stakingToken, userAddr);

        UserData storage user = userData[stakingToken][userAddr];
        uint256 reward = user.rewards;

        if (reward > 0) {
            user.rewards = 0;
            require(pool.stakingToken.transfer(userAddr, reward), "Reward transfer failed");
            emit RewardPaid(stakingToken, userAddr, reward);
        }
    }

    function getReward(address stakingToken) external nonReentrant {
        _getReward(stakingToken, msg.sender);
    }

    function exit(address stakingToken) external nonReentrant {
        uint256 balance = userData[stakingToken][msg.sender].balance;
        if (balance > 0) {
            _withdraw(stakingToken, msg.sender, balance);
        }
        _getReward(stakingToken, msg.sender);
    }

    function rescueTokens(address token, uint256 amount) external onlyOwner {
        require(IERC20(token).transfer(msg.sender, amount), "Rescue failed");
        emit TokensRescued(token, amount);
    }
}
