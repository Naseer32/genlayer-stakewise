export type DataSource = "live" | "cached" | "imported" | "demo" | "unavailable";
export type ValidatorStatus = "active" | "quarantined" | "banned" | "unknown";

export interface Validator {
  /** Stable key. For real data this is the lower-case 0x address. */
  id: string;
  address: string;
  name?: string;
  status: ValidatorStatus;
  /** All stake values are expressed in GEN (not wei). */
  totalStake?: number;
  delegatedStake?: number;
  /** Percent, 0-100. */
  votingPower?: number;
  /** Percent, 0-100. */
  uptime?: number;
}

export interface ValidatorDataset {
  source: DataSource;
  sourceLabel: string;
  validators: Validator[];
  lastUpdated?: string;
  note?: string;
}

export type NetworkState =
  | "unconfigured"
  | "checking"
  | "connected"
  | "mismatch"
  | "unreachable";

export interface NetworkStatusInfo {
  state: NetworkState;
  message: string;
  chainId?: number;
  checkedAt?: string;
}

export interface NetworkConfig {
  id: string;
  label: string;
  rpcUrl?: string;
  expectedChainId?: number;
  stakingAddress?: string;
  snapshotUrl?: string;
  /** True only when the operator states the values above were verified. */
  verified: boolean;
}

export interface ProtocolParams {
  minDelegationGen?: number;
  unbondingDays?: number;
  annualRewardPercent?: number;
  validatorCommissionPercent?: number;
  epochHours?: number;
  verified: boolean;
}

export type AllocationMode = "amount" | "percent";

export interface AllocationRow {
  validatorId: string;
  /** Raw text typed by the user (amount in GEN or percent, depending on mode). */
  raw: string;
}

export interface ComputedRow {
  validatorId: string;
  raw: string;
  amount: number | null;
  percent: number | null;
  error: string | null;
}

export type SimulationStatus =
  | "no-total"
  | "empty"
  | "incomplete"
  | "over"
  | "partial"
  | "complete";

export interface SimulationResult {
  total: number | null;
  totalError: string | null;
  rows: ComputedRow[];
  allocated: number;
  remaining: number | null;
  allocatedPercent: number;
  status: SimulationStatus;
}

export interface ScenarioShare {
  validatorId: string;
  percent: number;
  amount: number;
}

export interface Scenario {
  key: string;
  label: string;
  description: string;
  shares: ScenarioShare[];
  largestSharePercent: number;
  effectiveCount: number;
}

export interface RewardEstimate {
  available: boolean;
  missing: string[];
  annualGross?: number;
  annualNet?: number;
}
