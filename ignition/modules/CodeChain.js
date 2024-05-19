const { buildModule } = require("@nomicfoundation/hardhat-ignition/modules");

module.exports = buildModule("CodeChainModule", (m) => {
  const codeChain = m.contract("CodeChain");

  return { codeChain };
});

