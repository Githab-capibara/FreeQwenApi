"""Integrity checks for the CI/CD pipeline configuration.

The suite only uses the Python standard library so that it can run in every
CI job without adding runtime dependencies to the project.

The checks are deliberately fail-closed: a missing or malformed pipeline
asset must stop the build, not be silently ignored.
"""

from __future__ import annotations

import json
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
WORKFLOW_DIR = REPO_ROOT / ".github" / "workflows"
BASELINE_DIR = REPO_ROOT / ".security-baseline"

# Files that the workflows depend on. If one of them disappears, the
# corresponding security job would fail at runtime with a confusing error.
REQUIRED_PIPELINE_FILES = (
    ".gitleaks.toml",
    ".gitleaks-baseline.json",
    ".semgrep.yml",
    ".spectral.yaml",
    ".bandit",
    ".njsscan",
    "schemathesis.toml",
    "openapi/openapi.yaml",
    ".github/scanner-images.env",
    "scripts/ci/auth-proxy.js",
    "scripts/ci/baseline-check.sh",
    "scripts/ci/build-dast-spec.js",
    "scripts/ci/run-semgrep.sh",
    "scripts/ci/update-baselines.sh",
    "scripts/ci/verify-api-auth-enforcement.sh",
    "scripts/ci/verify-api-contract-parity.sh",
    "scripts/ci/verify-no-secrets-in-image.sh",
    ".security-baseline/zap-rules.cfg",
    ".github/dependabot.yml",
    ".github/CODEOWNERS",
    ".github/security-areas.json",
    "SECURITY.md",
)

BASELINED_SCANNERS = (
    "bandit",
    "bearer",
    "checkov",
    "dockle",
    "grype-image",
    "njsscan",
    "npm-audit",
    "osv",
    "semgrep",
    "trivy-image",
)

SHA_PIN = re.compile(r"^[0-9a-f]{40}$")
USES_PATTERN = re.compile(r"^\s*-?\s*uses:\s*(?P<reference>\S+)\s*$", re.MULTILINE)


def workflow_files() -> list[Path]:
    if not WORKFLOW_DIR.is_dir():
        return []
    return sorted(
        path
        for path in WORKFLOW_DIR.iterdir()
        if path.suffix in {".yml", ".yaml"}
    )


class PipelineAssetTest(unittest.TestCase):
    """Every asset the pipeline relies on must be present and non-empty."""

    def test_required_pipeline_files_exist(self) -> None:
        for relative in REQUIRED_PIPELINE_FILES:
            path = REPO_ROOT / relative
            with self.subTest(asset=relative):
                self.assertTrue(path.is_file(), f"missing pipeline asset: {relative}")
                self.assertGreater(
                    path.stat().st_size, 0, f"empty pipeline asset: {relative}"
                )

    def test_workflows_exist(self) -> None:
        self.assertTrue(workflow_files(), "no workflow files found")

    def test_baseline_files_are_json_arrays(self) -> None:
        for scanner in BASELINED_SCANNERS:
            path = BASELINE_DIR / f"{scanner}.json"
            with self.subTest(scanner=scanner):
                self.assertTrue(path.is_file(), f"missing baseline: {path.name}")
                payload = json.loads(path.read_text(encoding="utf-8"))
                self.assertIsInstance(payload, list)
                self.assertGreater(len(payload), 0)
                for entry in payload:
                    self.assertIsInstance(entry, str)

    def test_gitleaks_baseline_is_a_json_array(self) -> None:
        path = REPO_ROOT / ".gitleaks-baseline.json"
        payload = json.loads(path.read_text(encoding="utf-8"))
        self.assertIsInstance(payload, list)
        self.assertGreater(len(payload), 0)

    def test_every_security_area_is_covered_by_at_least_three_tools(self) -> None:
        path = REPO_ROOT / ".github" / "security-areas.json"
        matrix = json.loads(path.read_text(encoding="utf-8"))
        minimum = matrix.get("minimumToolsPerArea", 3)
        areas = matrix.get("areas", [])
        self.assertEqual(len(areas), 10, "the pipeline must cover exactly ten areas")
        for area in areas:
            with self.subTest(area=area.get("id")):
                names = [tool["name"] for tool in area.get("tools", [])]
                self.assertGreaterEqual(
                    len(names),
                    minimum,
                    f"area {area.get('id')} is covered by fewer than {minimum} tools",
                )
                self.assertEqual(len(names), len(set(names)))
                contents = "\n".join(
                    (REPO_ROOT / file).read_text(encoding="utf-8")
                    for file in area.get("files", [])
                )
                for tool in area.get("tools", []):
                    with self.subTest(area=area.get("id"), tool=tool["name"]):
                        self.assertIn(
                            tool["match"],
                            contents,
                            f"area {area.get('id')} claims {tool['name']} "
                            "but the pipeline never invokes it",
                        )


