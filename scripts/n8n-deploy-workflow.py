#!/usr/bin/env python3
"""
n8n-deploy-workflow.py
Deploy a workflow from LOCAL n8n to VPS n8n.

Handles known gotchas automatically:
  - Adds webhookId at node level (not in parameters) so clean paths work on VPS
  - Replaces host.docker.internal with 172.19.0.1 (Linux VPS container resolution)
  - Full deactivate → update → activate cycle

Usage:
  python3 n8n-deploy-workflow.py <workflow_id_or_name>
  python3 n8n-deploy-workflow.py CRM_47_GBP_CONFIRMAR
  python3 n8n-deploy-workflow.py 3EkLGdQPhPj0di2d
  python3 n8n-deploy-workflow.py --list         # list all local workflows
  python3 n8n-deploy-workflow.py --diff <id>    # show differences between local and VPS
"""

import sys
import json
import subprocess
import time

# ─── CONFIG ──────────────────────────────────────────────────────────────────

LOCAL_API  = "http://localhost:5678"
LOCAL_KEY  = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOGRjMTdiZS02OWMwLTQ4YmEtYmU1ZC05MGUxOGVhMDRhZDIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNTM1NzBlN2ItZDRlOS00MzYyLTljNzAtZDhlNjEwYTg5ZDRhIiwiaWF0IjoxNzcyNDAzNzg1fQ.MRQwI54tPAa-Z3wX-xUIcwQyeuOQs9MWULCEYUJWQX8"

VPS_HOST   = "root@72.60.191.179"
VPS_N8N    = "http://172.19.0.2:5678"
VPS_KEY    = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMWYyN2ZkMi1jY2NlLTRhZGQtYTNiNC01OGI4NTY3N2RhODkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODUzZWYxOTktMTNkOC00YWFhLTg0YzgtZGYyYTc0YWMyY2NjIiwiaWF0IjoxNzcyMTYwMzQ1fQ.XWlA72dTrr96u50HWYBgGJp6D2TzPQGwN4zP9YGPTDk"

# Reemplazos de URL: en VPS, host.docker.internal no resuelve → usar IP gateway
URL_REPLACEMENTS = {
    "host.docker.internal": "172.19.0.1",
}

# ─── HELPERS ─────────────────────────────────────────────────────────────────

def ok(msg):  print(f"  ✓ {msg}")
def info(msg): print(f"  → {msg}")
def err(msg):  print(f"  ✗ {msg}", file=sys.stderr)
def step(msg): print(f"\n[{msg}]")


def local_curl(method, path, body=None):
    """Call local n8n API directly."""
    cmd = ["curl", "-s", "-X", method,
           "-H", f"X-N8N-API-KEY: {LOCAL_KEY}",
           "-H", "Content-Type: application/json",
           f"{LOCAL_API}{path}"]
    if body:
        cmd += ["-d", json.dumps(body)]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"curl failed: {result.stderr}")
    return json.loads(result.stdout)


def vps_curl(method, path, body=None):
    """Call VPS n8n API via SSH."""
    payload = json.dumps(body) if body else None
    inner = f'curl -s -X {method} -H "X-N8N-API-KEY: {VPS_KEY}" -H "Content-Type: application/json"'
    if payload:
        # Write to temp file to avoid shell quoting issues
        write_cmd = f"echo '{json.dumps(payload).replace(chr(39), chr(39)+chr(92)+chr(39)+chr(39))}' > /tmp/_n8n_deploy_body.json"
        subprocess.run(["ssh", VPS_HOST, write_cmd], capture_output=True)
        inner += f" -d @/tmp/_n8n_deploy_body.json"
    inner += f" {VPS_N8N}{path}"
    result = subprocess.run(["ssh", VPS_HOST, inner], capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"SSH curl failed: {result.stderr}")
    try:
        return json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"Invalid JSON response: {result.stdout[:200]}")


def vps_curl_with_file(method, path, body):
    """Call VPS n8n API with body via temp file (avoids quoting issues for large payloads)."""
    import tempfile, os
    # Write body to local temp file, scp to VPS, then curl
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        json.dump(body, f)
        tmp_path = f.name
    try:
        subprocess.run(["scp", "-q", tmp_path, f"{VPS_HOST}:/tmp/_n8n_payload.json"],
                       check=True, capture_output=True)
        inner = (f'curl -s -X {method} '
                 f'-H "X-N8N-API-KEY: {VPS_KEY}" '
                 f'-H "Content-Type: application/json" '
                 f'-d @/tmp/_n8n_payload.json '
                 f'{VPS_N8N}{path}')
        result = subprocess.run(["ssh", VPS_HOST, inner], capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"SSH curl failed: {result.stderr}")
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            raise RuntimeError(f"Invalid JSON: {result.stdout[:300]}")
    finally:
        os.unlink(tmp_path)


