"""Reference arithmetic only: these tests do not exercise Billefy."""
import copy
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from reference_check import D, load_fixture, number, validate

ROOT = Path(__file__).resolve().parents[2]
FIXTURE = ROOT / "docs/financial-audit/caso_prueba_contable_enero_2027.json"
SCRIPT = ROOT / "tools/financial_audit/reference_check.py"


class ReferenceTests(unittest.TestCase):
    def setUp(self):
        self.fixture = load_fixture(FIXTURE)

    def test_complete_reference_and_classification(self):
        original = copy.deepcopy(self.fixture)
        report = validate(self.fixture)
        self.assertEqual(self.fixture, original)
        self.assertEqual((report["status"], report["reference_only"], report["application_acceptance"]),
                         ("PASS", True, "NOT_RUN"))
        self.assertEqual(len(report["stages"]), 23)
        # Cash policy: credit-card settlement is financing; interest is operating.
        expected = [(5000, 0, 0), (1200, 0, 0), (0, 0, 0), (0, 0, 0), (-1400, 0, 0),
                    (-550, 0, 0), (0, 0, 0), (-150, 0, 0), (-220, 0, 0), (-80, 0, 0),
                    (-130, 0, 0), (0, 0, 0), (0, -600, 0), (0, 0, -700), (-30, 0, -500),
                    (0, -800, 0), (20, 300, 0), (0, 0, 900), (0, 0, -100), (40, 0, 0), (0, 0, 0)]
        for stage, amounts in zip(report["stages"][1:-1], expected):
            self.assertEqual(tuple(D(v) for v in stage["cash_flow"].values()), tuple(map(D, amounts)))

    def test_every_expected_leaf_is_checked(self):
        def leaves(value, path=()):
            for key, child in value.items():
                yield from leaves(child, path + (key,)) if isinstance(child, dict) else [(path + (key,), child)]
        sections = [(self.fixture[k], (k,)) for k in
                    ("saldos_apertura", "saldos_cierre_por_cuenta", "resultado_esperado")]
        sections += [(e["esperado_despues"], ("eventos", i, "esperado_despues"))
                     for i, e in enumerate(self.fixture["eventos"])]
        for section, prefix in sections:
            for suffix, value in leaves(section):
                with self.subTest(path=prefix + suffix):
                    altered = copy.deepcopy(self.fixture)
                    target = altered
                    for key in (prefix + suffix)[:-1]:
                        target = target[key]
                    target[suffix[-1]] = str(D(value) + 1)
                    self.assertEqual(validate(altered)["status"], "FAIL")

    def test_inexact_or_nonfinite_inputs_rejected(self):
        for value in (0.1, True, "NaN", "Infinity"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                number(value)
        self.assertEqual(number("0.1") + number("0.2"), D("0.3"))

    def test_cli_pass_and_rejections_leave_input_unchanged(self):
        for mode in ("valid", "unbalanced", "wrong_step"):
            with self.subTest(mode=mode), tempfile.TemporaryDirectory(prefix="financial-reference-") as scratch:
                fixture = copy.deepcopy(self.fixture)
                if mode == "unbalanced":
                    fixture["eventos"][0]["debe"][0]["importe"] = "5001"
                if mode == "wrong_step":
                    fixture["eventos"][0]["esperado_despues"]["banco"] = "11001"
                source, output = Path(scratch) / "fixture.json", Path(scratch) / "evidence.json"
                source.write_text(json.dumps(fixture))
                original = source.read_bytes()
                result = subprocess.run([sys.executable, str(SCRIPT), "--fixture", str(source),
                                         "--output", str(output)], capture_output=True, text=True, timeout=10)
                status = "PASS" if mode == "valid" else "FAIL"
                self.assertEqual(result.returncode, 0 if mode == "valid" else 1)
                self.assertEqual(result.stderr, "")
                self.assertEqual(result.stdout, json.dumps({"status": status, "reference_only": True,
                                                           "application_acceptance": "NOT_RUN"}) + "\n")
                evidence = json.loads(output.read_text())
                self.assertEqual(evidence["status"], status)
                self.assertIs(evidence["reference_only"], True)
                self.assertEqual(evidence["application_acceptance"], "NOT_RUN")
                if mode != "valid":
                    name = "balanced_entry" if mode == "unbalanced" else "all_step_expectations"
                    checks = {c["check"]: c["status"] for c in evidence["stages"][1]["checks"]}
                    self.assertEqual(checks[name], "FAIL")
                self.assertEqual(source.read_bytes(), original)


if __name__ == "__main__":
    unittest.main()
