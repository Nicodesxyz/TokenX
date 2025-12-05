// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiTokenStaking is ReentrancyGuard, Ownable {
    struct Pool {
        bool exists;
        IERC20 stakingToken;
        uint256 rewardRate;          
        uint256 lastUpdateTime;
        uint256 rewardPerTokenStored; 
        uint256 periodFinish;         
        uint256 totalStaked;
    }


    mapping(address => Pool) public pools;

    struct UserData {
        uint256 balance;              
        uint256 rewards;               
        uint256 userRewardPerTokenPaid;
    }


    mapping(address => mapping(address => UserData)) public userData;

    event PoolFunded(
        address indexed stakingToken,
        uint256 rewardAmount,
        uint256 duration,
        uint256 newRewardRate,
        uint256 periodFinish
    );

    event Staked(
        address indexed stakingToken,
        address indexed user,
        uint256 amount
    );

    event Withdrawn(
        address indexed stakingToken,
        address indexed user,
        uint256 amount
    );

    event RewardPaid(
        address indexed stakingToken,
        address indexed user,
        uint256 reward
    );


    function fundRewards(
        address stakingToken,
        uint256 rewardAmount,
        uint256 duration
    ) external nonReentrant {
        require(rewardAmount > 0, "rewardAmount = 0");
        require(duration > 0, "duration = 0");

        Pool storage pool = pools[stakingToken];
        IERC20 token = IERC20(stakingToken);

        require(
            token.transferFrom(msg.sender, address(this), rewardAmount),
            "Transfer failed"
        );


        if (!pool.exists) {
            pool.exists = true;
            pool.stakingToken = token;
        }

 
        _updateReward(stakingToken, address(0));


        uint256 currentTime = block.timestamp;
        if (currentTime >= pool.periodFinish) {

            pool.rewardRate = rewardAmount / duration;
        } else {

            uint256 remaining = pool.periodFinish - currentTime;
            uint256 leftover = remaining * pool.rewardRate;
            uint256 newReward = rewardAmount + leftover;
            pool.rewardRate = newReward / duration;
        }

        pool.lastUpdateTime = currentTime;
        pool.periodFinish = currentTime + duration;

        emit PoolFunded(stakingToken, rewardAmount, duration, pool.rewardRate, pool.periodFinish);
    }



    function stake(address stakingToken, uint256 amount)
        external
        nonReentrant
    {
        require(amount > 0, "stake = 0");
        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded yet");

        _updateReward(stakingToken, msg.sender);

        pool.totalStaked += amount;
        userData[stakingToken][msg.sender].balance += amount;

        require(
            pool.stakingToken.transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );

        emit Staked(stakingToken, msg.sender, amount);
    }

    function withdraw(address stakingToken, uint256 amount)
        external
        nonReentrant
    {
        require(amount > 0, "withdraw = 0");
        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded yet");

        _updateReward(stakingToken, msg.sender);

        UserData storage user = userData[stakingToken][msg.sender];
        require(user.balance >= amount, "insufficient staked balance");

        user.balance -= amount;
        pool.totalStaked -= amount;

        require(
            pool.stakingToken.transfer(msg.sender, amount),
            "Transfer failed"
        );

        emit Withdrawn(stakingToken, msg.sender, amount);
    }

    function getReward(address stakingToken) external nonReentrant {
        Pool storage pool = pools[stakingToken];
        require(pool.exists, "Pool not funded yet");

        _updateReward(stakingToken, msg.sender);

        UserData storage user = userData[stakingToken][msg.sender];
        uint256 reward = user.rewards;
        if (reward > 0) {
            user.rewards = 0;
            require(
                pool.stakingToken.transfer(msg.sender, reward),
                "Reward transfer failed"
            );
            emit RewardPaid(stakingToken, msg.sender, reward);
        }
    }

    function exit(address stakingToken) external {

        uint256 balance = userData[stakingToken][msg.sender].balance;
        if (balance > 0) {
            withdraw(stakingToken, balance);
        }
        getReward(stakingToken);
    }



    function lastTimeRewardApplicable(address stakingToken)
        public
        view
        returns (uint256)
    {
        Pool storage pool = pools[stakingToken];
        uint256 end = pool.periodFinish;
        return block.timestamp < end ? block.timestamp : end;
    }

    function rewardPerToken(address stakingToken)
        public
        view
        returns (uint256)
    {
        Pool storage pool = pools[stakingToken];
        if (pool.totalStaked == 0) {
            return pool.rewardPerTokenStored;
        }

        uint256 timeDelta =
            lastTimeRewardApplicable(stakingToken) - pool.lastUpdateTime;

        return
            pool.rewardPerTokenStored +
            ((timeDelta * pool.rewardRate * 1e18) / pool.totalStaked);
    }

    function earned(address stakingToken, address account)
        public
        view
        returns (uint256)
    {
        Pool storage pool = pools[stakingToken];
        UserData storage user = userData[stakingToken][account];

        uint256 rpt = rewardPerToken(stakingToken);

        uint256 pending = ((user.balance * (rpt - user.userRewardPerTokenPaid)) /
            1e18);

        return user.rewards + pending;
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
}
