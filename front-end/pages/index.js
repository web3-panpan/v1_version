
import { useState, useEffect } from 'react'
import { ethers } from 'ethers';

function Home() {

    const PERMITTOKENCONTRACT_ADDRESS = '0x4b667B0E205CAdE9C8A6C57a7aCEdFFFF183EA67';   // address of token
    const SPENDERCONTRACT_ADDRESS = "0xd58294b002eB80c50588ad796Af33627D9cF27ae";  // 质押投票的合约地址

    const permitTokenContractAbi = [
        "function name() view returns (string)",
        "function nonces(address owner) view returns (uint256)",
        "function balanceOf(address account) view  returns (uint256)",
        "function permit(address owner, address spender, uint256 value, uint256 deadline,uint8 v,bytes32 r, bytes32 s)",
        "function allowance(address owner, address spender) public view  returns (uint256)",
        "function approve(address spender, uint256 amount) public returns (bool)",
        "function mint(address to, uint256 amount) public",  // mint代币， 这个不要放在前端， 可以放到管理员的页面

    ];
    const spenderContractAbi = [
        "function deposit(uint256 amount)",
        "function getContractBalance() public view returns(uint)",  // 获得当前合约的总余额
        "function withdraw(uint256 amount)",
        "function balances(address _address) public view returns (uint256)",  // 获取当前账户的在这个合约质押了多少， 就是小狐狸钱包
        "function addProposal(string _name)",       // 添加提案， 必须是管理员才可以添加
        "function optionId(uint256 _proposalId) view returns (uint256)",  // 输入提案的id 返回的option的长度. 感觉没有什么用！！！
        "function addOptions(uint256 _proposalId, string _name)",  // 增加提案的选项， 输入提案id uint， 输入选项string
        "function options(uint256 _proposalId, uint256 _optionId) view returns (uint256 id, string name, uint256 voteCount)", // 输入选项id ， 和提案， 会返回结构体  结构体的信息是 id name vote 投票的数量
        "function proposals(uint256 _proposalId) view returns (uint256 id, string name)",  // 返回提案的id 和 名字
        "function vote(uint256 _proposalId, uint256 _optionId, uint256 _amount) public ", // 投票
        "function optionsCount(uint256, uint256) view returns (uint256)",   // 当前选项的投票
        "function usedVotingRights(address _address) public view returns (uint256)",  // 当前账户已经使用的投票权
        "function votingRecords(address _address, uint256 _proposalId) public view returns (uint256)",  // 投票记录
        "function setVotingDuration(uint256 _proposalId, uint256 _durationInSeconds)",  // 设置投票的时间, 输入秒 
        "function votingEndTimes(uint256) view returns (uint256)",   //  返回的是block时间
        "function reclaimVotingRights(uint256 _proposalId, uint256 correctOptionId) public", // 重置投票， 以后可能会改成投票奖励余惩罚机制
        "event ProposalAdded(uint256 indexed proposalId, string name)",
        "function proposalId() view returns (uint256)"  // 一共设置了多少个提案
        // 在这里添加其它必要的ABI项
    ];

    const [provider, setProvider] = useState(); // provider是变量， setProvider 是函数
    const [account, setAccount] = useState();
    const [signer, setSigner] = useState();
    const [account_value, set_account_value] = useState();  // 当前账户在合约的余额
    const [min_amount, set_minAmount] = useState("0.01");   
    const [balance, setBalance] = useState();
    const [allowance, setAllowance] = useState();
    const [depositAmount, setDepositAmount] = useState("0"); // 初始化为字符串 "0"
    const [withdrawAmount, setWithdrawAmount] = useState("0"); // 初始化为字符串 "0"
    const [contractBalance, setContractBalance] = useState("0");
    const [MintAmount, setMintAmount] = useState("0");
    const [proposalId, setProposalId] = useState();     // 设置提案的id
    const [duration, setDuration] = useState("3600");  // 设置提案的持续时间

    // 增加提案
    const [proposalText, setProposalText] = useState("");
    // 增加选项
    const [proposalID, setProposalID] = useState("");
    const [optionText, setOptionText] = useState("");
    // 投票栏
    const [voteProposalID, setVoteProposalID] = useState(""); // 投票栏的提案
    const [voteOptionID, setVoteOptionID] = useState("");   // 投票栏的选项option
    const [voteAmount, setVoteAmount] = useState("");       // 投了多少票

    const [queryProposalID, setQueryProposalID] = useState('');  // 查询， 直接输入uint
    const [reclaimvote, setreclaimvotet] = useState("");
    const [reclaimvote_id, setreclaimvote_id] = useState("");

    // 点击按钮的时候登录
    const connectOnclick = async () => {
        if (!window.ethereum) return;
    
        const providerWeb3 = new ethers.providers.Web3Provider(window.ethereum);
        setProvider(providerWeb3);
    
        const currenAccount = await providerWeb3.send("eth_requestAccounts", []);
        setAccount(currenAccount[0]);
        setSigner(providerWeb3.getSigner(currenAccount[0]));
    
        ethereum.on("accountsChanged", accountsChange => {
          setAccount(accountsChange[0]);
          setSigner(providerWeb3.getSigner(accountsChange[0]));
        });
      };
    
 
      useEffect(() => {
        if (!window.ethereum || !provider || !account) return;
    
        provider.getBalance(account).then(result => {
          setBalance(ethers.utils.formatEther(result));
        });
      }, [account, provider]);

    useEffect(() => {
        if (!signer) {
            return;
        }
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        // Fetch and set the contract balance
        async function fetchContractBalance() {
            const balance = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(balance));
        }
        fetchContractBalance();
    }, [account_value, signer]);
    
    useEffect(() => {
        if (!signer) return;
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        async function fetchContractBalance() {
          const balance = await contract.getContractBalance();
          setContractBalance(ethers.utils.formatEther(balance));
        }
    
        fetchContractBalance();
      }, [contractBalance, signer]);

    // 授权， 质押代币的时候必须先授权， 才可以发送或者质押
    const approveAndSubmit = async () => {
        try {
            if (!signer) {
                alert("请连接钱包");
                return;
            }
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const _amount = ethers.utils.parseEther(min_amount);
            const approvalTransaction = await permitTokenContract.approve(
                SPENDERCONTRACT_ADDRESS,
                _amount
            );
            await approvalTransaction.wait();
            const allowance = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (!ethers.utils.formatEther(allowance)) {
                alert("授权失败");
                return;
            }
            setAllowance(ethers.utils.formatEther(allowance));
            alert("授权成功");        
        } catch (error) {
            console.error("发生错误:", error);
            alert("发生错误。请查看控制台以获取详细信息。");
        }
    };
    

    const handleDeposit = async (depositAmount) => {
        console.log("handleDeposit 被调用，存款金额为: ", depositAmount);
        if (!signer) return;
        try {
            const permitTokenContract = new ethers.Contract(
                PERMITTOKENCONTRACT_ADDRESS,
                permitTokenContractAbi,
                signer
            );
            const allowance_valued = await permitTokenContract.allowance(account, SPENDERCONTRACT_ADDRESS);
            if (allowance_valued.lt(depositAmount)) {
                alert("allowance_valued 不足");
                return;
            }
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            const tx = await contract.deposit(ethers.utils.parseEther(depositAmount));
            await tx.wait();
            alert("存款成功！");
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };
    

    const handleWithdraw = async (withdrawAmount) => {
        if (!signer) return;
        console.log("handleWithdraw 被调用，撤销金额为: ", withdrawAmount);

        try {
            const contract = new ethers.Contract(
                SPENDERCONTRACT_ADDRESS,
                spenderContractAbi,
                signer
            );
            if (!withdrawAmount || ethers.utils.parseEther(withdrawAmount).lte(0)) {
                alert('提款金额应大于 0');
                console.log("无效的值。");
                return;
            }

            const accountValueInWei = ethers.utils.parseEther(account_value);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei)) {
                alert('提款金额超过账户余额');
                return;
            }

            let used_vote = await contract.usedVotingRights(account);
            if (ethers.utils.parseEther(withdrawAmount).gt(accountValueInWei.sub(used_vote))) {
                alert('在投票中， 投票的余额不能撤销！');
                return;
            }

            const tx = await contract.withdraw(ethers.utils.parseEther(withdrawAmount));
            await tx.wait();
            alert("取款成功！");
            const current_account_value = await contract.balances(account);
            set_account_value(ethers.utils.formatEther(current_account_value));
            const newBalance = await contract.getContractBalance();
            setContractBalance(ethers.utils.formatEther(newBalance));
        } catch (error) {
            console.error("发生错误:", error);
        }
    };
    

    const Mint = async (MintAmount) => {
        if (!signer) return;
        console.log("Mint 的数量为: ", MintAmount);
        const contract = new ethers.Contract(PERMITTOKENCONTRACT_ADDRESS, permitTokenContractAbi, signer);

        // 判断是否有效（大于 0）
        let value = ethers.BigNumber.from(MintAmount);
        if (value.lte(0)) {
            alert('mint value should be more than 0');
            console.log("Invalid Mint.");
            return;
        }

        const pre_balance = await contract.balanceOf(account);
        console.log('mint 前的余额为：', ethers.utils.formatEther(pre_balance));
        console.log("account .-----------", account);

        const tx = await contract.mint(account, value);
        await tx.wait();
        console.log("Invalid Mint.-----------");

        alert("Mint成功！");
    
        const balance = await contract.balanceOf(account);
        console.log('mint 后的余额为：', ethers.utils.formatEther(balance));
    };
  
    const add_pro = async (proposalText) => {
        if (!signer) return;
        console.log("正在增加提案： ", proposalText);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
    
        contract.on("ProposalAdded", (id, name, event) => {
            console.log("New proposal added:");
            console.log("ID:", id.toString());
            console.log("Name:", name);
        });

        try {
            const tx = await contract.addProposal(proposalText);
            await tx.wait();  // Wait for transaction to be mined
            alert('提案增加成功');
        } catch (error) {
            console.error("提案增加失败：", error);
            alert('提案增加失败');
        }
    
        const proposalId = await contract.proposalId();
        const proposal = await contract.proposals(proposalId);
        console.log(`提案的ids是${proposal.id}， 提案的名称为${proposal.name}`);
    };

    const add_op = async (proposalID, optionText) => {
        if (!signer) return;
        
        // Parse the proposalID to integer
        const proposalIDInt = parseInt(proposalID, 10);
        console.log(`正在增加的提案的选项ids是${proposalIDInt}， 提案选项的名称为${optionText}`);
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        let newOptionID;  // Declare newOptionID here
    
        try {
            const tx = await contract.addOptions(proposalIDInt, optionText);
            await tx.wait();  // Wait for transaction to be mined
            alert('提案选项成功增加成功');
            
            // Fetch the new option details and log it
            newOptionID = await contract.optionId(proposalIDInt);  // Assign value here
            const newOption = await contract.options(proposalIDInt, newOptionID);
            console.log('新增的选项是: ', newOption.name);
            console.log('在哪个id: ', newOption.id.toString());  // 将 BigNumber 对象转换为字符串
            console.log('这个选项目前有多少票: ', newOption.voteCount.toString());  // 将 BigNumber 对象转换为字符串
        } catch (error) {
            console.error("提案增加失败：", error);
            alert('提案增加失败');
        }
    
        if (newOptionID) {  // Check if newOptionID has a value
            for (let i = 1; i <= newOptionID; i++) {
                const option = await contract.options(proposalID, i);
                console.log(`选项ID: ${option.id.toString()}, 选项名称: ${option.name}, 投票数: ${option.voteCount.toString()}`);
            }
        }
    };


    const vote = async (voteProposalID, voteOptionID, voteAmount) => {
        if (!signer) return;
    
        // Parse the proposalID and optionID to integers
        const proposalIDInt = parseInt(voteProposalID, 10);
        const optionIDInt = parseInt(voteOptionID, 10);
        const voteAmountInt = ethers.utils.parseEther(voteAmount);  // 显示的是整数， 实际传入的是bignumber
        console.log(`正在投票的提案ID是${proposalIDInt}， 选项ID为${optionIDInt}， 投票数量为${voteAmount}`);
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        const used_vote = await contract.usedVotingRights(account);
        const balance = await contract.balances(account);  // fetch once to avoid multiple calls
    
        if (balance.sub(used_vote).lte(voteAmountInt)){
            console.log('you dont have enough values to vote');
            alert('you dont have enough values to vote');
            return;
        }
    
        try {
            console.log(`当前账户还有${ethers.utils.formatEther(balance) - ethers.utils.formatEther(used_vote)}投票权利， 投票数量为${voteAmount}`);
            const tx = await contract.vote(proposalIDInt, optionIDInt, voteAmountInt);
            await tx.wait();  // Wait for transaction to be mined
            
            alert('投票成功');
    
            // Fetch the updated option details and log it
            const updatedOption = await contract.options(proposalIDInt, optionIDInt);
            console.log('投票的选项是: ', updatedOption.name);
            console.log('在哪个id: ', updatedOption.id.toString());  // Convert BigNumber object to string
            console.log('这个选项现在有多少票: ', ethers.utils.formatEther(updatedOption.voteCount));  // Convert BigNumber object to string，
            
        } catch (error) {
            console.error("投票失败：", error);
            alert('投票失败');
        }
    
        // Optionally, list all options for the given proposal with updated vote counts
        const optionCount = await contract.optionId(proposalIDInt);
        for (let i = 1; i <= optionCount; i++) {
            const option = await contract.options(proposalIDInt, i);
            console.log(`选项ID: ${option.id.toString()}, 选项名称: ${option.name}, 投票数: ${ethers.utils.formatEther(option.voteCount)}`);
        }
    };
    
    const fetchProposalOptions = async (queryProposalID) => {
        if (!signer) { return; }
        console.log("正在查询提案ID: ", queryProposalID);
    
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        try {
            // 获取选项的数量
            const proposalId = await contract.proposalId();  // fetch once to avoid multiple calls
    
            if (queryProposalID > proposalId.toNumber()){
                console.log('当前提案长度', proposalId.toNumber());
                console.log('没有当前提案');
                return;
            }
    
            const optionsCountBigNumber = await contract.optionId(queryProposalID);
            const optionsCount = optionsCountBigNumber.toNumber();  // 将 BigNumber 转换为数字
            
            console.log("guigui: ", optionsCount);
    
            // 用于存储每个选项的信息
            let optionsInfo = '';
            for (let i = 1; i <= optionsCount; i++) {
                const option = await contract.options(queryProposalID, i);  // 使用 queryProposalID
                optionsInfo += `选项ID: ${option.id.toString()}, 选项名称: ${option.name}, 投票数: ${ethers.utils.formatEther(option.voteCount)}\n`;
            }
    
            // 输出或显示在页面上
            console.log(`提案#${queryProposalID}的选项:\n${optionsInfo}`);  // 使用 queryProposalID
            // 或者你可以在页面上显示
            document.getElementById('output').innerText = `提案#${queryProposalID}的选项:\n${optionsInfo}`;  // 使用 queryProposalID
            
        } catch (error) {
            console.error("查询提案选项失败：", error);
            alert('查询提案选项失败');
        }
    };

    const setVotingDurationForProposal = async (proposalId, duration) => {
        if (!signer) return;
        console.log("为提案设置投票持续时间， 提案ID：", proposalId, "持续时间：", duration, "秒");
        const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
        
        try {
            const tx = await contract.setVotingDuration(proposalId, duration);
            await tx.wait();  
            alert('成功设置投票持续时间');
        } catch (error) {
            console.error("设置投票持续时间失败：", error);
            alert('设置投票持续时间失败');
        }
    
        const endTime = await contract.votingEndTimes(proposalId); // 假设您的合约中有一个叫做votingEndTimes的mapping
        console.log(`提案 ${proposalId} 的投票将在时间戳 ${endTime} 结束`);
    };

    const reclaimVoting = async (reclaimvote, reclaimvote_id) => {
        if (!signer) return;
        try {
            // 创建合约实例
            const contract = new ethers.Contract(SPENDERCONTRACT_ADDRESS, spenderContractAbi, signer);
            // 调用reclaimVotingRights函数
            console.log('------',typeof(reclaimvote))

            const tx = await contract.reclaimVotingRights(reclaimvote, reclaimvote_id);

            // 等待交易被确认
            await tx.wait();
            console.log("Successfully reclaimed voting rights for proposal ID:", proposalId);
            alert('重置成功')
        } catch (error) {
            alert('重置失败， 你不是管理员')
            console.error("Error reclaiming voting rights:", error);

        }
    };
    
    
    
    return (
        <>
            <div className="topnav">
                <a className="nav-link" href="#">Home</a>
                <a className="nav-link" href="#">Article</a>
                <a className="nav-link" href="#">Tag</a>
                <a className="nav-link" href="#">About</a>
                {account ? (
                    <a className="nav-link right" href="#">Connected</a>
                ) : (
                    <a className="nav-link right" href="#" onClick={connectOnclick}>Connect Wallet</a>
                )}
            </div>
            <div className="container">
                <div className="row">
                    <h3 className="site-title">初版</h3>
    
                    <div className="account-info">
                        <h5>账号:{account}</h5>
                        <h5>金额:{balance}</h5>
                        <h5>授权金额:<span className="highlight">{allowance}</span></h5>
                        <h5>合约余额:{contractBalance}</h5>
                    </div>
    
                    <div className="contract-info">
                        <h5>该合约下当前账户余额:{account_value}</h5>
                    </div>
    
                    <button className="button" onClick={approveAndSubmit}>授权</button>
                </div>
    
                <div className="transaction">
                    <h5>Claim</h5>
                    <input 
                        className="input"
                        type="text"
                        value={MintAmount}
                        onChange={e => setMintAmount(e.target.value)}
                        placeholder="Amount to Mint"
                    />
                    <button className="button" onClick={() => Mint(MintAmount)}>Claim</button>
                </div>
    
                <div className="transaction">
                    <h5>Deposit</h5>
                    <input 
                        className="input"
                        type="text"
                        value={depositAmount}
                        onChange={e => setDepositAmount(e.target.value)}
                        placeholder="Amount to deposit"
                    />
                    <button className="button" onClick={() => handleDeposit(depositAmount)}>Deposit</button>
                </div>
    
                <div className="transaction">
                    <h5>Withdraw</h5>
                    <input 
                        className="input"
                        type="text"
                        value={withdrawAmount}
                        onChange={e => setWithdrawAmount(e.target.value)}
                        placeholder="Amount to withdraw"
                    />
                    <button className="button" onClick={() => handleWithdraw(withdrawAmount)}>Withdraw</button>
                </div>
            </div>


            <div className="container">
                <h3 className="site-title">提案系统</h3>

                <div className="proposal-section">
                    <h5>新的提案</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalText}
                        onChange={e => setProposalText(e.target.value)}
                        placeholder="输入提案内容"
                    />
                    <button className="button" onClick={() => {add_pro(proposalText)}}>提交提案</button>
                </div>

                <div className="options-section">
                    <h5>为提案添加选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalID}
                        onChange={e => setProposalID(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={optionText}
                        onChange={e => setOptionText(e.target.value)}
                        placeholder="输入选项内容"
                    />
                    <button className="button" onClick={() => {add_op(proposalID, optionText)}}>添加选项</button>
                </div>

                <div className="options-section">
                    <h5>为提案设置投票持续时间</h5>
                    <input
                        className="input"
                        type="text"
                        value={proposalId}
                        onChange={e => setProposalId(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={duration}
                        onChange={e => setDuration(e.target.value)}
                        placeholder="提案持续时间"
                    />
                    <button className="button" onClick={() => {setVotingDurationForProposal(proposalId, duration)}}>设置时间</button>
                </div>
                
                <div className="voting-section">
                    <h5>投票</h5>
                    <input
                        className="input"
                        type="text"
                        value={voteProposalID}
                        onChange={(e) => setVoteProposalID(e.target.value)}
                        placeholder="投案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteOptionID}
                        onChange={(e) => setVoteOptionID(e.target.value)}
                        placeholder="选项ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={voteAmount}
                        onChange={(e) => setVoteAmount(e.target.value)}
                        placeholder="投票数额"
                    />
                    <button className="button" onClick={() => {vote(voteProposalID,voteOptionID, voteAmount)}}>投票</button>
                </div>

                <div className="proposal-info-section">
                    <h5>查询提案及其选项</h5>
                    <input
                        className="input"
                        type="text"
                        value={queryProposalID}
                        onChange={e => setQueryProposalID(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <button className="button" onClick={() => {fetchProposalOptions(queryProposalID)}}>查询提案</button>

                    <div id="output" className="output">
                    </div>
                </div>

                <div className="proposal-info-section">
                    <h5>重置投票</h5>
                    <input
                        className="input"
                        type="text"
                        value={reclaimvote}
                        onChange={e => setreclaimvotet(e.target.value)}
                        placeholder="输入提案ID"
                    />
                    <input
                        className="input"
                        type="text"
                        value={reclaimvote_id}
                        onChange={e => setreclaimvote_id(e.target.value)}
                        placeholder="输入选项ID"
                    />
                    <button className="button" onClick={() => {reclaimVoting(reclaimvote, reclaimvote_id)}}>重置投票</button>

                    <div id="output" className="output">
                    </div>
                </div>

                </div>



    
            <style jsx>
                {`
                * {
                    box-sizing: border-box;
                    margin: 0;
                    padding: 0;
                }
                body {
                    font-family: Arial, sans-serif;
                    background-color: #f4f4f4;
                }
                .topnav {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                .nav-link {
                    padding: 10px 15px;
                    color: white;
                    text-decoration: none;
                }
                .right {
                    float: right;
                }
                .container {
                    padding: 20px;
                    background-color: white;
                    margin: 20px;
                    border-radius: 8px;
                    box-shadow: 0px 0px 5px #aaa;
                }
                .site-title {
                    text-align: center;
                    font-size: 24px;
                    margin-bottom: 20px;
                }
                .account-info, .contract-info {
                    margin-bottom: 15px;
                }
                .highlight {
                    color: red;
                    font-size: larger;
                }
                .button {
                    background-color: #007BFF;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    text-align: center;
                    cursor: pointer;
                    margin-top: 10px;
                }
                .button:hover {
                    background-color: #0056b3;
                }
                .transaction {
                    margin-top: 20px;
                }
                .input {
                    padding: 10px;
                    width: 200px;
                    margin-right: 10px;
                }
                .footer {
                    background-color: #333;
                    color: white;
                    padding: 15px 0;
                    text-align: center;
                }
                `}
            </style>
        </>
    );
}

export default Home;

