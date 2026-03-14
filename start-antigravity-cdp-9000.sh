#!/usr/bin/env sh
set -eu
if ! command -v 'antigravity' >/dev/null 2>&1; then
  echo "Command 'antigravity' not found in PATH." >&2
  exit 1
fi
nohup 'antigravity' --remote-debugging-port=9000 "$@" >/dev/null 2>&1 &
