import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const client = createClient({ chain: testnetBradbury });
const list = await client.getActiveValidators();
console.log("active validators:", list.length);
const info = await client.getValidatorInfo(list[0]);
console.log("address:", list[0]);
console.log("moniker:", info.identity?.moniker);
console.log("vStake:", info.vStake);
console.log("vStakeRaw:", info.vStakeRaw);
console.log("dStakeRaw:", info.dStakeRaw);
console.log("banned:", info.banned, "live:", info.live);
