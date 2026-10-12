import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { getAbiItem, toFunctionSelector } from "viem";

const abi = createClient({ chain: testnetBradbury }).getStakingContract().abi;
const mine = {
  delegatorJoin: "delegatorJoin(address)",
  delegatorExit: "delegatorExit(address,uint256)",
  delegatorClaim: "delegatorClaim(address,address)",
};
for (const [name, signature] of Object.entries(mine)) {
  const item = getAbiItem({ abi, name });
  const fromContract = item ? toFunctionSelector(item) : "NOT FOUND";
  const ours = toFunctionSelector(signature);
  console.log(name, "contract:", fromContract, "ours:", ours, fromContract === ours ? "MATCH" : "MISMATCH", item ? item.stateMutability : "");
}
