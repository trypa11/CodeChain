pragma solidity ^0.8.0;

import "hardhat/console.sol";


contract CodeChain {
    string ipfsHash;
    uint256 public projectId;
    address public ownerId;

    function setIPFSHash(string memory _hash) public {
        require(msg.sender == ownerId, "Only the owner can set the IPFS hash");
        ipfsHash = _hash;
    }

    function getIPFSHash() public view returns (string memory) {
        require(msg.sender == ownerId, "Only the owner can set the IPFS hash");
        return ipfsHash;
    }

    function setProjectId(uint256 _projectId) public {
        require(msg.sender == ownerId, "Only the owner can set the project id");
        projectId = _projectId;
    }

    function getProjectId() public view returns (uint256) {
        require(msg.sender == ownerId, "Only the owner can get the project id");
        return projectId;
    }

    function setOwnerId(address _ownerId) public {
        ownerId = _ownerId;
    }

    function getOwnerId() public view returns (address) {
        return ownerId;
    }
}