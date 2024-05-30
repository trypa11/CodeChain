import React, { useState } from 'react';
import { create } from 'kubo-rpc-client';

import CodeChain from './artifacts/contracts/CodeChain.sol/CodeChain.json';


const { ethers } = require("ethers");
const ipfsClient = create({ host: 'localhost', port: 5001, protocol: 'http' });


function App() {
  const [uploading, setUploading] = useState(false);
  const [authenticated, setAuthenticated] = useState(false); 
  const [account, setAccount] = useState(''); 
  const [contract, setContract] = useState(null); 
  const [repoDetails, setRepoDetails] = useState(null);
  const [dirIpfsHash, setDirIpfsHash] = useState('');
  const [latestIpfsHash, setLatestIpfsHash] = useState('');
  let signer = null;
  let provider;

  //authenticating the user
  const authenticate = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", []);
        const account = accounts[0];
        console.log('Authenticated with account:', account);
        setAuthenticated(true);
        setAccount(account); // Set account state
        //
        signer = await provider.getSigner();
        const codeContract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", CodeChain.abi, signer);
        setContract(codeContract);
        console.log('Authenticated with account:', account);
      } catch (error) {
        // User denied account access...
        console.error("User denied account access");
      }
    } else {
      // If no injected web3 instance is detected, display an error
      console.error('Metamask not detected');
    }
  };
  const handleInit = async () => {
    const repoName = prompt('Enter the name of the repository');
    try {
      await contract.createRepository(repoName);
      console.log('Created repository:', repoName);
    }
    catch (error) {
      console.error('Error initializing contract:', error);
    }
  };

  const handleUpload = async () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.webkitdirectory = true;
    fileInput.directory = '';
    fileInput.style.display = 'none';
  
    fileInput.addEventListener('change', async (event) => {
      const files = event.target.files;
      const filesArray = Array.from(files);
      
      // Structure to maintain the directory hierarchy
      const directoryStructure = filesArray.reduce((acc, file) => {
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop(); // remove the file name
        acc[file.webkitRelativePath] = pathParts.join('/');
        return acc;
      }, {});
  
      // Upload each file to IPFS
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const dirPath = directoryStructure[file.webkitRelativePath];
        
        // Add the file to IPFS under the correct directory
        const content = await file.arrayBuffer(); // get file content as ArrayBuffer
        await ipfsClient.files.write(`/${dirPath}/${file.name}`, content, { create: true, parents: true });
      }
  
      // Get the IPFS hash of the local parent directory
      const parentDir = directoryStructure[filesArray[0].webkitRelativePath];
      const ipfsHash = await ipfsClient.files.stat(`/${parentDir}`);
      
      console.log('IPFS Hash:', ipfsHash.cid.toString());
      setDirIpfsHash(ipfsHash.cid.toString());
    });
  
    fileInput.click();
  };
  const commit = async () => {
    const repoName = prompt('Enter the name of the repository');
    const branchName = prompt('Enter the name of the branch');
    const message = prompt('Enter the commit message');
    try {
      provider = new ethers.BrowserProvider(window.ethereum)
      signer = await provider.getSigner();
      
      const ipfsHash = dirIpfsHash;
  
      await contract.commit(repoName, branchName, message, ipfsHash);
      console.log('Commit made to repository:', repoName);
    }
    catch (error) {
      console.error('Error making commit:', error);
    }
  };

  
  const publish = async () => {
    provider = new ethers.BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    const repoName = prompt('Enter the name of the repository');

    await contract.getRepositoryPublic(repoName);
  }


  const viewRepo = async () => {
    const repoName = prompt('Enter the name of the repository');
    try {
      const repoDetails=await contract.getRepositoryInfo(repoName);
      console.log('Repository details:', repoDetails);
      setRepoDetails(repoDetails);
    }
    catch (error) {
      console.error('Error fetching repository details:', error);
    }
  };

  




  const clone = async () => {
    try {
      const repoName = prompt('Enter the name of the repository');
      if (!repoName) {
        console.error('Repository name is required');
        return;
      }
      const branchName = prompt('Enter the name of the branch');
      if (!branchName) {
        console.error('Branch name is required');
        return;
      }
  
      const hash = await contract.getLatestIpfsHash(repoName, branchName);
      console.log('Latest commit IPFS hash:', hash);

    } catch (error) {
      console.error('Error downloading folder:', error);
    }
  };

   const joinAsCollaborator = async () => {
    const repoName = prompt('Enter the name of the repository');
    if (!repoName) {
      console.error('Repository name is required');
      return;
    }
    const etherAmount = prompt('Enter the amount of ether to send');

  
    try {
      const signer = await provider.getSigner();

      const txOptions = {
        value: ethers.parseEther(etherAmount)
      };
  
      const tx = await contract.connect(signer).addCollaborator(repoName, txOptions);
      await tx.wait();
  
      console.log('Joined as collaborator for repository:', repoName);
    } catch (error) {
      console.error('Error joining as collaborator:', error);
    }
  };
  const getLatestIpfsHash = async () => {
    const repoName = prompt('Enter the name of the repository');
    const branchName = prompt('Enter the name of the branch');
    const ipfsHash = await contract.getLatestIpfsHash(repoName, branchName);
    setLatestIpfsHash(ipfsHash);
  };
  const createBranch = async () => {
    const repoName = prompt('Enter the name of the repository');
    const branchName = prompt('Enter the name of the branch');
    try {
      await contract.createBranch(repoName, branchName);
      console.log('Created branch for repository:', repoName);
    }
    catch (error) {
      console.error('Error creating branch:', error);
    }
  };
  const createPullRequest = async () => {
    const repoName = prompt('Enter the name of the repository');
    const fromBranch = prompt('Enter the name of the from branch');
    const toBranch = prompt('Enter the name of the to branch');
    const commitId = prompt('Enter the commit id');
    try {
      await contract.createPullRequest(repoName, fromBranch, toBranch, commitId);
      console.log('Created pull request for repository:', repoName);
    }
    catch (error) {
      console.error('Error creating pull request:', error);
    }
  };
  
  const approvePullRequest = async () => {
    const repoName = prompt('Enter the name of the repository');
    const pullRequestId = prompt('Enter the pull request id');
    try {
      await contract.approvePullRequest(repoName, pullRequestId);
      console.log('Approved pull request for repository:', repoName);
    }
    catch (error) {
      console.error('Error approving pull request:', error);
    }
  };



  return (
    <div className="App">
      <header className="App-header">
        <p>Click the button to upload files</p>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '1em' }}>
          {account}
        </div>
        <button onClick={viewRepo} disabled={!authenticated}>View Repo</button>
        {repoDetails && (
          <div>
            <h2>Repository Details</h2>
            <p>Name: {repoDetails[0]}</p>
            <p>Latest Commit ID: {repoDetails[1]}</p>
            <p>Branches: {repoDetails[2].join(', ')}</p>
            <p>Collaborators: {repoDetails[3].join(', ')}</p>
          </div>
        )}
        <button onClick={authenticate}>Connect MetaMask</button> 
        <button onClick={clone} disabled={!authenticated}>Clone</button>
        <button onClick={handleUpload} disabled={!authenticated || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={getLatestIpfsHash} disabled={!authenticated}>Get Latest IPFS Hash</button>
      <p>Latest IPFS Hash: {latestIpfsHash}</p>
        <button onClick={joinAsCollaborator} disabled={!authenticated}>Join as Collaborator</button>
        <button onClick={handleInit} disabled={!authenticated}>Init your project</button>
        <button onClick={commit} disabled={!authenticated}>Commit</button>
        <button onClick={createPullRequest} disabled={!authenticated}>Create Pull Request</button>
        <button onClick={approvePullRequest} disabled={!authenticated}>Approve Pull Request</button>
        <button onClick={createBranch} disabled={!authenticated}>Create Branch</button>
        <button onClick={publish} disabled={!authenticated}>Set Public</button>
        </header>
    </div>
  );
}

export default App;