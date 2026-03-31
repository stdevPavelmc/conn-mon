# Quick Start Guide - Connection Monitor Extension

## Installation Complete! ✓

The Connection Monitor extension has been successfully installed to:
```
/home/pavel/.local/share/gnome-shell/extensions/conn-mon@pavel.dev/
```

## Enabling the Extension

### Option 1: Command Line
```bash
gnome-extensions enable conn-mon@pavel.dev
```

### Option 2: GNOME Extensions App
1. Open "Extensions" app (or install from GNOME Extensions website)
2. Find "Connection Monitor" in the list
3. Toggle the switch to enable

### Option 3: Restart Required
After enabling, you must restart GNOME Shell:
- Press `Alt+F2`
- Type `r`
- Press `Enter`

Or log out and log back in.

## Using the Extension

### Panel Indicator
Once enabled, you'll see a **signal bars icon** in the top panel:
- **4 bars (green)**: Excellent connection (90-100% quality)
- **3 bars (dark green)**: Good connection (70-89% quality)
- **2 bars (yellow)**: Fair connection (50-69% quality)
- **1 bar (orange)**: Poor connection (30-49% quality)
- **0 bars + X (red)**: Critical/Dropped (0-29% quality)

### Interactions

| Action | Result |
|--------|--------|
| **Left-click** | Open dropdown panel with graphs and stats |
| **Right-click** | Open settings dialog |
| **Middle-click** | Open settings dialog |
| **Hover** | Show tooltip with current status |

### Dropdown Panel

The panel shows:
1. **Status Section**: Current state, quality %, profile, packet loss, latency
2. **ACK Graph**: Real-time success rate (green bars = success, red = failure)
3. **Latency Graph**: Real-time latency over time (ms)
4. **Statistics**: Total pings, success/failure counts, latency min/avg/max, uptime

## Default Configuration

| Setting | Value |
|---------|-------|
| Target IP | `1.1.1.1` (Cloudflare DNS) |
| Ping Count | 100 (history size) |
| Ping Interval | 1 second |
| Profile | Auto-detect |
| Recent Window | 5 pings |
| Sound Alerts | Enabled |
| Show Percentage | Enabled |

## Understanding the States

```
HEALTHY ──(≥5% failure)──▶ PROBLEM ──(≥10% failure)──▶ DROPPED [sound]
   ▲                           │                            │
   │                           │                            │ (≥5% success)
   │                           └────────────────────────────┤
   │                                                        ▼
   │                                                  REVIVING
   │                                                        │
   │                           ┌────────────────────────────┤ (≥10% success)
   └───────────────────────────┴────────────────────── RESTORED [sound]
```

### State Descriptions

- **Healthy**: Connection is working well (< 5% failure in recent 5 pings)
- **Problem**: Minor issues detected (1 out of 5 recent pings failed)
- **Dropped**: Connection appears down (2+ out of 5 recent pings failed) → **Sound alert**
- **Reviving**: Connection starting to recover (1 out of 5 recent pings succeeded)
- **Restored**: Connection back up (2+ out of 5 recent pings succeeded) → **Sound alert**

## Customizing Settings

Right-click the icon or open GNOME Extensions app to configure:

### General Settings
- **Target IP**: Change to ping a different server (e.g., `8.8.8.8`, your router gateway)
- **Ping Count**: Adjust history size (10-500 pings)
- **Ping Interval**: Change frequency (0.5s, 1s, 2s, 5s, 10s)
- **Recent Window Size**: Adjust sensitivity for drop/restore detection (5-20)

### Profile Selection
Choose your connection type or use auto-detect:
- **Auto-detect**: Automatically determines connection type from latency
- **LAN/Ethernet**: < 1ms, 100% ack expected
- **Fiber**: 2-5ms, ≥97% ack expected
- **WiFi Local**: 3-10ms, ≥95% ack expected
- **WiFi/Tethering**: 10-40ms, ≥95% ack expected
- **ADSL**: 70-90ms, ≥95% ack expected

### Appearance & Alerts
- **Show Quality Percentage**: Toggle numeric overlay on icon
- **Sound Alerts**: Enable/disable connection drop/restore sounds
- **Graph Update Rate**: Control how often graphs refresh

## Troubleshooting

### Extension Not Visible
```bash
# Check if installed
gnome-extensions list | grep conn-mon

# Enable it
gnome-extensions enable conn-mon@pavel.dev

# Restart GNOME Shell (Alt+F2, 'r', Enter)
```

### Check Logs
```bash
# Follow extension logs
journalctl -f -o cat | grep -i connmon

# Or use make command
cd /home/pavel/Documents/Software/Gnome-extensions/Conn_mon
make logs
```

### Extension Issues
```bash
# Disable and re-enable
gnome-extensions disable conn-mon@pavel.dev
gnome-extensions enable conn-mon@pavel.dev

# Restart GNOME Shell
```

### Uninstall
```bash
cd /home/pavel/Documents/Software/Gnome-extensions/Conn_mon
make uninstall
```

## Performance Tips

- **Lower CPU usage**: Increase ping interval to 2s, 5s, or 10s
- **Reduce memory**: Decrease ping count to 50
- **Faster detection**: Reduce recent window to 5 (default is optimal)
- **Disable graphs**: If not needed for monitoring

## Next Steps

1. **Enable the extension**: `gnome-extensions enable conn-mon@pavel.dev`
2. **Restart GNOME Shell**: Press `Alt+F2`, type `r`, press `Enter`
3. **Verify icon appears** in the top panel
4. **Click to view** the dropdown panel with graphs
5. **Right-click to configure** settings to your preference

---

**Need Help?**
- Check the full README.md for detailed documentation
- View logs: `journalctl -f | grep -i connmon`
- Report issues via GNOME Extensions or GitHub

**Enjoy monitoring your connection!** 📊🔗