class WorkflowPolicyTest(unittest.TestCase):
    """The workflows themselves must follow the fail-closed policy."""

    def test_actions_are_pinned_to_a_full_commit_sha(self) -> None:
        for workflow in workflow_files():
            content = workflow.read_text(encoding="utf-8")
            for match in USES_PATTERN.finditer(content):
                reference = match.group("reference")
                if reference.startswith("./"):
                    continue
                if "@" not in reference:
                    self.fail(f"{workflow.name}: action without a version pin: {reference}")
                _, _, revision = reference.partition("@")
                with self.subTest(workflow=workflow.name, action=reference):
                    self.assertRegex(
                        revision,
                        SHA_PIN,
                        f"{workflow.name}: {reference} is not pinned to a full commit SHA",
                    )

    def test_no_continue_on_error(self) -> None:
        for workflow in workflow_files():
            content = workflow.read_text(encoding="utf-8")
            with self.subTest(workflow=workflow.name):
                self.assertNotIn(
                    "continue-on-error: true",
                    content,
                    f"{workflow.name}: continue-on-error must not be enabled",
                )

    def test_workflows_declare_least_privilege_permissions(self) -> None:
        for workflow in workflow_files():
            content = workflow.read_text(encoding="utf-8")
            with self.subTest(workflow=workflow.name):
                self.assertIn(
                    "permissions:",
                    content,
                    f"{workflow.name}: top-level permissions block is missing",
                )
                self.assertIn(
                    "contents: read",
                    content,
                    f"{workflow.name}: permissions.contents must be 'read'",
                )

    def test_jobs_declare_a_timeout(self) -> None:
        for workflow in workflow_files():
            content = workflow.read_text(encoding="utf-8")
            with self.subTest(workflow=workflow.name):
                self.assertIn(
                    "timeout-minutes:",
                    content,
                    f"{workflow.name}: jobs must declare timeout-minutes",
                )

    def test_workflow_scripts_do_not_swallow_scanner_failures(self) -> None:
        scanner = re.compile(
            r"\b(semgrep|bandit|bearer|njsscan|gitleaks|trufflehog|osv-scanner|"
            r"npm audit|pip-audit|checkov|trivy|grype|spectral|schemathesis|zizmor|"
            r"actionlint|hadolint|dockle|kics|syft)\b"
        )
        for workflow in workflow_files():
            content = workflow.read_text(encoding="utf-8")
            for number, line in enumerate(content.splitlines(), start=1):
                if not scanner.search(line):
                    continue
                with self.subTest(workflow=workflow.name, line=number):
                    self.assertNotRegex(
                        line,
                        r"\|\|\s*true",
                        f"{workflow.name}:{number}: scanner failure must not be swallowed",
                    )


class ShellHelperTest(unittest.TestCase):
    """CI helper scripts must be strict and syntactically valid."""

    def test_helper_scripts_use_strict_mode(self) -> None:
        scripts_dir = REPO_ROOT / "scripts" / "ci"
        scripts = sorted(path for path in scripts_dir.glob("*.sh"))
        self.assertTrue(scripts, "no CI helper scripts found")
        for script in scripts:
            content = script.read_text(encoding="utf-8")
            with self.subTest(script=script.name):
                self.assertIn(
                    "set -euo pipefail",
                    content,
                    f"{script.name}: strict shell mode is required",
                )

    def test_baseline_check_fails_on_new_findings(self) -> None:
        content = (REPO_ROOT / "scripts" / "ci" / "baseline-check.sh").read_text(
            encoding="utf-8"
        )
        marker = 'if [[ -n "${new_keys}" ]]'
        self.assertIn(marker, content)
        branch = content.split(marker, 1)[1]
        branch = branch.split("\nfi", 1)[0]
        self.assertIn("exit 1", branch)

    def test_the_semgrep_runner_fails_on_a_scanner_failure(self) -> None:
        content = (REPO_ROOT / "scripts" / "ci" / "run-semgrep.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn(
            "if ! semgrep scan",
            content,
            "the Semgrep runner must check the exit status of the scanner",
        )
        self.assertIn(
            "exit 1",
            content,
            "the Semgrep runner must fail when the scanner itself fails",
        )
        # `--error` turns a finding into a scanner failure and would bypass
        # the baseline comparison. Only the command line is inspected, so that
        # the explanatory comment in the script may mention the flag.
        for line in content.splitlines():
            stripped = line.strip()
            if stripped.startswith("#"):
                continue
            self.assertNotIn(
                "--error",
                stripped,
                "--error turns a finding into a scanner failure and would "
                "bypass the baseline comparison",
            )

    def test_ci_and_the_baseline_generator_share_the_semgrep_rule_set(self) -> None:
        workflow = (WORKFLOW_DIR / "security.yml").read_text(encoding="utf-8")
        generator = (REPO_ROOT / "scripts" / "ci" / "update-baselines.sh").read_text(
            encoding="utf-8"
        )
        self.assertIn(
            "scripts/ci/run-semgrep.sh",
            workflow,
            "the CI job must use the shared Semgrep runner",
        )
        self.assertIn(
            "run-semgrep.sh",
            generator,
            "the baseline generator must use the shared Semgrep runner",
        )


if __name__ == "__main__":
    unittest.main()