# ─── FIXES ───────────────────────────────────────────────────────────────────

def fix_webhook_ids(nodes):
    """
    Add webhookId at NODE LEVEL (not in parameters) for all webhook trigger nodes.
    This ensures VPS n8n registers clean paths instead of prefixed ones.
    Without this, n8n VPS 2.12.2 creates paths like: {workflowId}/webhook/{path}
    """
    fixed = []
    for node in nodes:
        if node.get("type") == "n8n-nodes-base.webhook":
            path = node.get("parameters", {}).get("path", "")
            if path and not node.get("webhookId"):
                node = dict(node)
                node["webhookId"] = path
                info(f"Added webhookId='{path}' to node '{node['name']}'")
            # Remove webhookId from parameters if accidentally placed there
            if "webhookId" in node.get("parameters", {}):
                node = dict(node)
                node["parameters"] = dict(node["parameters"])
                del node["parameters"]["webhookId"]
        fixed.append(node)
    return fixed


def fix_url_replacements(nodes):
    """Replace URLs that don't work in VPS Docker context."""
    import re
    fixed = []
    for node in nodes:
        node_str = json.dumps(node)
        changed = False
        for old, new in URL_REPLACEMENTS.items():
            if old in node_str:
                node_str = node_str.replace(old, new)
                info(f"Replaced '{old}' → '{new}' in node '{node.get('name')}'")
                changed = True
        fixed.append(json.loads(node_str) if changed else node)
    return fixed


def apply_fixes(workflow):
    """Apply all known VPS fixes to a workflow dict."""
    nodes = workflow.get("nodes", [])
    nodes = fix_webhook_ids(nodes)
    nodes = fix_url_replacements(nodes)
    return {**workflow, "nodes": nodes}


# ─── CORE LOGIC ──────────────────────────────────────────────────────────────

def get_local_workflow(id_or_name):
    """Get workflow from local n8n by ID or name."""
    # Try direct ID first
    try:
        wf = local_curl("GET", f"/api/v1/workflows/{id_or_name}")
        if "id" in wf:
            return wf
    except Exception:
        pass
    # Search by name
    all_wf = local_curl("GET", "/api/v1/workflows?limit=100")
    for wf in all_wf.get("data", []):
        if wf["name"].lower() == id_or_name.lower():
            return local_curl("GET", f"/api/v1/workflows/{wf['id']}")
    raise ValueError(f"Workflow not found in local n8n: {id_or_name}")


def find_vps_workflow_by_name(name):
    """Find workflow on VPS by name. Returns None if not found."""
    all_wf = vps_curl("GET", "/api/v1/workflows?limit=100")
    for wf in all_wf.get("data", []):
        if wf["name"] == name:
            return wf
    return None


