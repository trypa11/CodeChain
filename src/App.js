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
  const [account, setAccount] = useState(''); // New state
  const [contract, setContract] = useState(null); // New state
  const [owners, setOwners] = useState([]); // New state

  //authenticating the user
  const authenticate = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        const provider = new ethers.providers.Web3Provider(window.ethereum);
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
    const dirName = prompt('Enter the name of the parent directory');
    await ipfsClient.files.mkdir(`/${dirName}`);
    console.log('Created directory:', dirName);
    setParentDir(dirName);
    //initialize the contract
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const codeContract = new ethers.Contract("0x5FbDB2315678afecb367f032d93F642f64180aa3", CodeChain.abi, signer);
      //get the signer address
      //const address = await signer.getAddress();
      //await codeContract.setOwnerId(address);
      //const id = 1;
      //await codeContract.setProjectId(id);
      await codeContract.setIPFSHash(dirName);
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
  };
  const clone = async () => {
  }
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

  return (
    <div className="App">
      <header className="App-header">
        <p>Click the button to upload files</p>
        <div style={{ position: 'absolute', top: 0, right: 0, padding: '1em' }}>
          {account}
        </div>
        <button onClick={authenticate}>Connect MetaMask</button> 
        <button onClick={ownership} disabled={!authenticated}>Get Owners</button>
        <button onClick={handleInit} disabled={!authenticated}>Init your project</button>
        <button onClick={handleUpload} disabled={!authenticated || uploading}>
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
        <button onClick={handleDownload} disabled={!authenticated}>Download</button>
      </header>
    </div>
  );
}

export default App;