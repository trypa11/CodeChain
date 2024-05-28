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
  
  
      //const zip = new JSZip();

      await ipfsClient.get('/ipfs'+hash,{compress:true});

      //const zipo = await zip.generateAsync({ type: 'blob' });
      //saveAs(zipo, `${repoName}.zip`);
    } catch (error) {
      console.error('Error downloading folder:', error);
    }
  };