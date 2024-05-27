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
  const [owners, setOwners] = useState([]); 
  const [repoDetails, setRepoDetails] = useState(null);
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
    //const dirName = prompt('Enter the name of the parent directory');
    //await ipfsClient.files.mkdir(`/${dirName}`);
    //console.log('Created directory:', dirName);
    //setParentDir(dirName);
    const repoName = prompt('Enter the name of the repository');
    //initialize the contract
    try {
      provider = new ethers.BrowserProvider(window.ethereum)
      signer = await provider.getSigner();
      const codeContract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", CodeChain.abi, signer);
      await codeContract.createRepository(repoName);
      console.log('Created repository:', repoName);
      setContract(codeContract);

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
      const directoryStructure = filesArray.reduce((acc, file) => {
        const pathParts = file.webkitRelativePath.split('/');
        pathParts.pop(); // remove the file name
        acc[file.webkitRelativePath] = pathParts.join('/');
        return acc;
      }, {});
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        await uploadFile(file, directoryStructure[file.webkitRelativePath]);
      }
    });
  
    fileInput.click();
  };
  const commit = async () => {
    const repoName = prompt('Enter the name of the repository');
    const branchName = prompt('Enter the name of the branch');
    const message = prompt('Enter the commit message');
    const dirName = prompt('Enter the path of the parent directory');
    await ipfsClient.files.mkdir(`/${dirName}`);
    console.log('Created directory:', dirName);
    setParentDir(dirName);

  
    try {
      provider = new ethers.BrowserProvider(window.ethereum)
      signer = await provider.getSigner();


      const { cid } = await ipfsClient.add(dirName);
      const ipfsHash = cid.toString();
  
      await contract.commit(repoName, branchName, message, ipfsHash);
      console.log('Commit made to repository:', repoName);
    }
    catch (error) {
      console.error('Error making commit:', error);
    }
  };
  const publish = async () => {
  }
  const retrieve = async () => {
  }
  const ownership = async () => {
    try {
      const owners = await contract.getOwners();
      setOwners(owners);
      console.log('Owners:', owners);
    } catch (error) {
      console.error('Error getting owners:', error);
    }
  };
  const uploadFile = async (file, relativePath) => {
    const reader = new window.FileReader();
    reader.readAsArrayBuffer(file);
    reader.onloadend = async () => {
      const buffer = Buffer.from(reader.result);
      const fileDetails = {
        path: `/${parentDir}/${relativePath}/${file.name}`, // Include parent directory and relative path in the file path
        content: buffer,
      };
      await ipfsClient.files.write(fileDetails.path, fileDetails.content, {
        create: true,
        parents: true,
      });
      console.log('Uploaded file:', fileDetails.path);
    };
  };

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
    const files = await ipfsClient.files.ls(dirPath);
  
    for await (const file of files) {
      if (file.type === 'file') {
        const fileStream = ipfsClient.cat(file.cid);
        const chunks = [];
        for await (const chunk of fileStream) {
          chunks.push(chunk);
        }
        const fileData = Buffer.concat(chunks);
        zipFolder.file(file.name, fileData);
      } else if (file.type === 'directory') {
        const subFolder = zipFolder.folder(file.name);
        await downloadDir(`${dirPath}/${file.name}`, subFolder);
      }
    }
  };
  const clone = async () => {
    const repoName = prompt('Enter the name of the repository');
    try {
      const latestCommit = await contract.getLatestIpfsHash(repoName, 'main');
      const ipfsHash = latestCommit.ipfsHash;
      console.log('Latest commit IPFS hash:', ipfsHash);
  
      const zip = new JSZip();
      await downloadDir(`/ipfs/${ipfsHash}`, zip);
  
      zip.generateAsync({ type: 'blob' }).then((content) => {
        // Trigger download
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(content);
        downloadLink.download = `${repoName}.zip`;
        downloadLink.click();
      });
    }
    catch (error) {
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
        <button onClick={ownership} disabled={!authenticated}>Get Owners</button>
        <button onClick={clone} disabled={!authenticated}>Clone</button>
        <button onClick={joinAsCollaborator} disabled={!authenticated}>Join as Collaborator</button>
        <button onClick={handleInit} disabled={!authenticated}>Init your project</button>
        <button onClick={handleUpload} disabled={!authenticated || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={commit} disabled={!authenticated}>Commit</button>
        <button onClick={handleDownload} disabled={!authenticated}>Download</button>
      </header>
    </div>
  );
}

export default App;