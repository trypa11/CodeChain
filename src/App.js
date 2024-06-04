import React, { useState, useEffect } from 'react';
import './App.css';
import CodeChain from './artifacts/contracts/CodeChain.sol/CodeChain.json';
import CodeChain_png from './codechain.png';

const { ethers } = require("ethers");

function App() {
  const [authenticated, setAuthenticated] = useState(false);
  const [account, setAccount] = useState('');
  const [contract, setContract] = useState(null);
  const [repoDetails, setRepoDetails] = useState(null);
  const [publicRepos, setPublicRepos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [collaboratorRepos, setCollaboratorRepos] = useState([]);

  let signer = null;
  let provider;

  useEffect(() => {
    authenticate();
  }, []);

  useEffect(() => {
    if (contract) {
      getAndPrintPublicRepositories();
    }
  }, [contract]);



  // Authenticating the user
  const authenticate = async () => {
    if (window.ethereum) {
      try {
        // Request account access
        provider = new ethers.BrowserProvider(window.ethereum)
        const accounts = await provider.send("eth_requestAccounts", []);
        const account = accounts[0];
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

  const viewRepo = async (repoName) => {
    try {
      const repoDetails = await contract.getRepositoryInfo(repoName);
      console.log('Repository details:', repoDetails);
      setRepoDetails(repoDetails);
    }
    catch (error) {
      console.error('Error fetching repository details:', error);
    }
  };
  const getAndPrintPublicRepositories = async () => {
    try {
      const publicRepos = await contract.getPublicRepositories();
      console.log('Public repositories:', publicRepos);
      //const sortedPublicRepos = [...publicRepos].sort();
      //setPublicRepos(sortedPublicRepos);
      setPublicRepos(publicRepos);
    } catch (error) {
      console.error('Error getting public repositories:', error);
    }
  };

  const joinAsCollaborator = async (repoName) => {

    const etherAmount = prompt('Enter the amount of ether to send');

    try {
      provider = new ethers.BrowserProvider(window.ethereum)
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
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
  };
  const myRepo = async () => {
    try {
      const collaboratorRepos = await contract.getCollaboratorRepositories(account);
      console.log('Collaborator repositories for user:', account, collaboratorRepos);
      setCollaboratorRepos(collaboratorRepos);
    } catch (error) {
      console.error('Error getting collaborator repositories:', error);
    }
  };



  return (
    <div className="App" >
      {authenticated ? (
        <header className="App-header">
          <div className="header-container">
            <div className="dropdown">
            <button className="logo-button" onClick={myRepo} >
                <img src={CodeChain_png} alt="CodeChain Logo" className="codechain-logo-logged-in" />
              </button>
              <ul className="dropdown-menu">
                <h2>My Repos</h2>
                {collaboratorRepos.map((repo, index) => (
                  <li key={index}>{repo}</li>
                ))}
              </ul>
            </div>
            <input
              className="search-bar"
              type="search"
              placeholder={searchTerm ? "" : "Search repositories..."}
              value={searchTerm}
              onChange={handleSearchChange}
              onFocus={(e) => e.target.placeholder = ""}
              onBlur={(e) => e.target.placeholder = "Search repositories..."}
            />
            <p>Account: {account}</p>
          </div>
          <div className="main-content">
            <h1 className="title"> Public Repositories </h1>

            <div className="public-repos">
              {publicRepos
                .filter((repo) => repo.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((repo, index) => (
                  <details key={index}>
                    <summary onClick={() => typeof repo === 'string' && viewRepo(repo)}><h1>{repo}</h1></summary>
                    {repoDetails && repoDetails[0] === repo && (
                      <div>
                        <p>Repository Details:</p>
                        <p>Description: :{repoDetails[1]} </p>
                        <p>Branches: {repoDetails[3].join(', ')}</p>
                        <p>Collaborators: {repoDetails[4].join(', ')}</p>
                        <button onClick={() => joinAsCollaborator(repo)} className="connect-button">Join as collaborator
                        </button>
                      </div>
                    )}

                  </details>
                ))}
            </div>
          </div>
          {/* Other main screen content */}
        </header>
      ) : (
        <div className="login-container">
          <img src={CodeChain_png} alt="CodeChain Logo" className="codechain-logo" />
          <button onClick={authenticate} className="connect-button">
            Connect to MetaMask
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
