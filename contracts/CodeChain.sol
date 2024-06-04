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
        string description;
        uint256 latestCommitId;
        mapping(uint256 => Commit) commits;
        mapping(string => Branch) branches;
        string[] branchNames;
        address[] collaborators;
        mapping(uint256 => PullRequest) pullRequests;
        bool isPrivate ;
    }

    struct PullRequest {
        string fromBranch;
        string toBranch;
        address author;
        uint256 commitId;
        bool status; // true if approved
        address[] approvals;
    }

    mapping(string => Repository) public repositories;
    string[] public repoNames;
    uint256 public latestPullRequestId=0;

    event RepositoryCreated(string repoName);
    event BranchCreated(string repoName, string branchName);
    event CollaboratorAdded(string repoName, address collaborator);
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

    modifier isRepoPrivate(string memory repoName) {
        require(repositories[repoName].isPrivate, "Repository is not private");
        _;
    }

    function createRepository(string memory repoName) public {
        require(bytes(repositories[repoName].name).length == 0, "Repository already exists");
        Repository storage repo = repositories[repoName];
        repo.name = repoName;
        repo.description = "";
        repo.branches["main"].name = "main";  // Default branch
        repo.branchNames.push("main");
        repo.latestCommitId = 0;
        repo.collaborators.push(msg.sender);
        repoNames.push(repoName);
        repo.isPrivate = true;

        emit RepositoryCreated(repoName);
    }

    function setRepositoryPublic(string memory repoName) public repoExists(repoName) onlyCollaborator(repoName) {
        Repository storage repo = repositories[repoName];
        if (repo.isPrivate==true) {
            repo.isPrivate = false;
        }else {
            repo.isPrivate = true;
        }
    }

    function createBranch(string memory repoName, string memory branchName) public repoExists(repoName) onlyCollaborator(repoName) {
        require(bytes(repositories[repoName].branches[branchName].name).length == 0, "Branch already exists");
        Repository storage repo = repositories[repoName];
        repo.branches[branchName].name = branchName;
        repo.branches[branchName].latestCommitId = repo.latestCommitId;
        repo.branchNames.push(branchName);
        emit BranchCreated(repoName, branchName);
    }

    function commit(string memory repoName, string memory branchName, string memory message, string memory ipfsHash) public repoExists(repoName) branchExists(repoName, branchName) onlyCollaborator(repoName) {
        Repository storage repo = repositories[repoName];
        Branch storage branch = repo.branches[branchName];

        // Check if the branch is the main branch and there are more than 2 collaborators
        if (keccak256(abi.encodePacked(branchName)) == keccak256(abi.encodePacked("main")) && repo.collaborators.length > 2) {
            revert("Cannot commit directly to main branch");
        }

        uint256 commitId = repo.latestCommitId + 1;
        Commit storage newCommit = repo.commits[commitId];
        newCommit.message = message;
        newCommit.ipfsHash = ipfsHash;
        newCommit.parentId = branch.latestCommitId;
        newCommit.author = msg.sender;

        branch.latestCommitId = commitId;
        repo.latestCommitId = commitId;
    }

