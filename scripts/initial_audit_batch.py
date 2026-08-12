#!/usr/bin/env python3
"""Run initial GBP audits for active clients that have never been audited."""

import argparse
import json
import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

WEBHOOK_URL = "https://n8n.ia-bybusiness.online/webhook/crm-gbp-ficha-audit"
SSH_HOST = "root@72.60.191.179"
PSQL_COMMAND = (
    "docker exec -i fabrica-postgres-1 "
    "psql -U rafael_admin -d crm_bybusiness -At -F '|'"
)
SELECT_SQL = """
SELECT id, google_cid, nombre_comercial
FROM clientes.clientes
WHERE estado='activo'
  AND google_cid IS NOT NULL
  AND reputacion_at IS NULL
ORDER BY id
"""
LOG_PATH = Path("/opt/fabrica/logs/initial_audit_batch.log")
STATE_PATH = Path("/opt/fabrica/state/initial_audit_batch.json")
HTTP_TIMEOUT_SECONDS = 60
RATE_LIMIT_SECONDS = 0.5
SUMMARY_INTERVAL = 25


def log(message: str) -> None:
    """Append one timestamped message to the batch log and stdout."""
    timestamp = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"[{timestamp}] {message}"
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with LOG_PATH.open("a", encoding="utf-8") as log_file:
        log_file.write(line + "\n")
    print(line, flush=True)


def run_query(sql: str) -> str:
    """Execute read-only SQL through SSH and the VPS PostgreSQL container."""
    normalized_sql = " ".join(sql.split())
    escaped_sql = normalized_sql.replace("'", "'\"'\"'")
    command = [
        "ssh",
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=no",
        SSH_HOST,
        f"{PSQL_COMMAND} -c '{escaped_sql}'",
    ]
    result = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(f"Database query failed (exit {result.returncode}): {detail[:500]}")
    return result.stdout.strip()


def load_clients() -> list[dict]:
    """Return active clients with google_cid and no reputation audit."""
    clients = []
    for line in run_query(SELECT_SQL).splitlines():
        if not line.strip():
            continue
        parts = line.split("|", 2)
        if len(parts) != 3:
            log(f"WARN malformed database row skipped: {line[:200]}")
            continue
        try:
            client_id = int(parts[0])
        except ValueError:
            log(f"WARN invalid client id skipped: {line[:200]}")
            continue
        clients.append(
            {
                "id": client_id,
                "google_cid": parts[1],
                "nombre_comercial": parts[2],
            }
        )
    return clients


def load_state() -> dict:
    """Load resumable processed client IDs from disk."""
    if not STATE_PATH.exists():
        return {"processed_ids": [], "updated_at": None}
    try:
        with STATE_PATH.open("r", encoding="utf-8") as state_file:
            state = json.load(state_file)
        state["processed_ids"] = [int(value) for value in state.get("processed_ids", [])]
        return state
    except (OSError, ValueError, TypeError, json.JSONDecodeError) as error:
        log(f"WARN state file unreadable ({error}); starting with empty state")
        return {"processed_ids": [], "updated_at": None}


def save_state(state: dict) -> None:
    """Atomically persist successful and failed attempts for resume."""
    state["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
    temporary_path = STATE_PATH.with_suffix(".json.tmp")
    with temporary_path.open("w", encoding="utf-8") as state_file:
        json.dump(state, state_file, ensure_ascii=False, indent=2)
    temporary_path.replace(STATE_PATH)


def response_detail(response: requests.Response) -> str:
    """Return a compact response detail suitable for one-line logging."""
    try:
        content = response.json()
        detail = json.dumps(content, ensure_ascii=False, separators=(",", ":"))
    except ValueError:
        detail = response.text.strip()
    return detail.replace("\n", " ")[:500] or f"HTTP {response.status_code}"


def audit_client(client: dict) -> tuple[str, str]:
    """Call the public n8n audit webhook for one client."""
    payload = {
        "place_id": client["google_cid"],
        "refresh": True,
        "source": "initial_audit",
    }
    headers = {
        "Content-Type": "application/json",
        "x-user-role": "admin",
    }
    try:
        response = requests.post(
            WEBHOOK_URL,
            json=payload,
            headers=headers,
            timeout=HTTP_TIMEOUT_SECONDS,
        )
        detail = response_detail(response)
        if response.ok:
            return "ok", detail
        return "error", f"HTTP {response.status_code}: {detail}"
    except requests.RequestException as error:
        return "error", f"{type(error).__name__}: {error}"


def format_progress(position: int, total: int, started_at: float) -> tuple[int, int]:
    """Return elapsed and ETA seconds based on completed attempts."""
    elapsed_seconds = max(0, round(time.monotonic() - started_at))
    average_seconds = elapsed_seconds / position if position else 0
    eta_seconds = max(0, round(average_seconds * (total - position)))
    return elapsed_seconds, eta_seconds


def main() -> int:
    """Run the resumable audit batch and continue after individual failures."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Maximum clients to attempt")
    arguments = parser.parse_args()
    if arguments.limit is not None and arguments.limit < 1:
        parser.error("--limit must be greater than zero")

    clients = load_clients()
    state = load_state()
    processed_ids = set(state["processed_ids"])
    pending_clients = [client for client in clients if client["id"] not in processed_ids]
    if arguments.limit is not None:
        pending_clients = pending_clients[: arguments.limit]

    total = len(pending_clients)
    log(
        f"START eligible={len(clients)} already_processed={len(processed_ids)} "
        f"scheduled={total} limit={arguments.limit}"
    )
    if total == 0:
        log("FINAL attempted=0 ok=0 error=0 elapsed=0s remaining=0")
        return 0

    started_at = time.monotonic()
    success_count = 0
    error_count = 0

    for position, client in enumerate(pending_clients, start=1):
        call_started_at = time.monotonic()
        status, detail = audit_client(client)
        call_seconds = round(time.monotonic() - call_started_at)
        if status == "ok":
            success_count += 1
        else:
            error_count += 1

        processed_ids.add(client["id"])
        state["processed_ids"] = sorted(processed_ids)
        save_state(state)
        _, eta_seconds = format_progress(position, total, started_at)
        log(
            f"[{position}/{total}] ({call_seconds}s, ETA {eta_seconds}s) "
            f"Audit id={client['id']} cid={client['google_cid']} -> {status}: {detail}"
        )

        if position % SUMMARY_INTERVAL == 0:
            elapsed_seconds, summary_eta = format_progress(position, total, started_at)
            log(
                f"SUMMARY attempted={position}/{total} ok={success_count} "
                f"error={error_count} elapsed={elapsed_seconds}s ETA={summary_eta}s"
            )

        if position < total:
            time.sleep(RATE_LIMIT_SECONDS)

    elapsed_seconds, _ = format_progress(total, total, started_at)
    remaining = max(0, len(clients) - total)
    log(
        f"FINAL attempted={total} ok={success_count} error={error_count} "
        f"elapsed={elapsed_seconds}s remaining={remaining}"
    )
    return 0 if error_count == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
