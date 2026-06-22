#!/usr/bin/env bash

URL="${DASHBOARD_URL:-http://127.0.0.1:3030}"
PROFILE_DIR="${CHROMIUM_PROFILE_DIR:-$HOME/.config/chromium-kiosk-profile}"

export DISPLAY="${DISPLAY:-:0}"

xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true
xset s noblank 2>/dev/null || true

unclutter -idle 0.5 -root 2>/dev/null &

# Wait until the dashboard server is responding before opening Chromium.
for i in {1..60}; do
  if curl -fsS "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

pkill -f chromium 2>/dev/null || true
sleep 2

# Do not delete this profile directory on boot. It stores localStorage card presets.
mkdir -p "$PROFILE_DIR"

/usr/bin/chromium \
  --user-data-dir="$PROFILE_DIR" \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --overscroll-history-navigation=0 \
  --disable-pinch \
  --kiosk \
  --force-device-scale-factor=1.0 \
  --window-size=800,480 \
  --app="$URL" &

sleep 8
xdotool key F5 2>/dev/null || true
