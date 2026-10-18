#!/usr/bin/env bash
# Starts ComfyUI (FLUX.2 Klein models live under ~/Documents/ComfyUI) on 127.0.0.1:8188 and waits until it answers. Run only one heavy job at a time (24 GB Mac): stop video renders first.
set -e
BASE="$HOME/Documents/ComfyUI"; SRV="$HOME/Documents/ComfyUI-server"; PY="$BASE/.venv/bin/python"; PORT=8188
curl -s "http://127.0.0.1:$PORT/system_stats" >/dev/null && { echo "already running on $PORT"; exit 0; }
nohup "$PY" "$SRV/main.py" --base-directory "$BASE" --listen 127.0.0.1 --port $PORT --disable-all-custom-nodes > /tmp/comfyui.log 2>&1 &
for i in $(seq 1 90); do sleep 3; curl -s "http://127.0.0.1:$PORT/system_stats" >/dev/null && { echo "ComfyUI up on $PORT"; exit 0; }; done
echo "ComfyUI did not start; see /tmp/comfyui.log"; tail -5 /tmp/comfyui.log; exit 1
