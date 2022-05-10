const OWNER_ADDRESS = "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266";

async function main() {
  const signer = await ethers.getSigner("0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266");
  const contract = await ethers.getContractAt("GridFirePayment", "0x413b1AfCa96a3df5A686d8BFBF93d30688a7f7D9", signer);
  const result = await contract.getOwnerBalance();
  console.log("DAI " + ethers.utils.formatEther(result));
  const withdrawal = await contract.withdrawOwnerBalance();
  console.log(withdrawal);
}

main();
