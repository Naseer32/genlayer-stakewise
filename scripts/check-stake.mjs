import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";

const [delegator, validator] = process.argv.slice(2);
if (!/^0x[a-fA-F0-9]{40}$/.test(delegator || "") || !/^0x[a-fA-F0-9]{40}$/.test(validator || "")) {
  console.log("Usage: node scripts/check-stake.mjs <wallet address> <validator address>");
  process.exit(1);
}
const client = createClient({ chain: testnetBradbury });
const info = await client.getStakeInfo(delegator, validator);
console.log("shares:", String(info.shares));
console.log("stake:", info.stake);
console.log("pendingDeposits:", JSON.stringify(info.pendingDeposits, (_, v) => (typeof v === "bigint" ? String(v) : v)));
console.log("pendingWithdrawals:", JSON.stringify(info.pendingWithdrawals, (_, v) => (typeof v === "bigint" ? String(v) : v)));
const epoch = await client.getEpochInfo();
console.log("current epoch:", String(epoch.currentEpoch));
