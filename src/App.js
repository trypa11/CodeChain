import React, { useState } from 'react';
import { create } from 'kubo-rpc-client';
import { Buffer } from 'buffer';
import JSZip from 'jszip';


import CodeChain from './artifacts/contracts/CodeChain.sol/CodeChain.json';


const { ethers } = require("ethers");
const ipfsClient = create({ host: 'localhost', port: 5001, protocol: 'http' });
const URL = 'http://127.0.0.1:8545/';
//const provider = new ethers.providers.JsonRpcProvider(URL);
//console.log('Provider:', provider);



function App() {
  const [uploading, setUploading] = useState(false);
  const [parentDir, setParentDir] = useState('');
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

  

  const handleDownload = async () => {
    if (!parentDir) {
      alert('Please initialize the project first.');
      return;
    }
  
    const zip = new JSZip();
    await downloadDir(`/${parentDir}`, zip);
  
    zip.generateAsync({ type: 'blob' }).then((content) => {
      // Trigger download
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = `${parentDir}.zip`;
      downloadLink.click();
    });
  };
  const downloadDir = async (dirPath, zipFolder) => {
    try {
        const files = await ipfsClient.files.ls(dirPath);

        for await (const file of files) {
            if (file.type === 'file') {
                const fileDataStream = ipfsClient.cat(file.cid);
                const chunks = [];
                for await (const chunk of fileDataStream) {
                    chunks.push(chunk);
                }
                const fileData = Buffer.concat(chunks);
                zipFolder.file(file.name, fileData);
            } else if (file.type === 'directory') {
                const subFolder = zipFolder.folder(file.name);
                await downloadDir(`${dirPath}/${file.name}`, subFolder);
            }
        }
    } catch (error) {
        console.error('Error downloading directory:', error);
        throw error; // Rethrow the error to be caught by the caller
    }
  } ;

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

          const latestCommitHash = await contract.getLatestIpfsHash(repoName, branchName);
          console.log('Latest commit IPFS hash:', latestCommitHash);
          
          const ipfsPath = `/ipfs/${latestCommitHash}`;
          console.log('Downloading directory from IPFS path:', ipfsPath);
          
          const zip = new JSZip();
          await downloadDir(ipfsPath, zip);

          zip.generateAsync({ type: 'blob' }).then((content) => {
              // Trigger download
              const downloadLink = document.createElement('a');
              downloadLink.href = URL.createObjectURL(content);
              downloadLink.download = `${repoName}.zip`;
              downloadLink.click();
          });
      } catch (error) {
          console.error('Error cloning repository:', error);
      }
  };

   const joinAsCollaborator = async () => {
    const repoName = prompt('Enter the name of the repository');
    if (!repoName) {
      console.error('Repository name is required');
      return;
    }
  
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress(); // Get the user's address
  

  
  
      // Ensure the user is not already a collaborator
      const isCollaborator = await contract.isCollaborator(repoName, userAddress);
      if (isCollaborator) {
        console.error('User is already a collaborator');
        return;
      }
  
      const txOptions = {
        value: ethers.parseEther('10.0')
      };
  
      const tx = await contract.connect(signer).addCollaborator(repoName, userAddress, txOptions);
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
        <button onClick={handleDownload} disabled={!authenticated}>Download</button>
      </header>
    </div>
  );
}

export default App;