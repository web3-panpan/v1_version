
const hre = require("hardhat");

async function main() {
  
  //部署PermitTokenContract合约
  const PermitTokenContract = await hre.ethers.getContractFactory("V1_Token");
  const permitTokenContract = await PermitTokenContract.deploy();
  await permitTokenContract.deployed();
  console.log("permitTokenContract deployed to:", permitTokenContract.address);

  //部署SpenderContract合约
  const SpenderContract = await hre.ethers.getContractFactory("VotingContract");
  const spenderContract = await SpenderContract.deploy(permitTokenContract.address);
  await spenderContract.deployed();
  console.log("SpenderContract deployed to:", spenderContract.address);

}


main();
