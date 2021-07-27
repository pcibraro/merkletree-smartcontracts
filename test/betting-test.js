const { expect } = require("chai");
const { MerkleTree } = require('merkletreejs');
const keccak256 = require('keccak256');

describe("Betting", function () {
  let owner, addr1, addr2, addr3, addr4, addr5;
  let Betting, betting;
    
  beforeEach(async function() {
      [owner, addr1, addr2, addr3, addr4, addr5] = await ethers.getSigners();

      Betting = await ethers.getContractFactory("Betting");
      betting = await Betting.deploy();
      
      await betting.deployed();
  });

  it("Should not allow bets for less than a gwei", async function () {
    await expect(betting.bet(1, { value : 1e3 })).to.be.reverted;
  });

  it("Should not allow bets for not existing teams", async function () {
    await expect(betting.bet(3, { value : 1e9 })).to.be.reverted;
  });

  it("Should not allow betting twice", async function () {
    await betting.bet(1, { value : 1e9 });

    await expect(betting.bet(1, { value : 1e9 })).to.be.reverted;
  });

  it("Should increase bets for team 1 after betting", async function () {
    await betting.bet(1, { value : 1e9 });
    
    await betting.connect(addr1).bet(1, { value : 1e9 })

    expect(await betting.getTotalBetOne()).to.be.equal(2e9);
  });

  it("Should increase bets for team 2 after betting", async function () {
    await betting.bet(2, { value : 1e9 });

    await betting.connect(addr1).bet(2, { value : 1e9 })

    expect(await betting.getTotalBetTwo()).to.be.equal(2e9);
  });

  it("Should add players to a list after betting for team 1", async function () {
    await betting.bet(1, { value : 1e9 });
    
    await betting.connect(addr1).bet(1, { value : 1e9 })

    const list = await betting.getPlayersBetOne();

    expect(list[0]).to.be.equal(owner.address);
    expect(list[1]).to.be.equal(addr1.address);
  });

  it("Should add players to a list after betting for team 2", async function () {
    await betting.bet(2, { value : 1e9 });
    
    await betting.connect(addr1).bet(2, { value : 1e9 })

    const list = await betting.getPlayersBetTwo();

    expect(list[0]).to.be.equal(owner.address);
    expect(list[1]).to.be.equal(addr1.address);
  });

  it("Should not allow betting after team 1 won", async function () {
    await betting.bet(1, { value : 1e9 });
    
    const list = await betting.getPlayersBetOne();

    const merkletree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });

    const root = merkletree.getHexRoot();

    await betting.setMerkleRoot(root, 1);

    await expect(betting.connect(addr3).bet(1, { value : 1e9 })).to.be.reverted;
  });

  it("Should allow claiming gains", async function () {
    await betting.bet(1, { value : 1e9 });
    
    await betting.connect(addr1).bet(1, { value : 1e9 })

    await betting.connect(addr2).bet(2, { value : 1e9 })

    const list = await betting.getPlayersBetTwo();

    const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });

    const root = merkleTree.getHexRoot();

    await betting.setMerkleRoot(root, 2);

    const proof = merkleTree.getHexProof(keccak256(addr2.address));

    await expect(betting.connect(addr2).claim(proof))
      .to.emit(betting, 'GainsClaimed')
      .withArgs(addr2.address, 3e9);;
  });

  it("Should not allow claiming gains for team 1 if team 2 won", async function () {
    await betting.bet(1, { value : 1e9 });
    
    await betting.connect(addr1).bet(1, { value : 1e9 })

    await betting.connect(addr2).bet(2, { value : 1e9 })

    const list = await betting.getPlayersBetTwo();

    const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });

    const root = merkleTree.getHexRoot();

    await betting.setMerkleRoot(root, 2);

    const proof = merkleTree.getHexProof(keccak256(addr1.address));

    await expect(betting.connect(addr1).claim(proof)).to.be.reverted;
  });

  it("Should not allow claiming gains for stolen proof", async function () {
    await betting.bet(1, { value : 1e9 });
    
    await betting.connect(addr1).bet(1, { value : 1e9 })

    await betting.connect(addr2).bet(2, { value : 1e9 })

    const list = await betting.getPlayersBetTwo();

    const merkleTree = new MerkleTree(list, keccak256, { hashLeaves: true, sortPairs: true });

    const root = merkleTree.getHexRoot();

    await betting.setMerkleRoot(root, 2);

    const proof = merkleTree.getHexProof(keccak256(addr2.address));

    await expect(betting.connect(addr1).claim(proof)).to.be.reverted;
  });
  

 
});
