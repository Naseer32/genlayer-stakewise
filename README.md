# GenLayer StakeWise

An educational **validator explorer** and **staking strategy simulator** for the GenLayer ecosystem.

> **Reading and simulating never need a wallet.** The simulator is hypothetical. The Delegate page sends real transactions on **Bradbury testnet only**, and only after you approve each one in your own wallet. The app never asks for private keys or seed phrases.
> Allocations you make here are hypothetical and are never real delegations.

Built with React, TypeScript and Vite. The only runtime dependencies are `react` and `react-dom`
(no router, no chart library, no web3 library), which keeps installs small, including on a phone.

## Quick start (Termux on Android)

```bash
pkg update && pkg install nodejs-lts git unzip
unzip genlayer-stakewise.zip && cd genlayer-stakewise
npm install
npm run dev
```

Open `http://localhost:5173` in your phone browser.

Other commands:

| Command | What it does |
| --- | --- |
| `npm run build` | Type-check and create a production build in `dist/` |
| `npm run preview` | Serve the production build |
| `npm run typecheck` | TypeScript check only |
| `npm test` | Unit tests for allocation math and data parsing (needs Node 22.6+) |

If `npm install` or `vite` fails on Termux with an `esbuild` or `rollup` error, try `pkg install esbuild` and run
`export ESBUILD_BINARY_PATH=$PREFIX/bin/esbuild`, then reinstall.

## Pages

- **Dashboard**: network check, validator counts by status (only when the source provides status), and a summary of your simulated strategy, with clear loading, empty and error states.
- **Validators**: search by name or address, filter by status, sort. Table on wide screens, compact cards on phones. Open any validator for details.
- **Validator details**: every field shows its value or "Not available". Includes data source and last-updated time.
- **Simulator**: enter a hypothetical GEN amount, add validators, allocate by percent or GEN amount, edit, remove, split evenly, reset. Shows percentages, remaining amount and a donut chart, flags incomplete or over-allocated plans, and compares concentrated, even and custom splits.
- **Learn**: plain-language explanations of staking, delegation, validators, status, penalties and unbonding.

## Data honesty

Every dataset carries a visible label:

| Label | Meaning |
| --- | --- |
| **Live** | Read directly from the Bradbury staking contract by the built-in read-only adapter |
| **Imported** | Pasted by you or fetched from a snapshot URL you configured. The app cannot verify it |
| **Cached** | An earlier import saved in this browser |
| **Demo data** | Fictional validators built into the app. Their addresses are deliberately invalid hex |
| **Unavailable** | Nothing could be loaded |

The app never invents validator counts, stake totals, rewards, APR or performance. Missing fields show "Not available".
Reward estimates appear only when verified protocol parameters are configured (see below); otherwise the simulator lists what is missing.

By default the app opens with the labelled demo dataset so you can try every feature offline.

## Importing real validator data

Open **Validators → Import or change validator data** and paste either:

1. JSON: an array, or an object with `validators` / `active` / `quarantined` / `banned` arrays. Recognised fields: `address`, `name`, `status`, `totalStake`, `delegatedStake`, `votingPower`, `uptime`. Stake values must be plain numbers **in GEN** (not wei).
2. Any text containing `0x` addresses, such as the output of the GenLayer CLI:
   ```bash
   genlayer network testnet-asimov
   genlayer staking active-validators
   genlayer staking quarantined-validators
   genlayer staking banned-validators
   ```

Imported data is labelled **Imported** and cached in your browser (`localStorage`). Use **Clear saved data** to remove it.

## Configuration

Copy `.env.example` to `.env` and fill in only what you have **verified** against the official GenLayer documentation or CLI. All network settings are read in `src/services/networkConfig.ts`; UI components never contain endpoints or addresses.

- `VITE_GENLAYER_RPC_URL` and `VITE_GENLAYER_CHAIN_ID` enable a read-only connection check (`eth_chainId`). A chain ID mismatch is reported.
- `VITE_VALIDATORS_SNAPSHOT_URL` loads a JSON snapshot automatically (labelled **Imported**).
- `VITE_PARAM_*` and `VITE_PARAMS_VERIFIED` define protocol parameters. Nothing is hard-coded. A reward illustration is shown only when `VITE_PARAMS_VERIFIED=true` and both the reward rate and the validator commission are set.

