# Network Connection Quality Monitor - Agent Documentation

## Overview

**Network Connection Quality Monitor** (conn-mon) is a GNOME Shell extension that provides real-time monitoring of network connection quality. It displays a visual indicator in the system panel and offers detailed statistics through an interactive dropdown panel.

## Project Information

| Field | Value |
|-------|-------|
| **Name** | Network Connection Quality Monitor |
| **Short Name** | conn-mon |
| **UUID** | conn-mon@stdevpavelmc.github.com |
| **Author** | stdevPavelmc |
| **Repository** | https://github.com/stdevPavelmc/conn-mon |
| **License** | GPL-3.0 |
| **Current Version** | 7 |
| **GNOME Shell Support** | 50, 51, 52, 53 |
| **Development Environment** | GNOME 50 / Wayland / Ubuntu 26.04 LTS |

## Architecture

### Core Components

```
conn-mon/
├── extension.js          # Main extension entry point
├── prefs.js              # Preferences/settings UI
├── ui/
│   ├── indicator.js      # Panel indicator and menu
│   ├── panel.js          # Dropdown panel with stats/graphs
│   └── graphs.js         # Real-time graph rendering
├── lib/
│   ├── pinger.js         # ICMP ping implementation
│   ├── quality.js        # Quality calculation engine
│   ├── state.js          # Connection state machine
│   ├── stats.js          # Statistics tracking
│   ├── buffer.js         # Circular buffer for data
│   └── sound.js          # Audio alert management
├── resources/
│   └── icons/            # SVG signal strength icons
├── schemas/              # GSettings schema definitions
└── stylesheet.css        # Extension styling
```

### Data Flow

1. **Pinger** sends ICMP echo requests at configurable intervals
2. **StatsTracker** collects ping results (success/failure, latency)
3. **QualityCalculator** computes quality score from packet loss and latency
4. **StateMachine** tracks connection state transitions
5. **ConnectionIndicator** displays status in the system panel
6. **ConnectionPanel** shows detailed statistics and graphs

### Quality Calculation

The quality score (0-100%) is calculated using:

```
quality = (packetLossScore * 0.4) + (latencyScore * 0.6)
```

Where:
- **Packet Loss Score**: Power decay function (5% loss = 75 score)
- **Latency Score**: Power decay based on profile's expected latency

The 40/60 weighting (packet loss/latency) prioritizes latency as the more perceptible metric, while power decay functions ensure severe packet loss still significantly impacts the score.

### Signal Level Mapping

| Quality Range | Signal Level | Visual Indicator |
|---------------|--------------|------------------|
| 90-100% | 4 | Full bars (excellent) |
| 70-89% | 3 | 3 bars (good) |
| 50-69% | 2 | 2 bars (fair) |
| 30-49% | 1 | 1 bar (poor) |
| 0-29% | 0 | No bars / X overlay (critical) |

### Connection States

The state machine tracks these states:

- **HEALTHY**: Connection is stable and performing well
- **PROBLEM**: Quality has degraded but connection persists
- **DROPPED**: Connection is completely lost
- **REVIVING**: Attempting to recover after drop
- **RESTORED**: Connection has recovered (transient state)

## Configuration

### GSettings Schema

Settings are defined in `schemas/org.gnome.shell.extensions.conn-mon.gschema.xml`:

- `ping-target`: Target host for ping (default: 8.8.8.8)
- `ping-interval`: Seconds between pings (default: 2)
- `ping-timeout`: Seconds to wait for ping response (default: 5)
- `profile`: Connection profile type (default: auto)
- `show-percentage`: Show quality % in panel (default: true)
- `sound-alerts`: Enable sound notifications (default: true)

### Connection Profiles

Each profile defines an expected latency baseline for quality assessment:

| Profile | ID | Expected Latency | Description |
|---------|-----|------------------|-------------|
| Auto-detect | `auto` | Dynamic (310ms default) | Automatically detects connection type |
| LAN Ethernet | `lan` | ~1ms | Wired local network |
| Fiber | `fiber` | ~5ms | Fiber ISP connection |
| WiFi Local | `wifi-local` | ~10ms | Local WiFi network (same LAN) |
| WiFi/Tethering | `wifi-internet` | ~40ms | Internet via WiFi or tethering |
| Public/Bad WiFi | `wifi-public` | ~300ms | Public or congested WiFi |
| ADSL | `adsl` | ~90ms | DSL ISP connection |

## Building and Installation

### Build Commands

```bash
# Build extension
make build

# Create distribution zip
make zip

# Install locally (for development)
make install

# Clean build artifacts
make clean
```

### Installation Paths

- **System-wide**: `/usr/share/gnome-shell/extensions/`
- **User-local**: `~/.local/share/gnome-shell/extensions/`

## API Reference

### Key Classes

- `ConnectionIndicator`: Panel button with status icon
- `ConnectionPanel`: Dropdown menu with detailed view
- `Pinger`: ICMP ping sender with signal-based results
- `QualityCalculator`: Quality score computation
- `StateMachine`: Connection state tracking
- `StatsTracker`: Statistics aggregation
- `SoundManager`: Audio notification handling

### Signals

- `Pinger::ping-result`: Emitted on successful ping
- `Pinger::ping-error`: Emitted on ping failure
- `StateMachine::state-changed`: Emitted on state transition
- `ConnectionIndicator::settings-requested`: Emitted on settings click

## Theme Support

The extension supports both dark and light themes:

- **Dark theme**: Uses bright, vibrant colors for visibility
- **Light theme**: Uses darker, saturated colors for contrast

Theme detection is automatic via `org.gnome.desktop.interface` settings.

## Icons

Signal strength icons are SVG files in `resources/icons/`:

- `network-signal-0-symbolic.svg`: No signal (with X overlay)
- `network-signal-1-symbolic.svg`: 1 bar (low)
- `network-signal-2-symbolic.svg`: 2 bars (fair)
- `network-signal-3-symbolic.svg`: 3 bars (good)
- `network-signal-4-symbolic.svg`: 4 bars (excellent)

Icons use `fill: currentColor` for CSS color inheritance.

## Debugging

### Enable Logging

```bash
# View extension logs
journalctl -f -o cat | grep ConnMon
```

### Common Issues

1. **Icon not showing**: Check that SVG files exist in resources/icons/
2. **Settings not saving**: Ensure schema is compiled
3. **Permission denied**: Verify extension has network access

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Testing

### Manual Testing

1. Enable the extension in GNOME Extensions
2. Verify signal icon appears in panel
3. Check dropdown panel shows statistics
4. Test settings changes take effect
5. Verify sound alerts work (if enabled)

### Automated Testing

Run the test suite:
```bash
make test
```

## Release Checklist

- [ ] Update version in metadata.json
- [ ] Update version in extension.js
- [ ] Update CHANGELOG
- [ ] Update README.md if needed
- [ ] Build distribution zip
- [ ] Test on clean GNOME session
- [ ] Create git tag
- [ ] Push to GitHub
- [ ] Submit to extensions.gnome.org

---

**Last Updated**: 2026-04-01
**Maintainer**: stdevPavelmc