// staking
// deposit(MyToken) / withdraw(MyToken)

// -user --> deposit --> TinyBank --> transfer(user --> TinyBank)

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
import "./ManagedAccess.sol";
import "./MultiManagedAccess.sol";


//통신을 위해 인터페이스 정의
interface IMyToken {
    function transfer(uint256 amount, address to) external;
    function mint(uint256 amount, address owner) external;
    function transferFrom(address from, address to, uint256 amount) external;
}

contract TinyBank is MultiManagedAccess{
    event Staked(address from, uint256 amount);
    event Withdraw(uint256 amount, address to);

    IMyToken public stakingToken;

    mapping(address => uint256) public lastClaimedBlock;

    uint256 defaultRewardPerBlock = 1 * 10 ** 18; 
    //rewardPerBlock확인을 위해 public으로 변경경
    uint256 public rewardPerBlock;

    mapping(address => uint256) public staked;
    uint256 public totalStaked;

//MultiManagedAccess의 para를 받기 위해 TinyToken 생성자 재정의의
    constructor(
        address _owner,
        address[5] memory _managers,
        IMyToken _stakingToken
    ) MultiManagedAccess(_owner, _managers, 5) {
        stakingToken = _stakingToken;
        rewardPerBlock = defaultRewardPerBlock;
    }


    modifier updateReward(address to) {
        if (staked[to] > 0){
            uint256 blocks = block.number - lastClaimedBlock[to];
            uint256 reward = (blocks * rewardPerBlock * staked[to]) / totalStaked;
            stakingToken.mint(reward, to);
        }
        lastClaimedBlock[to] = block.number;
        _; // 이 modifier 함수를 진행하고 뒤에 쓰는 함수를 삽입하여 실행
    }


    function setRewardPerBlock(uint256 _amount) external onlyAllConfirmed {
        rewardPerBlock = _amount; 
    }

    function stake(uint256 _amount) external updateReward(msg.sender) {
        require(_amount >= 0, "cannot stake 0 amount");
        stakingToken.transferFrom(msg.sender, address(this), _amount);
        staked[msg.sender] += _amount;
        totalStaked += _amount;
        emit Staked(msg.sender, _amount);
    }

    function withdraw(uint256 _amount) external updateReward(msg.sender) {
        require(staked[msg.sender] >= _amount, "insufficient staked token");
        stakingToken.transfer(_amount, msg.sender);
        staked[msg.sender] -= _amount;
        totalStaked -= _amount;
        emit Withdraw(_amount, msg.sender);
    }
}
