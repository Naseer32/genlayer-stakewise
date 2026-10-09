import { formatNumber } from "../lib/format";
import { protocolParams } from "../services/networkConfig";

interface Section {
  id: string;
  title: string;
  body: string[];
}

const SECTIONS: Section[] = [
  {
    id: "staking",
    title: "What staking means",
    body: [
      "Staking means locking tokens as a deposit that supports a proof-of-stake network. The deposit gives participants a reason to behave honestly: good behavior can be rewarded, and misbehavior or poor performance can be penalized.",
      "Staked tokens are usually not freely spendable while they are locked, and getting them back takes time (see unbonding below).",
    ],
  },
  {
    id: "delegation",
    title: "What delegation means",
    body: [
      "Delegation lets you assign your GEN to a validator without running validator infrastructure yourself. The validator does the technical work; your tokens add to the stake behind it.",
      "You stay exposed to that validator's behavior. If it performs badly or is penalized, your delegation can be affected, so the choice of validator matters.",
    ],
  },
  {
    id: "validators",
    title: "What validators do in GenLayer",
    body: [
      "Validators are the nodes that process transactions and take part in the network's consensus. In GenLayer this includes validating the results of Intelligent Contracts, whose execution can involve AI models.",
      "Because validators must stay online and answer correctly, running one is demanding. Delegators fund and back validators they trust. Always confirm details in the official GenLayer documentation, as the protocol evolves.",
    ],
  },
  {
    id: "security",
    title: "How delegation affects validator selection and network security",
    body: [
      "In stake-based networks, the stake behind a validator generally influences how much weight or how many opportunities it gets. Check the official docs for the exact selection rule in GenLayer.",
      "Security is stronger when stake is spread over many independent validators. If most stake sits with a few validators, the network depends on them, and their failure matters more. That is one reason people consider diversifying.",
    ],
  },
  {
    id: "status",
    title: "Why validator status and performance matter",
    body: [
      "A validator can be active, quarantined or banned. Delegating to a validator that is not active may mean it is not doing useful work for you.",
      "Performance matters too: validators with strong uptime are expected to earn more than those that are often offline. Past performance does not guarantee future results.",
    ],
  },
  {
    id: "penalties",
    title: "Penalties, quarantine and bans",
    body: [
      "Quarantine is a protective measure that sidelines a validator after problems; whether and how it ends depends on protocol rules. A ban is more serious and removes a validator from participation.",
      "How penalties affect delegated stake, and how long each state lasts, are protocol rules that can change. Read the current documentation and check a validator's state before relying on it.",
    ],
  },
  {
    id: "unbonding",
    title: "Unbonding and withdrawal periods",
    body: [
      "Leaving a delegation normally takes two steps: you request to exit, then you wait through an unbonding period, and afterwards you claim the funds. The official CLI reflects this with separate exit and claim commands, and its delegation info shows pending withdrawals.",
      "While you wait, the tokens are generally not earning rewards and cannot be used. The length of the period is a protocol parameter, so check the current value instead of assuming one.",
    ],
  },
];

function paramValue(v: number | undefined, unit: string): string {
  return v === undefined ? "Not configured" : `${formatNumber(v)} ${unit}`;
}

export default function LearnStaking() {
  const rows: [string, string][] = [
    ["Minimum delegation", paramValue(protocolParams.minDelegationGen, "GEN")],
    ["Unbonding period", paramValue(protocolParams.unbondingDays, "days")],
    ["Epoch length", paramValue(protocolParams.epochHours, "hours")],
    ["Annual reward rate", paramValue(protocolParams.annualRewardPercent, "%")],
    ["Validator commission", paramValue(protocolParams.validatorCommissionPercent, "%")],
  ];

  return (
    <div className="page">
      <h1>Learn staking</h1>
      <p className="lead">Short explanations of the ideas behind the explorer and simulator. This is education, not financial advice.</p>

      <div className="stack">
        {SECTIONS.map((s, i) => (
          <details key={s.id} className="card disclosure" open={i === 0}>
            <summary>{s.title}</summary>
            {s.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </details>
        ))}
      </div>

      <section className="card" aria-labelledby="params-title">
        <h2 id="params-title">Protocol parameters</h2>
        <p className="small">
          These values are not built into the app. They appear only if the operator configured them, and they can change on
          the network.
        </p>
        <div className="table-wrap">
          <table>
            <caption className="sr-only">Configured protocol parameters</caption>
            <thead>
              <tr>
                <th scope="col">Parameter</th>
                <th scope="col">Configured value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k}>
                  <th scope="row">{k}</th>
                  <td>{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">Marked as verified by the operator: {protocolParams.verified ? "yes" : "no"}.</p>
        <p className="small">To read the real current values, use the official GenLayer CLI:</p>
        <pre className="code">{`genlayer network testnet-asimov\ngenlayer staking epoch-info\ngenlayer staking active-validators`}</pre>
      </section>
    </div>
  );
}
