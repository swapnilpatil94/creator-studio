#!/usr/bin/env bash
# Keeps the Studio Hub running across logins and crashes (macOS launchd). Opt in: bash tools/hub/install-launchd.sh ; remove: launchctl unload ~/Library/LaunchAgents/com.kathaaya.hub.plist
set -e
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"; NODE="$(command -v node)"; PL="$HOME/Library/LaunchAgents/com.kathaaya.hub.plist"
cat > "$PL" <<PLIST
<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict><key>Label</key><string>com.kathaaya.hub</string>
<key>ProgramArguments</key><array><string>$NODE</string><string>$ROOT/studio-ui/server.mjs</string></array>
<key>WorkingDirectory</key><string>$ROOT</string><key>RunAtLoad</key><true/><key>KeepAlive</key><true/>
<key>StandardOutPath</key><string>/tmp/kathaaya-hub.log</string><key>StandardErrorPath</key><string>/tmp/kathaaya-hub.log</string></dict></plist>
PLIST
launchctl unload "$PL" 2>/dev/null || true; launchctl load "$PL"; echo "Hub installed: http://127.0.0.1:4180/hub  (log: /tmp/kathaaya-hub.log)"
