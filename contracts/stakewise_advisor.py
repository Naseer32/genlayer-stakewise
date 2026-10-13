# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json
import re
import typing

# StakeWise Advisor
# A NON-CUSTODIAL Intelligent Contract. It never receives, holds or moves GEN or any token.
# It only stores a user's hypothetical staking plan (validator addresses and shares) and
# stores a risk explanation for that plan. Each wallet can only change its own data.

MAX_VALIDATORS = 20
TOTAL_BPS = 10000  # 100.00% expressed in basis points (GenVM calldata has no floats)
ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
NAME_RE = re.compile(r"^[A-Za-z0-9 _.\-]{1,40}$")
BANNED_CLAIMS = re.compile(r"guarantee|risk[- ]free|will earn|profit|no risk", re.IGNORECASE)

FALLBACK_SUMMARY = {
    "HIGH": "Most of this plan sits with very few validators, so one validator's problem would affect a large share.",
    "MEDIUM": "This plan is moderately concentrated, so a problem at the largest validator would still matter.",
    "LOW": "This plan is spread across several validators, which lowers concentration risk but does not remove penalties.",
}
FALLBACK_SUGGESTION = "Check each validator's status and consider whether the largest share is acceptable to you."


def _fail(message: str):
    raise gl.vm.UserError(message)


def _parse_allocations(raw: str) -> list:
    """Validate allocations JSON: [{"validator": "0x..", "bps": 2500}, ...] summing to 10000."""
    if isinstance(raw, list):
        data = raw  # the CLI and some clients send a ready-made array instead of a string
    else:
        try:
            data = json.loads(raw)
        except Exception:
            _fail("Allocations must be valid JSON")
    if not isinstance(data, list) or len(data) == 0:
        _fail("Provide at least one allocation")
    if len(data) > MAX_VALIDATORS:
        _fail("Too many validators")
    seen = set()
    out = []
    total = 0
    for item in data:
        if not isinstance(item, dict):
            _fail("Each allocation must be an object")
        validator = item.get("validator")
        bps = item.get("bps")
        if isinstance(validator, Address):
            validator = validator.as_hex  # the CLI turns address-like strings into Address values
        if not isinstance(validator, str) or not ADDRESS_RE.match(validator):
            _fail("Invalid validator address")
        if isinstance(bps, bool) or not isinstance(bps, int) or bps <= 0 or bps > TOTAL_BPS:
            _fail("Each share must be a whole number of basis points from 1 to 10000")
        key = validator.lower()
        if key in seen:
            _fail("Duplicate validator")
        seen.add(key)
        total += bps
        out.append({"validator": key, "bps": bps})
    if total != TOTAL_BPS:
        _fail("Shares must add up to exactly 10000 basis points")
    return out


def _metrics(allocs: list) -> dict:
    shares = [a["bps"] for a in allocs]
    largest = max(shares)
    sum_squares = sum(s * s for s in shares)
    effective_x100 = (10 ** 10) // sum_squares  # equal-weight equivalent validators, times 100
    if len(shares) == 1 or largest >= 8000:
        risk = "HIGH"
    elif largest >= 5000:
        risk = "MEDIUM"
    else:
        risk = "LOW"
    return {
        "validators": len(shares),
        "largest_bps": largest,
        "effective_x100": effective_x100,
        "risk": risk,
    }


def _build_task(m: dict) -> str:
    # Only deterministic numbers are sent to the model. No user-written text, so nothing to inject.
    return (
        "You explain staking concentration risk to a newcomer.\n"
        "Facts about a hypothetical staking plan (these numbers are exact):\n"
        f"- Number of validators: {m['validators']}\n"
        f"- Largest single share: {m['largest_bps'] // 100}.{m['largest_bps'] % 100:02d} percent\n"
        f"- Equal-weight equivalent number of validators: {m['effective_x100'] // 100}.{m['effective_x100'] % 100:02d}\n"
        f"- Concentration risk level: {m['risk']}\n"
        "Write two short sentences explaining why this level of concentration matters, and one practical suggestion.\n"
        "Do not promise rewards, returns or safety. Do not predict profit.\n"
        'Respond with JSON only, exactly like: {"summary": "...", "suggestion": "..."}'
    )


def _plain(raw: typing.Any) -> str:
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except Exception:
            return json.dumps({"_unparsed": raw[:200]})
    return json.dumps(raw)