function createPullRequest(string memory repoName, string memory fromBranch, string memory toBranch) public repoExists(repoName) branchExists(repoName, fromBranch) branchExists(repoName, toBranch) onlyCollaborator(repoName) {
    Repository storage repo = repositories[repoName];

    latestPullRequestId++;
    PullRequest storage newPullRequest = repo.pullRequests[latestPullRequestId];
    newPullRequest.fromBranch = fromBranch;
    newPullRequest.toBranch = toBranch;
    newPullRequest.author = msg.sender;
    newPullRequest.commitId = repo.branches[fromBranch].latestCommitId;
    newPullRequest.status = false;

}


    function approvePullRequest(string memory repoName, uint256 pullRequestId) public repoExists(repoName) onlyCollaborator(repoName) {
        Repository storage repo = repositories[repoName];
        require(pullRequestId <= latestPullRequestId, "Invalid pull request id");
        PullRequest storage pullRequest = repo.pullRequests[pullRequestId];
        require(!pullRequest.status, "Pull request already merged");
        for (uint i = 0; i < pullRequest.approvals.length; i++) {
            require(pullRequest.approvals[i] != msg.sender, "Pull request already approved by the caller");
        }

        pullRequest.approvals.push(msg.sender);
        //if its approved by all collaborators except the author
        if (pullRequest.approvals.length == repo.collaborators.length - 1 && msg.sender != pullRequest.author) {
            pullRequest.status = true;
            mergePullRequest(repoName, pullRequestId);
        }

        emit PullRequestApproved(repoName, pullRequestId, msg.sender);
    }

    function mergePullRequest(string memory repoName, uint256 pullRequestId) public repoExists(repoName) onlyCollaborator(repoName) {
        Repository storage repo = repositories[repoName];
        require(pullRequestId <= latestPullRequestId, "Invalid pull request id");
        PullRequest storage pullRequest = repo.pullRequests[pullRequestId];
        require(pullRequest.status, "Pull request not approved");

        Branch storage toBranch = repo.branches[pullRequest.toBranch];
        toBranch.latestCommitId = pullRequest.commitId;

        delete repo.pullRequests[pullRequestId];
    }

    function getCommit(string memory repoName, uint256 commitId) public view repoExists(repoName) returns (
        string memory message, 
        string memory ipfsHash, 
        uint256 parentId, 
        address author
    ) {
        Commit storage newCommit = repositories[repoName].commits[commitId];
        return (newCommit.message, newCommit.ipfsHash, newCommit.parentId, newCommit.author);
    }

    function getLatestCommitId(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (uint256) {
        return repositories[repoName].branches[branchName].latestCommitId;
    }

    function getBranches(string memory repoName) public view repoExists(repoName) returns (string[] memory) {
        return repositories[repoName].branchNames;
    }

    function getPublicRepositories() public view returns (string[] memory) {
        string[] memory publicRepos = new string[](repoNames.length);
        uint256 count = 0;
        for (uint i = 0; i < repoNames.length; i++) {
            if (repositories[repoNames[i]].isPrivate==false) {
                publicRepos[count] = repoNames[i];
                count++;
            }
        }
        string[] memory trimmedPublicRepos = new string[](count);
        for (uint j = 0; j < count; j++) {
            trimmedPublicRepos[j] = publicRepos[j];
        }
        return trimmedPublicRepos;
    }

    function getLatestIpfsHash(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (string memory) {
        uint256 latestCommitId = repositories[repoName].branches[branchName].latestCommitId;
        return repositories[repoName].commits[latestCommitId].ipfsHash;
    }

    function addCollaborator(string memory repoName) public payable repoExists(repoName) {
        require(msg.value >= 100, "100 wei required to join as a collaborator");
        Repository storage repo = repositories[repoName];
        require(!isCollaborator(repoName, msg.sender), "Address is already a collaborator");

        uint256 numCollaborators = repo.collaborators.length;
        uint256 share = msg.value / numCollaborators;

        for (uint i = 0; i < numCollaborators; i++) {
            payable(repo.collaborators[i]).transfer(share);
        }

        repo.collaborators.push(msg.sender);
        emit CollaboratorAdded(repoName, msg.sender);
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

    function getRepositoryInfo(string memory repoName) public view repoExists(repoName)  returns (
        string memory name, 
        string memory description,
        uint256 latestCommitId, 
        string[] memory branchNames, 
        address[] memory collaborators
    ) {
        Repository storage repo = repositories[repoName];
        return (repo.name,repo.description ,repo.latestCommitId, repo.branchNames, repo.collaborators);
    }

    function getPullRequestInfo(string memory repoName, uint256 pullRequestId) public view repoExists(repoName) returns (
        string memory fromBranch, 
        string memory toBranch, 
        address author, 
        uint256 commitId, 
        bool status, 
        address[] memory approvals
    ) {
        PullRequest storage pullRequest = repositories[repoName].pullRequests[pullRequestId];
        return (pullRequest.fromBranch, pullRequest.toBranch, pullRequest.author, pullRequest.commitId, pullRequest.status, pullRequest.approvals);
    }


    function getActivePullRequests(string memory repoName) public view repoExists(repoName) returns (uint256[] memory) {
        uint256 count = 0;
        for (uint i = 1; i <= latestPullRequestId; i++) {
            if (bytes(repositories[repoName].pullRequests[i].fromBranch).length != 0) {
                count++;
            }
        }
        uint256[] memory activePullRequests = new uint256[](count);
        uint256 index = 0;
        for (uint j = 1; j <= latestPullRequestId; j++) {
            if (bytes(repositories[repoName].pullRequests[j].fromBranch).length != 0) {
                activePullRequests[index] = j;
                index++;
            }
        }
        return activePullRequests;
    } 
    //get branch info 
    function getBranchInfo(string memory repoName, string memory branchName) public view repoExists(repoName) branchExists(repoName, branchName) returns (
        string memory name, 
        uint256 latestCommitId
    ) {
        Branch storage branch = repositories[repoName].branches[branchName];
        return (branch.name, branch.latestCommitId);
    }
    function setRepoDescription(string memory repoName, string memory description) public repoExists(repoName) onlyCollaborator(repoName) {
        Repository storage repo = repositories[repoName];
        repo.description = description;
    }
    function getCollaboratorRepositories(address user) public view returns (string[] memory) {
        string[] memory collaboratorRepos = new string[](repoNames.length);
        uint256 count = 0;
        for (uint i = 0; i < repoNames.length; i++) {
            if (isCollaborator(repoNames[i], user)) {
                collaboratorRepos[count] = repoNames[i];
                count++;
            }
        }
        string[] memory trimmedCollaboratorRepos = new string[](count);
        for (uint j = 0; j < count; j++) {
            trimmedCollaboratorRepos[j] = collaboratorRepos[j];
        }
        return trimmedCollaboratorRepos;
    }
    //return the id of the latest pull request id number 
    function getLatestPullRequestId() public view returns (uint256) {
        return latestPullRequestId;
    }
}


