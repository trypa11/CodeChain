const { expect } = require("chai");

describe("CodeChain", function () {
  let CodeChain, codeChain, owner, addr1, addr2;

  beforeEach(async function () {
    CodeChain = await ethers.getContractFactory("CodeChain");
    [owner, addr1, addr2, ...addrs] = await ethers.getSigners();
    codeChain = await CodeChain.deploy(1, owner.address, "Qm...");
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await codeChain.ownerId()).to.equal(owner.address);
    });

    it("Should set the right projectId", async function () {
      expect(await codeChain.projectId()).to.equal(1);
    });

    it("Should set the right IPFS hash", async function () {
      expect(await codeChain.getIPFSHash()).to.equal("Qm...");
    });
  });

  describe("setIPFSHash", function () {
    it("Should set the IPFS hash", async function () {
      await codeChain.connect(owner).setIPFSHash("QmNewHash");
      expect(await codeChain.getIPFSHash()).to.equal("QmNewHash");
    });

    it("Should fail if someone else tries to set the IPFS hash", async function () {
      await expect(codeChain.connect(addr1).setIPFSHash("QmNewHash")).to.be.revertedWith("Only the owner can set the IPFS hash");
    });
  });

  describe("getIPFSHash", function () {
    it("Should return the IPFS hash", async function () {
      expect(await codeChain.getIPFSHash()).to.equal("Qm...");
    });

    it("Should fail if someone else tries to get the IPFS hash", async function () {
      await expect(codeChain.connect(addr1).getIPFSHash()).to.be.revertedWith("Only the owner can set the IPFS hash");
    });
  });
});
