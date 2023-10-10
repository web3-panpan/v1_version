require('@nomicfoundation/hardhat-toolbox');
require('@nomiclabs/hardhat-ethers');
let dotenv = require('dotenv');
dotenv.config({ path: "./.env" });

const privatekey = process.env.PRIVATEKEY;
const sepoliakey = process.env.SEPOLIA_API_KEY;
const goerlikey = process.env.GOERLI_API_KEY;
const etherscan_key = process.env.ETHERSCAN_KEY;


module.exports = {
    solidity: "0.8.17",

    networks: {
      hardhat: {
      },
      sepolia: {
        url: "https://eth-sepolia.g.alchemy.com/v2/" + sepoliakey,
        accounts: [privatekey],
        chainId: 11155111,
      },
      goerli: {
        url: "https://goerli.infura.io/v3/" + goerlikey,
        accounts: [privatekey],
        chainId: 5,
      },
    },
    etherscan: {
      apiKey: etherscan_key,
    },
    abiExporter: {
      path: './abi',
      runOnCompile:false,
      clear: true,
      flat: true,
      spacing: 2,
      pretty: true,
    }
};