def deploy_workflow(id_or_name):
    step(f"Deploy: {id_or_name}")

    # 1. Get local workflow
    info("Fetching from local n8n...")
    local_wf = get_local_workflow(id_or_name)
    name = local_wf["name"]
    ok(f"Local: {name} (id={local_wf['id']}, active={local_wf['active']})")

    # 2. Apply fixes for VPS
    step("Applying VPS fixes")
    fixed_wf = apply_fixes(local_wf)

    # Build deploy payload (strip read-only fields)
    payload = {
        "name":        fixed_wf["name"],
        "nodes":       fixed_wf["nodes"],
        "connections": fixed_wf["connections"],
        "settings":    fixed_wf.get("settings", {}),
        "staticData":  fixed_wf.get("staticData"),
    }

    # 3. Check if exists on VPS
    step("Checking VPS")
    vps_existing = find_vps_workflow_by_name(name)

    if vps_existing:
        vps_id = vps_existing["id"]
        ok(f"Found on VPS: id={vps_id}, active={vps_existing['active']}")

        # Deactivate if active
        if vps_existing["active"]:
            info("Deactivating on VPS...")
            vps_curl("POST", f"/api/v1/workflows/{vps_id}/deactivate")
            ok("Deactivated")

        # Update
        step("Updating on VPS")
        result = vps_curl_with_file("PUT", f"/api/v1/workflows/{vps_id}", payload)
        if "id" not in result:
            raise RuntimeError(f"Update failed: {result}")
        ok(f"Updated (id={vps_id})")

    else:
        # Create new
        step("Creating on VPS (new)")
        result = vps_curl_with_file("POST", "/api/v1/workflows", payload)
        if "id" not in result:
            raise RuntimeError(f"Create failed: {result}")
        vps_id = result["id"]
        ok(f"Created (id={vps_id})")

    # 4. Activate
    step("Activating on VPS")
    time.sleep(1)
    act_result = vps_curl("POST", f"/api/v1/workflows/{vps_id}/activate")
    if not act_result.get("active"):
        err(f"Activation response: {act_result}")
        raise RuntimeError("Workflow did not activate")
    ok(f"Active: {act_result['active']}")

    # 5. Verify webhook paths
    step("Verifying webhook paths")
    time.sleep(2)
    vps_check = vps_curl("GET", f"/api/v1/workflows/{vps_id}")
    webhook_nodes = [n for n in vps_check.get("nodes", [])
                     if n.get("type") == "n8n-nodes-base.webhook"]
    for wn in webhook_nodes:
        path = wn.get("parameters", {}).get("path", "")
        wid  = wn.get("webhookId", "")
        if wid:
            ok(f"Webhook node '{wn['name']}': path={path}, webhookId={wid}")
        else:
            err(f"Webhook node '{wn['name']}': missing webhookId! May register with prefixed path.")

    print(f"\n✅ Deploy completo: {name} → VPS (id={vps_id})")
    return vps_id


def list_workflows():
    """List all local workflows."""
    all_wf = local_curl("GET", "/api/v1/workflows?limit=100")
    print(f"\n{'ID':<20} {'ACTIVE':<8} {'NAME'}")
    print("-" * 70)
    for wf in sorted(all_wf.get("data", []), key=lambda x: x["name"]):
        active = "✓" if wf["active"] else "·"
        print(f"{wf['id']:<20} {active:<8} {wf['name']}")


def diff_workflow(id_or_name):
    """Show differences between local and VPS workflow."""
    local_wf = get_local_workflow(id_or_name)
    name = local_wf["name"]
    print(f"\nLocal:  id={local_wf['id']}, active={local_wf['active']}, updated={local_wf.get('updatedAt','?')}")

    vps_wf = find_vps_workflow_by_name(name)
    if not vps_wf:
        print(f"VPS:    NOT FOUND")
        return

    vps_full = vps_curl("GET", f"/api/v1/workflows/{vps_wf['id']}")
    print(f"VPS:    id={vps_wf['id']}, active={vps_wf['active']}, updated={vps_wf.get('updatedAt','?')}")

    # Compare node counts and names
    local_nodes = {n["name"]: n for n in local_wf.get("nodes", [])}
    vps_nodes   = {n["name"]: n for n in vps_full.get("nodes", [])}

    only_local = set(local_nodes) - set(vps_nodes)
    only_vps   = set(vps_nodes) - set(local_nodes)
    common     = set(local_nodes) & set(vps_nodes)

    if only_local:  print(f"\nOnly in LOCAL: {', '.join(only_local)}")
    if only_vps:    print(f"Only in VPS:   {', '.join(only_vps)}")

    diffs = []
    for node_name in common:
        ln = local_nodes[node_name]
        vn = vps_nodes[node_name]
        if json.dumps(ln.get("parameters")) != json.dumps(vn.get("parameters")):
            diffs.append(node_name)
    if diffs:
        print(f"\nNodes with different parameters: {', '.join(diffs)}")
    else:
        print(f"\nAll {len(common)} shared nodes have identical parameters.")

    # Check webhookId
    for node_name in common:
        ln = local_nodes[node_name]
        vn = vps_nodes[node_name]
        if ln.get("type") == "n8n-nodes-base.webhook":
            print(f"\nWebhook '{node_name}':")
            print(f"  LOCAL webhookId: {ln.get('webhookId', '(missing)')}")
            print(f"  VPS   webhookId: {vn.get('webhookId', '(missing)')}")


# ─── MAIN ─────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    cmd = sys.argv[1]

    if cmd == "--list":
        list_workflows()
    elif cmd == "--diff" and len(sys.argv) >= 3:
        diff_workflow(sys.argv[2])
    elif cmd.startswith("--"):
        print(__doc__)
        sys.exit(1)
    else:
        # Deploy one or more workflows
        for target in sys.argv[1:]:
            try:
                deploy_workflow(target)
            except Exception as e:
                err(str(e))
                sys.exit(1)
