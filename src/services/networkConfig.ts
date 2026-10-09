import type { NetworkConfig, ProtocolParams } from "../types/staking";

/**
 * All network settings live here, away from the UI.
 * Nothing is hard-coded as "verified": endpoints, chain ID and staking address come from
 * environment variables that the operator sets after checking the official GenLayer docs/CLI.
 */
const env = import.meta.env;

const text = (v: string | undefined): string | undefined => {
  const t = (v ?? "").trim();
  return t === "" ? undefined : t;
};

const wholeNumber = (v: string | undefined): number | undefined => {
  const t = text(v);
  return t !== undefined && /^\d+$/.test(t) ? Number(t) : undefined;
};

const decimal = (v: string | undefined): number | undefined => {
  const t = text(v);
  if (t === undefined || !/^\d+(\.\d+)?$/.test(t)) return undefined;
  return Number(t);
};

export const networkConfig: NetworkConfig = {
  id: text(env.VITE_GENLAYER_NETWORK_ID) ?? "testnet-asimov",
  label: text(env.VITE_GENLAYER_NETWORK_LABEL) ?? "GenLayer Testnet (Asimov)",
  rpcUrl: text(env.VITE_GENLAYER_RPC_URL),
  expectedChainId: wholeNumber(env.VITE_GENLAYER_CHAIN_ID),
  stakingAddress: text(env.VITE_GENLAYER_STAKING_ADDRESS),
  snapshotUrl: text(env.VITE_VALIDATORS_SNAPSHOT_URL),
  verified: env.VITE_GENLAYER_CONFIG_VERIFIED === "true",
};

/** Protocol parameters are configurable and empty by default. Never treat them as permanent rules. */
export const protocolParams: ProtocolParams = {
  minDelegationGen: decimal(env.VITE_PARAM_MIN_DELEGATION_GEN),
  unbondingDays: decimal(env.VITE_PARAM_UNBONDING_DAYS),
  annualRewardPercent: decimal(env.VITE_PARAM_ANNUAL_REWARD_PERCENT),
  validatorCommissionPercent: decimal(env.VITE_PARAM_VALIDATOR_COMMISSION_PERCENT),
  epochHours: decimal(env.VITE_PARAM_EPOCH_HOURS),
  verified: env.VITE_PARAMS_VERIFIED === "true",
};
