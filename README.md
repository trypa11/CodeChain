CodeChain 
Git-like application on a Blockchain
App.js->web application that interacts with smart contract
CodeChain.sol->Smart contract


Before you start:
It's requirement to have Node.js and IPFS kubo on your computer

IPFS set up:
ipfs init 
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Origin '["http://localhost:3000"]' 
ipfs config --json API.HTTPHeaders.Access-Control-Allow-Methods '["PUT","POST","GET"]' 
IPFS local node to start:
ipfs daemon

Node.JS set up:
npm install

Hardhat=>

Hardhat download:
npm install hardhat

Hardhat start local Eth-based network:
npx hardhat node

Compile Smart-Contract:
npx hardhat compile 

Deploy the smart contract to the blockchain network
npx hardhat ignition deploy ./ignition/modules/CodeChain.js --network localhost

