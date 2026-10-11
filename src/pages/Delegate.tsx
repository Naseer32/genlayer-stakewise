import { useEffect, useMemo, useState } from "react";
import { formatGen, shortAddress } from "../lib/format";
import { genToWei, weiToGenString } from "../services/amounts";
import {
  delegateTo,
  delegationErrorMessage,
  readDelegationRules,
  type DelegationReceipt,
  type DelegationRules,
} from "../services/delegation";
import { displayName } from "../services/validatorService";
import { useValidators } from "../state/ValidatorsContext";
import { useWallet } from "../state/WalletContext";
import WalletPanel from "../components/WalletPanel";
import PositionsCard from "../components/PositionsCard";

const EXPLORER = "https://explorer-bradbury.genlayer.com/";

export default function Delegate() {
  const { dataset } = useValidators();
  const wallet = useWallet();

  const [rules, setRules] = useState<DelegationRules | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [validatorId, setValidatorId] = useState("");
  const [amountInput, setAmountInput] = useState("");
  const [understood, setUnderstood] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<DelegationReceipt | null>(null);

  useEffect(() => {
    let cancelled = false;
    readDelegationRules()
      .then((r) => {
        if (!cancelled) setRules(r);
      })
      .catch(() => {
        if (!cancelled) setRulesError("Could not read the minimum delegation from the network.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isLiveBradbury = dataset.source === "live" && dataset.sourceLabel.startsWith("Bradbury");
  const candidates = useMemo(
    () => (isLiveBradbury ? dataset.validators.filter((v) => v.status === "active") : []),
    [dataset, isLiveBradbury],
  );
  const chosen = candidates.find((v) => v.id === validatorId) ?? null;

  const amountWei = genToWei(amountInput);
  let amountError: string | null = null;
  if (amountInput.trim() !== "") {
    if (amountWei === null) amountError = "Use digits only, with at most 18 decimals, for example 42 or 50.5.";
    else if (amountWei <= 0n) amountError = "The amount must be greater than zero.";
    else if (rules && amountWei < rules.minDelegationWei) {
      amountError = `The minimum delegation is ${rules.minDelegationGen}.`;
    }
  }

  const ready =
    wallet.address !== null &&
    wallet.onBradbury &&
    chosen !== null &&
    amountWei !== null &&
    amountWei > 0n &&
    amountError === null &&
    rules !== null &&
    understood &&
    !sending;

  const send = async () => {
    if (!ready || !wallet.address || !chosen || amountWei === null) return;
    setSending(true);
    setError(null);
    setReceipt(null);
    try {
      const result = await delegateTo({
        validator: chosen.address,
        amountWei,
        account: wallet.address,
        chainId: wallet.chainId,
      });
      setReceipt(result);
      setUnderstood(false);
    } catch (err) {
      setError(delegationErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <h1>Delegate</h1>
      <p className="lead">
        Delegate test GEN to a validator on Bradbury testnet. This sends a real transaction on the test network. Test GEN has no
        real value, but the steps work the same way.
      </p>

      <div className="notice notice-warn">
        <p>
          Read before you continue: this wallet can delegate to only one validator at a time, and getting funds back later takes
          two steps with a waiting period. You approve every transaction in your own wallet.
        </p>
      </div>

      <WalletPanel />

      {!isLiveBradbury && (
        <div className="notice notice-danger" role="status">
          <p>
            Load live Bradbury data first: open Validators and choose Bradbury. Delegation is only offered for validators read
            from the network.
          </p>
          <a className="btn btn-secondary" href="#/validators">
            Go to Validators
          </a>
        </div>
      )}

      <section className="card" aria-labelledby="del-title">
        <h2 id="del-title">1. Choose a validator</h2>
        <div className="field">
          <label htmlFor="del-validator">Active validators</label>
          <select
            id="del-validator"
            value={validatorId}
            onChange={(e) => {
              setValidatorId(e.target.value);
              setReceipt(null);
              setError(null);
            }}
            disabled={candidates.length === 0}
          >
            <option value="">{candidates.length === 0 ? "No active validators loaded" : "Choose a validator…"}</option>
            {candidates.map((v) => (
              <option key={v.id} value={v.id}>
                {displayName(v)} ({shortAddress(v.address)})
              </option>
            ))}
          </select>
        </div>

        <h2>2. Enter the amount</h2>
        <div className="field">
          <label htmlFor="del-amount">Amount of test GEN</label>
          <input
            id="del-amount"
            inputMode="decimal"
            autoComplete="off"
            value={amountInput}
            onChange={(e) => {
              setAmountInput(e.target.value);
              setReceipt(null);
              setError(null);
            }}
            placeholder={rules ? `At least ${rules.minDelegationGen}` : "e.g. 50"}
            aria-invalid={amountError !== null}
            aria-describedby="del-amount-msg"
          />
          <p id="del-amount-msg" className={amountError ? "field-error" : "hint"}>
            {amountError ??
              (rules ? `Minimum delegation: ${rules.minDelegationGen}.` : rulesError ?? "Reading the minimum from the network…")}
          </p>
        </div>
      </section>

      <section className="card" aria-labelledby="sum-title">
        <h2 id="sum-title">3. Review and confirm</h2>
        <dl className="facts">
          <div>
            <dt>Network</dt>
            <dd>Bradbury testnet (4221)</dd>
          </div>
          <div>
            <dt>From wallet</dt>
            <dd>{wallet.address ? shortAddress(wallet.address) : "Not connected"}</dd>
          </div>
          <div>
            <dt>Validator</dt>
            <dd>{chosen ? `${displayName(chosen)} (${shortAddress(chosen.address)})` : "Not chosen"}</dd>
          </div>
          <div>
            <dt>Amount</dt>
            <dd>{amountWei !== null && amountWei > 0n ? formatGen(Number(weiToGenString(amountWei))) : "Not entered"}</dd>
          </div>
        </dl>

        <label className="check">
          <input type="checkbox" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>
            I understand this sends a real transaction on Bradbury testnet, that I can delegate to only one validator at a time,
            and that withdrawing later has a waiting period.
          </span>
        </label>

        <button type="button" className="btn btn-primary" onClick={() => void send()} disabled={!ready}>
          {sending ? "Waiting for your wallet…" : "Delegate now"}
        </button>
        <p className="small muted">Your wallet will open and ask you to approve. Rejecting it sends nothing.</p>

        {error && (
          <div className="notice notice-danger" role="alert">
            <p>{error}</p>
          </div>
        )}
        {receipt && (
          <div className="notice notice-ok" role="status">
            <p>
              Delegation sent: {receipt.amountGen} GEN. Transaction {shortAddress(receipt.transactionHash)}.
            </p>
            <p>
              <a href={`${EXPLORER}tx/${receipt.transactionHash}`} target="_blank" rel="noopener noreferrer">
                View on the Bradbury explorer
              </a>
            </p>
          </div>
        )}
      </section>

      <PositionsCard />
    </div>
  );
}
