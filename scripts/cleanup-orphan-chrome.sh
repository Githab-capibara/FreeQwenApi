#!/usr/bin/env bash
# Kill orphaned headless Chrome instances left from previous crashed/restarted service runs.
# Runs as ExecStartPre BEFORE the service's own node process starts, so no legitimate
# Chrome instance exists at this point - anything matching the puppeteer binary path
# is a leftover that was reparented to systemd --user and would otherwise leak forever.
set -u

CHROME_BIN="${CHROME_PATH:-/home/d/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome}"

# pkill -f matches the full command line; both the main chrome binary and its
# chrome_crashpad_handler children share this prefix. Exit 0 even if nothing matched.
pkill -TERM -f "${CHROME_BIN}" || true
sleep 2
pkill -KILL -f "${CHROME_BIN}" || true

exit 0
