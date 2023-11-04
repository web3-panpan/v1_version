// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol"; 

contract VotingContract is ReentrancyGuard,  Pausable, Ownable{

    using SafeMath for uint256;  // 使用SafeMath库来避免溢出

    address public myToken;  // 用于投票的代币地址

    constructor(address _myToken) {
        myToken = _myToken;
    }

    event Received(address caller, uint amount, string message);
    event Deposited(address indexed user, uint amount);
    event Withdrawn(address indexed user, uint amount);
    event Voted(address indexed _address, uint256 indexed _proposalId, uint256 indexed _optionId);
    event OptionRemoved(uint256 indexed proposalId, uint256 indexed optionId);
    event ProposalAdded(uint256 indexed proposalId, string name);

    mapping(uint256 => uint256) public votingEndTimes;  // 投票结束时间
    mapping(address => uint256) public balances;

    // 提案
    struct Proposal {
        uint256 id;
        string name;
    }

    // 提议选项
    struct Option {
        uint256 id;
        string name;
        uint256 voteCount;
    }

    // 投票记录的结构体
    struct VoteRecord {
        uint256 proposalId; // 提案ID
        uint256 optionId;   // 用户选择的选项ID
        uint256 amount;     // 投票数量
    }

    // 用户的投票历史记录映射
    mapping(address => VoteRecord[]) public userVotingHistory;

    uint256 public proposalId;
    mapping(uint256 => uint256) public optionId;  // 输入提案的id 返回的option的长度

    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(uint256 => Option)) public options;  // 输入选项id ， 和提案， 会返回结构体
    mapping(uint256 => mapping(uint256 => uint256)) public optionsCount; // 当前选项的投票

    mapping(address => mapping(uint256 => bool)) public voters; // 这个人是否投票
    mapping(address => uint256) public usedVotingRights; // 已经使用的投票权
    mapping(address => mapping(uint256 => uint256)) public votingRecords; // 投票记录
    mapping(uint256 => mapping(string => bool)) private optionNames;  // 提案的name 不能重复添加提案
    mapping(uint256 => mapping(uint256 => address[])) public optionVoters; // 记录投票的地址

    // 添加提案
    function addProposal(string memory _name) public onlyOwner {
        proposalId++;
        proposals[proposalId] = Proposal(proposalId, _name);
        emit ProposalAdded(proposalId, _name);
    }

    // 添加选项到已存在的提案
    function addOptions(uint256 _proposalId, string memory _name) public onlyOwner {
        require(!optionNames[_proposalId][_name], "Option with this name already exists for this proposal");
        uint256 proposalOptionId = optionId[_proposalId].add(1);   // 添加option的数量
        options[_proposalId][proposalOptionId] = Option(proposalOptionId, _name, 0); //添加的选项
        optionId[_proposalId] = proposalOptionId;
        optionNames[_proposalId][_name] = true;
    }
    
    // 在链上删除操作也很浪费gas 不要使用
    function removeOption(uint256 _proposalId, uint256 _optionId) public onlyOwner {
        require(_proposalId > 0 && _proposalId <= proposalId, "Invalid proposal ID");
        require(_optionId > 0 && _optionId <= optionId[_proposalId], "Invalid option ID");
        
        string memory optionName = options[_proposalId][_optionId].name;
        delete options[_proposalId][_optionId];
        delete optionNames[_proposalId][optionName];
        optionId[_proposalId] = optionId[_proposalId].sub(1);
        emit OptionRemoved(_proposalId, _optionId);
    }

    // 检查某个地址是否已经对某个提案投过票   
    function hasVoted(address voter, uint256 _proposalId) public view returns (bool) {
        return voters[voter][_proposalId];
    }

    // 设置提案的投票结束时间， 直接写时间就可以了
    function setVotingDuration(uint256 _proposalId, uint256 _durationInSeconds) public onlyOwner {
        require(_proposalId > 0 && _proposalId <= proposalId, "Invalid proposal ID");
        require(_durationInSeconds > 0, "Duration should be greater than 0");
        uint256 end_time = block.timestamp + _durationInSeconds;
        votingEndTimes[_proposalId] = end_time;
    }  

    // 投票
    function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount) public whenNotPaused{
        require(block.timestamp < votingEndTimes[_proposalId], "Voting has ended for this proposal");
        require(_proposalId > 0 && _proposalId <= proposalId, "The proposal does not exist");
        require(_optionId > 0 && _optionId <= optionId[_proposalId], "The option does not exist");
        
        uint256 remainingVotingRights = balances[msg.sender].sub(usedVotingRights[msg.sender]);
        require(remainingVotingRights >= _amount, "Insufficient voting rights");

        usedVotingRights[msg.sender] = usedVotingRights[msg.sender].add(_amount);
        optionsCount[_proposalId][_optionId] = optionsCount[_proposalId][_optionId].add(_amount);
        options[_proposalId][_optionId].voteCount = options[_proposalId][_optionId].voteCount.add(_amount);
        votingRecords[msg.sender][_proposalId] = votingRecords[msg.sender][_proposalId].add(_amount);
        voters[msg.sender][_proposalId] = true;
        optionVoters[_proposalId][_optionId].push(msg.sender);

        userVotingHistory[msg.sender].push(VoteRecord(_proposalId, _optionId, _amount));
        emit Voted(msg.sender, _proposalId, _optionId);
    }

    // Update in deposit function
    function deposit(uint256 amount) public {
        require(
            IERC20(myToken).transferFrom(msg.sender, address(this), amount),
            "Transfer failed"
        );
        balances[msg.sender] = balances[msg.sender].add(amount);
        emit Deposited(msg.sender, amount);
    }

    // Get the balance of the contract itself in MyToken
    function getContractBalance() public view returns (uint) {
        return IERC20(myToken).balanceOf(address(this));
    }

    // Update in withdraw function
    function withdraw(uint256 _amount) public nonReentrant {

        uint256 availableAmount = balances[msg.sender].sub(usedVotingRights[msg.sender]);
        require(availableAmount >= _amount, "Not enough unlocked tokens");
        
        // Now you can proceed with the withdrawal
        require(IERC20(myToken).transfer(msg.sender, _amount), "Transfer failed");
        balances[msg.sender] = balances[msg.sender].sub(_amount);
        emit Withdrawn(msg.sender, _amount); // 添加事件
    }

    // 在智能合约中的示例函数，用于接收链下处理的结果并分配奖励
    function distributeRewards(address[] memory correctVoters,address[] memory incorrectVoters, uint256 _proposalId) public onlyOwner {
        // 这里，你可以根据需要处理这些地址，例如分配奖励等
        for (uint256 i = 0; i < correctVoters.length; i++) {
            // 处理正确投票的地址
            address winner = correctVoters[i];
            uint256 send_value = votingRecords[winner][_proposalId];
            // 解锁
            usedVotingRights[winner] = usedVotingRights[winner].sub(send_value);
            // 执行奖励的逻辑
            balances[winner] = balances[winner].add(send_value);
        }

        for (uint256 i = 0; i < incorrectVoters.length; i++) {
            // 处理错误投票的地址
            address loser = incorrectVoters[i];
            uint256 send_value = votingRecords[loser][_proposalId];
            // 解锁
            require(usedVotingRights[loser] >= send_value, "Invalid state: send_value exceeds usedVotingRights");
            usedVotingRights[loser] = usedVotingRights[loser].sub(send_value);
            // 执行惩罚的逻辑
            balances[loser] = balances[loser].sub(send_value);
        }
    }
    // Ethereum智能合约中，没有自动执行代码的机制， 需要外部的调用这个函数
    function reclaimVotingRights(uint256 _proposalId, uint256 correctOptionId) public onlyOwner {
        require(block.timestamp > votingEndTimes[_proposalId], "Proposal voting has not ended yet");

        // 解锁并重置投票了正确选项的地址的记录
        address[] memory correctVoters = optionVoters[_proposalId][correctOptionId];
        for (uint256 i = 0; i < correctVoters.length; i++) {
            address voter = correctVoters[i];
            uint256 amount = votingRecords[voter][_proposalId];

            usedVotingRights[voter] = usedVotingRights[voter].sub(amount);
            votingRecords[voter][_proposalId] = 0;
            voters[voter][_proposalId] = false;
        }
        // 处理投了错误选项的地址，你可以类似地遍历其他的`optionVoters[_proposalId][otherOptionId]`。
    }

    function getUserVotingHistory(address _user)
        public
        view
        returns (
            uint256[] memory proposalIds,
            uint256[] memory optionIds,
            uint256[] memory amounts
        )
    {
        VoteRecord[] storage records = userVotingHistory[_user];
        proposalIds = new uint256[](records.length);
        optionIds = new uint256[](records.length);
        amounts = new uint256[](records.length);

        for (uint256 i = 0; i < records.length; i++) {
            proposalIds[i] = records[i].proposalId;
            optionIds[i] = records[i].optionId;
            amounts[i] = records[i].amount;
        }
    }
     

    function pause() public onlyOwner {
        _pause();
    }

    function unpause() public onlyOwner {
        _unpause();
    }

}


