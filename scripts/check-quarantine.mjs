import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });
const contract = client.getStakingContract();
const list = await contract.read.getAllQuarantinedValidators([0n, 100n]);
console.log("quarantined count:", list.length);
for (const v of list) {
  console.log(v.validator, "permanentlyBanned:", v.permanentlyBanned, "until:", String(v.untilEpochBanned).slice(0, 8));
}