def _clean(value: typing.Any, limit: int) -> str:
    if not isinstance(value, str):
        return ""
    text = "".join(ch for ch in value if ch.isprintable()).strip()
    return text[:limit]


def _normalize_ai(raw: typing.Any, risk: str) -> dict:
    data = {}
    if isinstance(raw, str):
        try:
            data = json.loads(raw)
        except Exception:
            data = {}
    elif isinstance(raw, dict):
        data = raw
    if not isinstance(data, dict):
        data = {}
    summary = _clean(data.get("summary"), 400)
    suggestion = _clean(data.get("suggestion"), 300)
    if summary == "" or BANNED_CLAIMS.search(summary):
        summary = FALLBACK_SUMMARY.get(risk, FALLBACK_SUMMARY["MEDIUM"])
    if suggestion == "" or BANNED_CLAIMS.search(suggestion):
        suggestion = FALLBACK_SUGGESTION
    return {"summary": summary, "suggestion": suggestion}


def _address_arg(value: typing.Any) -> Address:
    if isinstance(value, Address):
        return value  # the CLI already converts address-like arguments
    if not isinstance(value, str) or not ADDRESS_RE.match(value):
        _fail("Invalid address")
    return Address(value)


class StakeWiseAdvisor(gl.Contract):
    plan_count: u256
    plans: TreeMap[Address, str]      # wallet -> JSON plan ("" when cleared)
    analyses: TreeMap[Address, str]   # wallet -> JSON analysis ("" when none)

    def __init__(self):
        self.plan_count = u256(0)

    def _has(self, who: Address) -> bool:
        return who in self.plans and self.plans[who] != ""

    # ---------------- write methods (each wallet can only touch its own data) ----------------

    @gl.public.write
    def save_plan(self, name: str, allocations: str) -> typing.Any:
        if not isinstance(name, str) or not NAME_RE.match(name.strip()):
            _fail("Name must be 1 to 40 letters, digits, spaces, dots, dashes or underscores")
        allocs = _parse_allocations(allocations)
        metrics = _metrics(allocs)
        sender = gl.message.sender_address
        if not self._has(sender):
            self.plan_count = u256(int(self.plan_count) + 1)
        self.plans[sender] = json.dumps({"name": name.strip(), "allocations": allocs, "metrics": metrics})
        self.analyses[sender] = ""  # an old analysis no longer matches the new plan
        return {"saved": True, "metrics": metrics}

    @gl.public.write
    def analyze_plan(self) -> typing.Any:
        sender = gl.message.sender_address
        if not self._has(sender):
            _fail("Save a plan first")
        plan = json.loads(self.plans[sender])
        metrics = plan["metrics"]
        task = _build_task(metrics)

        def evaluate():
            raw = gl.nondet.exec_prompt(task, response_format="json")
            return _plain(raw)

        raw = gl.eq_principle.prompt_comparative(
            evaluate,
            principle=(
                "The summary and suggestion must reach the same conclusion about the concentration "
                "risk level stated in the facts. Wording may differ. Reject invalid JSON, and reject "
                "any text that promises rewards, returns or safety."
            ),
        )
        ai = _normalize_ai(raw, metrics["risk"])
        result = {
            "risk": metrics["risk"],  # decided by deterministic rules, never by the model
            "validators": metrics["validators"],
            "largest_bps": metrics["largest_bps"],
            "effective_x100": metrics["effective_x100"],
            "summary": ai["summary"],
            "suggestion": ai["suggestion"],
        }
        self.analyses[sender] = json.dumps(result)
        return result

    @gl.public.write
    def clear_plan(self) -> None:
        sender = gl.message.sender_address
        if self._has(sender):
            self.plan_count = u256(int(self.plan_count) - 1)
        if sender in self.plans:
            self.plans[sender] = ""
        if sender in self.analyses:
            self.analyses[sender] = ""

    # ---------------- view methods ----------------

    @gl.public.view
    def has_plan(self, owner: str) -> bool:
        return self._has(_address_arg(owner))

    @gl.public.view
    def get_plan(self, owner: str) -> str:
        who = _address_arg(owner)
        if not self._has(who):
            _fail("Plan not found")
        return self.plans[who]

    @gl.public.view
    def get_analysis(self, owner: str) -> str:
        who = _address_arg(owner)
        if who not in self.analyses or self.analyses[who] == "":
            _fail("Analysis not found")
        return self.analyses[who]

    @gl.public.view
    def get_plan_count(self) -> int:
        return int(self.plan_count)
