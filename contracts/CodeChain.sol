// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract CodeChain {

    struct Commit {
        string message;
        string ipfsHash;
        uint256 parentId;
        address author;
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
        address[] collaborators;
        mapping(uint256 => uint256) latestPullRequestId ;
    }

    struct PullRequest {
    string fromBranch;
    string toBranch;
    address author;
    uint256 commitId;
    bool status; // true if approved
    address[] approvals;
    }
    mapping(uint256 => PullRequest) public pullRequests;
    uint256 public latestPullRequestId; 

    mapping(string => Repository) public repositories;
    string[] public repoNames;

    event RepositoryCreated(string repoName);
    event BranchCreated(string repoName, string branchName);
    event CommitMade(string repoName, string branchName, uint256 commitId, string message, string ipfsHash);
    event CollaboratorAdded(string repoName, address collaborator);
    event PullRequestCreated(string fromBranch, string toBranch, address author, uint256 commitId);
    event PullRequestApproved(string repoName, uint256 pullRequestId, address approver);

    modifier repoExists(string memory repoName) {
        require(bytes(repositories[repoName].name).length != 0, "Repository does not exist");
        _;
    }

    modifier branchExists(string memory repoName, string memory branchName) {
        require(bytes(repositories[repoName].branches[branchName].name).length != 0, "Branch does not exist");
        _;
    }

    modifier onlyCollaborator(string memory repoName) {
        require(isCollaborator(repoName, msg.sender), "Only collaborators can perform this action");
        _;
    }

    function createRepository(string memory repoName) public {
        require(bytes(repositories[repoName].name).length == 0, "Repository already exists");
        Repository storage repo = repositories[repoName];
        repo.name = repoName;
        repo.branches["main"].name = "main";  // Default branch
        repo.branchNames.push("main");
        repo.latestCommitId = 0;
        repo.collaborators.push(msg.sender);
        repoNames.push(repoName);

        emit RepositoryCreated(repoName);
    }

    function createBranch(string memory repoName, string memory branchName) public repoExists(repoName) onlyCollaborator(repoName) {
        require(bytes(repositories[repoName].branches[branchName].name).length == 0, "Branch already exists");
        Repository storage repo = repositories[repoName];
        repo.branches[branchName].name = branchName;
        repo.branches[branchName].latestCommitId = repo.latestCommitId;
        repo.branchNames.push(branchName);
        emit BranchCreated(repoName, branchName);
    }
    


    function commit(string memory repoName, string memory branchName, string memory message, string memory ipfsHash) public repoExists(repoName) branchExists(repoName, branchName) onlyCollaborator(repoName){
        Repository storage repo = repositories[repoName];
        Branch storage branch = repo.branches[branchName];

        uint256 commitId = repo.latestCommitId + 1;
        Commit storage newCommit = repo.commits[commitId];
        newCommit.message = message;
        newCommit.ipfsHash = ipfsHash;
        newCommit.parentId = branch.latestCommitId;
        newCommit.author = msg.sender;

        branch.latestCommitId = commitId;
        repo.latestCommitId = commitId;

        emit CommitMade(repoName, branchName, commitId, message, ipfsHash);
    }



    function getCommit(string memory repoName, uint256 commitId) public view repoExists(repoName) returns (
        string memory message, 
        string memory ipfsHash, 
        uint256 parentId, 
        address author
    ) 
    {
        Commit storage newCommit = repositories[repoName].commits[commitId];
        return (newCommit.message, newCommit.ipfsHash, newCommit.parentId, newCommit.author);
    }

    function getLatestCommitId(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (uint256) {
        return repositories[repoName].branches[branchName].latestCommitId;
    }

    function getBranches(string memory repoName) public view repoExists(repoName) returns (string[] memory) {
        return repositories[repoName].branchNames;
    }
    function getRepositories() public view returns (string[] memory) {
        return repoNames;
    }

    function getLatestIpfsHash(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (string memory) {
        uint256 latestCommitId = repositories[repoName].branches[branchName].latestCommitId;
        return repositories[repoName].commits[latestCommitId].ipfsHash;
    }

    function addCollaborator(string memory repoName, address user) public payable repoExists(repoName) {
        require(msg.value >= 50, "50 wei required to join as a collaborator");
        Repository storage repo = repositories[repoName];
        require(!isCollaborator(repoName, user), "Address is already a collaborator");

        uint256 numCollaborators = repo.collaborators.length;
        uint256 share = msg.value / numCollaborators;

        for (uint i = 0; i < numCollaborators; i++) {
            payable(repo.collaborators[i]).transfer(share);
        }

        repo.collaborators.push(user);
        emit CollaboratorAdded(repoName, user);
    }



    function isCollaborator(string memory repoName, address user) public view returns (bool) {
        Repository storage repo = repositories[repoName];
        for (uint i = 0; i < repo.collaborators.length; i++) {
            if (repo.collaborators[i] == user) {
                return true;
            }
        }
        return false;
    }

    function getRepositoryInfo(string memory repoName) public view repoExists(repoName) returns (
        string memory name, 
        uint256 latestCommitId, 
        string[] memory branches, 
        address[] memory collaborators
    ) {
        Repository storage repo = repositories[repoName];
        return (repo.name, repo.latestCommitId, repo.branchNames, repo.collaborators);
    }

}

