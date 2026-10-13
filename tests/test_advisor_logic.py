"""
Local tests for contracts/stakewise_advisor.py. No GenLayer install needed.
A small stub replaces the `genlayer` module so the pure logic (validation, concentration
metrics, prompt framing, output cleaning) runs as plain Python.
These do NOT prove the contract works inside GenVM; deploy it to Studio for that.

Run:  python -m pytest -v tests/test_advisor_logic.py
"""
import importlib.util
import json
import pathlib
import sys
import types

import pytest

ROOT = pathlib.Path(__file__).resolve().parent.parent


class UserError(Exception):
    pass


def _load():
    gl = types.SimpleNamespace(
        Contract=type("Contract", (), {}),
        vm=types.SimpleNamespace(UserError=UserError),
        public=types.SimpleNamespace(view=lambda f: f, write=lambda f: f),
    )

    class TreeMap:
        def __class_getitem__(cls, item):
            return cls

    class Address:
        """Like GenVM's Address: NOT a str, exposes as_hex."""

        def __init__(self, value):
            self._value = str(value)

        @property
        def as_hex(self):
            return self._value

    mod = types.ModuleType("genlayer")
    mod.gl = gl
    mod.TreeMap = TreeMap
    mod.Address = Address
    mod.u256 = int
    sys.modules["genlayer"] = mod
    spec = importlib.util.spec_from_file_location("stakewise_advisor", ROOT / "contracts" / "stakewise_advisor.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


m = _load()
A = "0x" + "a" * 40
B = "0x" + "B" * 40
C = "0x" + "c" * 40


def alloc(*pairs):
    return json.dumps([{"validator": v, "bps": b} for v, b in pairs])


def test_valid_plan_is_normalised():
    out = m._parse_allocations(alloc((A, 6000), (B, 4000)))
    assert out[1]["validator"] == B.lower()


@pytest.mark.parametrize(
    "raw",
    [
        "not json",
        "[]",
        alloc((A, 9999)),
        alloc((A, 5000), (A, 5000)),
        alloc(("0x123", 10000)),
        json.dumps([{"validator": A, "bps": 50.5}, {"validator": B, "bps": 9949.5}]),
        json.dumps([{"validator": A, "bps": True}]),
        alloc((A, 0), (B, 10000)),
        json.dumps([{"validator": "0x" + format(i, "040x"), "bps": 1} for i in range(21)]),
    ],
)
def test_bad_allocations_rejected(raw):
    with pytest.raises(UserError):
        m._parse_allocations(raw)


def test_ready_made_array_is_accepted():
    out = m._parse_allocations([{"validator": A, "bps": 6000}, {"validator": B, "bps": 4000}])
    assert [x["bps"] for x in out] == [6000, 4000]
    with pytest.raises(UserError):
        m._parse_allocations([{"validator": A, "bps": 1}])


def test_address_objects_are_accepted():
    out = m._parse_allocations([{"validator": m.Address(A), "bps": 6000}, {"validator": m.Address(B), "bps": 4000}])
    assert [x["validator"] for x in out] == [A.lower(), B.lower()]
    with pytest.raises(UserError):
        m._parse_allocations([{"validator": m.Address("0x123"), "bps": 10000}])


def test_address_argument_accepts_text_and_address():
    assert isinstance(m._address_arg(A), m.Address)
    already = m.Address(B)
    assert m._address_arg(already) is already
    for bad in ["0x123", "nope", 5]:
        with pytest.raises(UserError):
            m._address_arg(bad)


def test_metrics():
    assert m._metrics([{"validator": A, "bps": 10000}]) == {
        "validators": 1, "largest_bps": 10000, "effective_x100": 100, "risk": "HIGH"}
    two = m._metrics([{"validator": A, "bps": 5000}, {"validator": B, "bps": 5000}])
    assert two["effective_x100"] == 200 and two["risk"] == "MEDIUM"
    three = m._metrics([{"validator": A, "bps": 3334}, {"validator": B, "bps": 3333}, {"validator": C, "bps": 3333}])
    assert three["risk"] == "LOW" and 299 <= three["effective_x100"] <= 300
    assert m._metrics([{"validator": A, "bps": 8000}, {"validator": B, "bps": 2000}])["risk"] == "HIGH"


def test_prompt_has_exact_numbers_and_no_addresses():
    task = m._build_task(m._metrics([{"validator": A, "bps": 10000}]))
    assert "100.00 percent" in task and "HIGH" in task and "0x" not in task


def test_ai_output_is_cleaned():
    good = m._normalize_ai(json.dumps({"summary": "Concentrated.", "suggestion": "Spread it."}), "HIGH")
    assert good["summary"] == "Concentrated."
    bad = m._normalize_ai(json.dumps({"summary": "This is guaranteed profit", "suggestion": "ok"}), "HIGH")
    assert bad["summary"] == m.FALLBACK_SUMMARY["HIGH"]
    assert m._normalize_ai("garbage", "LOW")["summary"] == m.FALLBACK_SUMMARY["LOW"]
    assert len(m._normalize_ai(json.dumps({"summary": "x" * 2000, "suggestion": "y"}), "LOW")["summary"]) == 400


def test_name_rule():
    assert m.NAME_RE.match("My plan 1") is not None
    assert m.NAME_RE.match("<script>") is None