Studio/localnet validators are not production staking validators and must not be treated as such.

## Limitations

- Live reads work on Bradbury only. Studio has no staking, so it shows no validators. The adapter does not provide voting power or uptime. A connected endpoint alone does not mean validator data is live.
- No performance history, penalties timeline or reward data.
- Delegation works on Bradbury testnet only. There is no mainnet support, and Studio has no staking. Delegation was tested once on Bradbury testnet with the minimum amount: the transaction was confirmed and the contract recorded it as a pending deposit. Withdrawing (exit all, then claim) is built but has not been tested with real transactions yet, because the network epoch had not advanced when this was written. Treat withdrawal and claim as unverified.
- Imported data is only as accurate as its source.
- This is education, not financial advice. Diversification can reduce concentration risk but does not remove validator penalties or guarantee higher rewards.

## How live data works

The Bradbury adapter (`src/services/liveNetworks.ts`) uses `genlayer-js` 1.1.8 to call only read methods: `getActiveValidators`, `getValidatorInfo` and the staking contract method `getAllQuarantinedValidators`, the same call the official CLI makes. Network details were confirmed with `genlayer network info`. To extend it, first confirm the method in the SDK or the contract ABI, keep it read-only, and never add signing or transaction code.

## Project structure

```
src/
  pages/        Dashboard, ValidatorExplorer, ValidatorDetails, StrategySimulator, LearnStaking
  components/   ValidatorCard, AllocationChart, NetworkStatus, ImportPanel, SourceBanner, badges, Layout
  services/     networkConfig (settings), networkService (network access), validatorParser (parsing),
                validatorService (datasets, cache, filters), simulation (pure math), demoData
  state/        ValidatorsContext, StrategyContext
  lib/          format helpers, tiny hash router
  types/        staking.ts
tests/          simulation and parser tests
```

## Security

The app never handles private keys or seed phrases: your wallet holds the keys and asks you to approve every transaction. The only function that can move funds is `delegateTo` in `src/services/delegation.ts`, and it is called only from the Delegate page after an explicit confirmation. Amounts are converted to wei with exact integer math (`src/services/amounts.ts`), because genlayer-js reads an unsuffixed string as wei. Other network requests are read-only.

## StakeWise Advisor (Intelligent Contract)

`contracts/stakewise_advisor.py` is a **non-custodial** Intelligent Contract. It never receives, holds or moves GEN or any token. It stores a hypothetical staking plan (validator addresses and shares) per wallet, and stores a risk analysis for that plan.

- **Bradbury testnet:** `0x2F0aA208f5767be28CBd62C7BA50ddEa36715D84`
- Each wallet can only write its own plan. Inputs are validated: 1 to 20 validators, valid addresses, no duplicates, whole basis points that add up to exactly 10000.
- The concentration risk level (LOW, MEDIUM, HIGH) is computed by fixed rules, never by the model. GenLayer validators reach consensus (`prompt_comparative`) on an AI-written explanation, which receives only the computed numbers (no user text and no addresses), so there is nothing to inject. Text that promises rewards or safety is replaced by a fixed sentence.
- Methods: `save_plan`, `analyze_plan`, `clear_plan` (write); `has_plan`, `get_plan`, `get_analysis`, `get_plan_count` (read).

### How it was verified

- 17 local tests (`python -m pytest tests/test_advisor_logic.py`) cover the pure logic with a stub SDK. They do **not** prove the contract works inside GenVM.
- The contract was deployed and exercised on Studio and on Bradbury: `save_plan` stored a plan, `analyze_plan` stored an analysis, and both were read back. On Bradbury the first `analyze_plan` ended in `LEADER_TIMEOUT` and stored nothing; a retry succeeded.
- Bugs found only by running it on the network: the CLI sends arrays and address-like strings as typed values instead of text, so the contract accepts both forms.

### Limits

- The **Advisor page** in the app only **reads** the contract. Saving and analysing a plan is done with the GenLayer CLI for now:
  `genlayer write <address> save_plan --args "My plan" '[{"validator":"0x…","bps":6000},{"validator":"0x…","bps":4000}]'`
  then `genlayer write <address> analyze_plan`.
- The contract has not been audited. It holds no funds, but treat it as a testnet demo.
- Contracts cannot be edited after deployment; fixes mean a new deployment with a new address.
