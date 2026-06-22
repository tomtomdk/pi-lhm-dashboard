# Pi LibreHardwareMonitor Dashboard

A touch-friendly Raspberry Pi dashboard for displaying sensor data from LibreHardwareMonitor running on a Windows PC.

Designed for an 800x480 Raspberry Pi touchscreen, but it can run in any browser.

## Features

- Live PC sensor dashboard through LibreHardwareMonitor Remote Web Server
- CPU, GPU, RAM, VRAM, fan, storage and network speed cards
- Tap/click cards to change what each section shows
- Saves selected card presets in browser `localStorage`
- Offline fallback page when the PC is off or unreachable
- Offline page includes clock, date and local weather
- Weather uses Open-Meteo and does not require an API key
- Raspberry Pi kiosk script included
- No personal IPs, coordinates or local settings committed

## Requirements

### Windows PC

Install and run LibreHardwareMonitor.

Enable:

```text
Options -> Remote Web Server
```

Default URL format:

```text
http://YOUR_PC_IP:8085/data.json
```

Make sure Windows Firewall allows TCP port `8085` from your LAN.

### Raspberry Pi

Install Node.js 18 or newer.

```bash
sudo apt update
sudo apt install -y nodejs npm chromium curl unclutter xdotool
```

## Install

```bash
git clone https://github.com/tomtomdk/pi-lhm-dashboard.git
cd pi-lhm-dashboard
npm install
cp .env.example .env
nano .env
```

Set at least:

```env
LHM_URL=http://YOUR_PC_IP:8085/data.json
WEATHER_LOCATION=Your City
WEATHER_LAT=55.6761
WEATHER_LON=12.5683
WEATHER_TZ=Europe/Copenhagen
```

Start manually:

```bash
npm start
```

Open:

```text
http://127.0.0.1:3030
```

## Test LibreHardwareMonitor from the Pi

```bash
curl -s http://YOUR_PC_IP:8085/data.json | head -c 200 && echo
```

You should see JSON beginning with:

```json
{"id":0,"Text":"Sensor"
```

## systemd service

Copy the example service:

```bash
sudo cp systemd/lhm-dashboard.service.example /etc/systemd/system/lhm-dashboard.service
sudo nano /etc/systemd/system/lhm-dashboard.service
```

Update paths, username and environment values.

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now lhm-dashboard
sudo systemctl status lhm-dashboard --no-pager
```

## Kiosk mode

Copy the kiosk script:

```bash
cp kiosk/sensor-kiosk.sh ~/sensor-kiosk.sh
chmod +x ~/sensor-kiosk.sh
```

Create an autostart file:

```bash
mkdir -p ~/.config/autostart
nano ~/.config/autostart/sensor-panel.desktop
```

Use:

```ini
[Desktop Entry]
Type=Application
Name=Pi LHM Dashboard Kiosk
Exec=/home/YOUR_USER/sensor-kiosk.sh
X-GNOME-Autostart-enabled=true
```

The kiosk script intentionally does **not** delete the Chromium profile, so saved card presets survive reboot.

## Personal settings

Do not commit `.env`.

Use `.env.example` or the systemd environment lines as templates.
