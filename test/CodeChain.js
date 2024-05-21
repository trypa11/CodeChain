const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CodeChain", function () {
  let CodeChain, codeChain, owner, addr1;

  beforeEach(async function () {
    CodeChain = await ethers.getContractFactory("CodeChain");
    [owner, addr1] = await ethers.getSigners();
    codeChain = await CodeChain.deploy();
  });

  describe("createRepository", function () {
    it("Should create a new repository", async function () {
      await codeChain.connect(owner).createRepository("repo1");
      expect(await codeChain.getBranches("repo1")).to.include("main");
    });
  });

  describe("createBranch", function () {
    it("Should create a new branch in a repository", async function () {
      await codeChain.connect(owner).createRepository("repo1");
      await codeChain.connect(owner).createBranch("repo1", "branch1");
      expect(await codeChain.getBranches("repo1")).to.include("branch1");
    });
  });

  describe("commit", function () {
    it("Should create a new commit in a branch", async function () {
      await codeChain.connect(owner).createRepository("repo1");
      await codeChain.connect(owner).createBranch("repo1", "branch1");
      await codeChain.connect(owner).commit("repo1", "branch1", "message1", "ipfsHash1");
      const latestCommitId = await codeChain.getLatestCommitId("repo1", "branch1");
      const [message, ipfsHash] = await codeChain.getCommit("repo1", latestCommitId);
      expect(message).to.equal("message1");
      expect(ipfsHash).to.equal("ipfsHash1");
    });
  });
});