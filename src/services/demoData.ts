import type { ValidatorDataset } from "../types/staking";

/**
 * FICTIONAL demo data. Names, stakes and addresses are made up so the app can be explored offline.
 * Addresses intentionally are not valid hex so they can never be mistaken for real wallets.
 * Some fields are left out on purpose to show how "not available" is handled.
 */
export function createDemoDataset(): ValidatorDataset {
  return {
    source: "demo",
    sourceLabel: "Built-in demo dataset (fictional)",
    lastUpdated: undefined,
    note: "These validators are fictional and are not read from any network.",
    validators: [
      { id: "demo-1", address: "0xDEMO000000000000000000000000000000000001", name: "Demo Validator Alpha", status: "active", totalStake: 52000, delegatedStake: 41000, votingPower: 18.5, uptime: 99.2 },
      { id: "demo-2", address: "0xDEMO000000000000000000000000000000000002", name: "Demo Validator Beta", status: "active", totalStake: 38000, delegatedStake: 30000, votingPower: 13.4, uptime: 97.8 },
      { id: "demo-3", address: "0xDEMO000000000000000000000000000000000003", name: "Demo Validator Gamma", status: "active", totalStake: 24500, delegatedStake: 18000, votingPower: 8.7, uptime: 99.9 },
      { id: "demo-4", address: "0xDEMO000000000000000000000000000000000004", name: "Demo Validator Delta", status: "active", totalStake: 15000, votingPower: 5.3 },
      { id: "demo-5", address: "0xDEMO000000000000000000000000000000000005", name: "Demo Validator Epsilon", status: "quarantined", totalStake: 21000, delegatedStake: 15500, votingPower: 0, uptime: 88.1 },
      { id: "demo-6", address: "0xDEMO000000000000000000000000000000000006", name: "Demo Validator Zeta", status: "banned", totalStake: 9000, delegatedStake: 6000, votingPower: 0, uptime: 61.4 },
      { id: "demo-7", address: "0xDEMO000000000000000000000000000000000007", status: "active", totalStake: 12000 },
    ],
  };
}
