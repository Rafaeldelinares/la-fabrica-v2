#!/usr/bin/env python3
"""
Engram → Obsidian Vault Exporter
Exports Engram observations as Markdown files and syncs to Dropbox via rclone.
"""

import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ENGRAM_BIN = "/home/rafael/go/bin/engram"
EXPORT_TMP = "/tmp/engram-export.json"
VAULT_DIR = Path("/opt/fabrica/engram-vault")
RCLONE_DEST = "dropbox:BovedaObsidian/Engram"


def slugify(text: str) -> str:
    """Convert text to a URL/filename-safe slug."""
    text = text.lower()
    text = re.sub(r"[^\w\s\-/]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")


def run_engram_export() -> dict:
    """Run engram export and return parsed JSON."""
    result = subprocess.run(
        [ENGRAM_BIN, "export", EXPORT_TMP],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"ERROR: engram export failed:\n{result.stderr}", file=sys.stderr)
        sys.exit(1)
    with open(EXPORT_TMP, "r", encoding="utf-8") as f:
        return json.load(f)


def build_frontmatter(obs: dict) -> str:
    """Build YAML frontmatter block for an observation."""
    topic_key = obs.get("topic_key") or ""
    tags = ["engram", obs.get("type", ""), obs.get("project", "")]
    tags = [t for t in tags if t]

    lines = [
        "---",
        f"id: {obs['id']}",
        f"sync_id: \"{obs['sync_id']}\"",
        f"title: \"{obs['title'].replace(chr(34), chr(39))}\"",
        f"type: {obs.get('type', '')}",
        f"project: {obs.get('project', '')}",
        f"topic_key: \"{topic_key}\"",
        f"scope: {obs.get('scope', 'project')}",
        f"created_at: \"{obs.get('created_at', '')}\"",
        f"updated_at: \"{obs.get('updated_at', '')}\"",
        f"revision_count: {obs.get('revision_count', 1)}",
        f"tags: [{', '.join(tags)}]",
        "---",
    ]
    return "\n".join(lines)


def build_body(obs: dict) -> str:
    """Build the Markdown body of a note."""
    title = obs.get("title", "")
    content = obs.get("content", "")
    obs_type = obs.get("type", "")
    project = obs.get("project", "")
    created_at = obs.get("created_at", "")
    return f"# {title}\n\n{content}\n\n---\n*Engram · {obs_type} · {project} · {created_at}*\n"


def get_note_path(obs: dict) -> Path:
    """Determine the file path for an observation."""
    project = slugify(obs.get("project", "unknown"))
    topic_key = obs.get("topic_key") or ""

    if topic_key:
        # topic_key may contain slashes — treat as sub-path
        slug_key = slugify(topic_key)
        return VAULT_DIR / project / f"{slug_key}.md"
    else:
        obs_type = slugify(obs.get("type", "manual"))
        title_slug = slugify(obs.get("title", "untitled"))[:60]
        filename = f"{obs['id']:04d}-{title_slug}.md"
        return VAULT_DIR / project / obs_type / filename


def get_existing_updated_at(path: Path) -> str | None:
    """Read the updated_at value from existing frontmatter, or None."""
    if not path.exists():
        return None
    try:
        text = path.read_text(encoding="utf-8")
        match = re.search(r'^updated_at:\s*"([^"]+)"', text, re.MULTILINE)
        if match:
            return match.group(1)
    except Exception:
        pass
    return None


def write_note(obs: dict) -> tuple[Path, bool]:
    """Write a note file. Returns (path, was_written)."""
    path = get_note_path(obs)
    updated_at = obs.get("updated_at", "")

    existing = get_existing_updated_at(path)
    if existing and existing == updated_at:
        return path, False

    path.parent.mkdir(parents=True, exist_ok=True)
    frontmatter = build_frontmatter(obs)
    body = build_body(obs)
    path.write_text(f"{frontmatter}\n\n{body}", encoding="utf-8")
    return path, True


def build_index(observations: list[dict], note_paths: dict[int, Path]) -> str:
    """Build _index.md with a table per project."""
    # Group by project
    by_project: dict[str, list[dict]] = {}
    for obs in observations:
        proj = obs.get("project", "unknown")
        by_project.setdefault(proj, []).append(obs)

    lines = [
        "# Engram Vault — Index",
        "",
        f"> Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}  ",
        f"> Total observations: {len(observations)}  ",
        f"> Projects: {len(by_project)}",
        "",
    ]

    for proj in sorted(by_project.keys()):
        proj_obs = sorted(by_project[proj], key=lambda o: o.get("updated_at", ""), reverse=True)
        lines.append(f"## {proj} ({len(proj_obs)})")
        lines.append("")
        lines.append("| # | Title | Type | Updated |")
        lines.append("|---|-------|------|---------|")
        for obs in proj_obs:
            path = note_paths.get(obs["id"])
            if path:
                # Obsidian wikilink — relative from vault root
                rel = path.relative_to(VAULT_DIR)
                note_name = str(rel).replace(".md", "")
                link = f"[[{note_name}|{obs['title']}]]"
            else:
                link = obs["title"]
            obs_type = obs.get("type", "")
            updated = obs.get("updated_at", "")[:10]
            lines.append(f"| {obs['id']} | {link} | {obs_type} | {updated} |")
        lines.append("")

    return "\n".join(lines)


def run_rclone_sync() -> bool:
    """Sync vault to Dropbox via rclone. Returns True on success."""
    result = subprocess.run(
        ["rclone", "sync", str(VAULT_DIR), RCLONE_DEST, "--update"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(f"WARNING: rclone sync failed:\n{result.stderr}", file=sys.stderr)
        return False
    return True


def main() -> None:
    print("=== Engram → Obsidian Export ===")
    print(f"Vault: {VAULT_DIR}")
    print(f"Destination: {RCLONE_DEST}")
    print()

    # Step 1: Export from Engram
    print("1. Running engram export...")
    data = run_engram_export()
    observations = data.get("observations", [])
    print(f"   Exported {len(observations)} observations from {len(data.get('sessions', []))} sessions")

    # Step 2: Write notes
    print("2. Writing Markdown notes...")
    VAULT_DIR.mkdir(parents=True, exist_ok=True)

    written = 0
    skipped = 0
    note_paths: dict[int, Path] = {}

    for obs in observations:
        path, was_written = write_note(obs)
        note_paths[obs["id"]] = path
        if was_written:
            written += 1
        else:
            skipped += 1

    print(f"   Written: {written} | Skipped (unchanged): {skipped}")

    # Step 3: Build and write index
    print("3. Building _index.md...")
    index_content = build_index(observations, note_paths)
    index_path = VAULT_DIR / "_index.md"
    index_path.write_text(index_content, encoding="utf-8")
    print(f"   Index written: {index_path}")

    # Step 4: rclone sync
    print("4. Syncing to Dropbox via rclone...")
    sync_ok = run_rclone_sync()
    sync_status = "SUCCESS" if sync_ok else "FAILED"
    print(f"   Sync: {sync_status}")

    # Step 5: Summary
    projects = len(set(o.get("project", "unknown") for o in observations))
    print()
    print("=== Summary ===")
    print(f"  Notes generated/updated : {written}")
    print(f"  Notes skipped (no change): {skipped}")
    print(f"  Total notes in vault     : {written + skipped}")
    print(f"  Projects                 : {projects}")
    print(f"  rclone sync              : {sync_status}")
    print()
    if not sync_ok:
        sys.exit(1)


if __name__ == "__main__":
    main()
