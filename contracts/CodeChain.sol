// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract CodeChain {
    struct Commit {
        string message;
        string ipfsHash;
        uint256 parentId;
    }

    struct Branch {
        string name;
        uint256 latestCommitId;
    }

    struct Repository {
        string name;
        uint256 latestCommitId;
        mapping(uint256 => Commit) commits;
        mapping(string => Branch) branches;
        string[] branchNames;
    }

    mapping(string => Repository) repositories;
    string[] public repoNames;

    event RepositoryCreated(string repoName);
    event BranchCreated(string repoName, string branchName);
    event CommitMade(string repoName, string branchName, uint256 commitId, string message, string ipfsHash);

    modifier repoExists(string memory repoName) {
        require(bytes(repositories[repoName].name).length != 0, "Repository does not exist");
        _;
    }

    modifier branchExists(string memory repoName, string memory branchName) {
        require(bytes(repositories[repoName].branches[branchName].name).length != 0, "Branch does not exist");
        _;
    }

    function createRepository(string memory repoName) public {
        require(bytes(repositories[repoName].name).length == 0, "Repository already exists");
        repositories[repoName].name = repoName;
        repositories[repoName].branches["main"].name = "main";  // Default branch
        repositories[repoName].branchNames.push("main");
        repoNames.push(repoName);

        emit RepositoryCreated(repoName);
    }

    function createBranch(string memory repoName, string memory branchName) public repoExists(repoName) {
        require(bytes(repositories[repoName].branches[branchName].name).length == 0, "Branch already exists");
        repositories[repoName].branches[branchName].name = branchName;
        repositories[repoName].branches[branchName].latestCommitId = repositories[repoName].latestCommitId;
        repositories[repoName].branchNames.push(branchName);

        emit BranchCreated(repoName, branchName);
    }

    function commit(string memory repoName, string memory branchName, string memory message, string memory ipfsHash) public repoExists(repoName) branchExists(repoName, branchName) {
        Repository storage repo = repositories[repoName];
        Branch storage branch = repo.branches[branchName];

        uint256 commitId = repo.latestCommitId + 1;
        repo.commits[commitId] = Commit({
            message: message,
            ipfsHash: ipfsHash,
            parentId: branch.latestCommitId
        });

        branch.latestCommitId = commitId;
        repo.latestCommitId = commitId;

        emit CommitMade(repoName, branchName, commitId, message, ipfsHash);
    }


    function getCommit(string memory repoName, uint256 commitId) public view repoExists(repoName) returns (string memory message, string memory ipfsHash, uint256 parentId) {
        Commit storage selectedCommit = repositories[repoName].commits[commitId];
        return (selectedCommit.message, selectedCommit.ipfsHash, selectedCommit.parentId);
    }

    function getLatestCommitId(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (uint256) {
        return repositories[repoName].branches[branchName].latestCommitId;
    }

    function getBranches(string memory repoName) public view repoExists(repoName) returns (string[] memory) {
        return repositories[repoName].branchNames;
    }
    function getLatestIpfsHash(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (string memory) {
    uint256 latestCommitId = repositories[repoName].branches[branchName].latestCommitId;
    return repositories[repoName].commits[latestCommitId].ipfsHash;
    }
}