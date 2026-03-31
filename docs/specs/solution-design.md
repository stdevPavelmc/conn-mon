# Connection Monitor Extension - Solution Design Document (SDD)

## System Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     GNOME Shell Panel                        │
│  ┌──────────────┐                                           │
│  │   Indicator  │ ←─────────────────────────────────┐       │
│  │  (Icon +     │                                   │       │
│  │   Overlay)   │                                   │       │
│  └──────┬───────┘                                   │       │
│         │ Click/Hover                               │       │
│         ▼                                           │       │
│  ┌──────────────────────────────────────────────┐   │       │
│  │            Dropdown Panel                     │   │       │
│  │  ┌─────────────────────────────────────┐     │   │       │
│  │  │         Status Summary               │     │   │       │
│  │  └─────────────────────────────────────┘     │   │       │
│  │  ┌─────────────┐  ┌─────────────┐           │   │       │
│  │  │ ACK Graph   │  │ Latency     │           │   │       │
│  │  │ (Live)      │  │ Graph (Live)│           │   │       │
│  │  └─────────────┘  └─────────────┘           │   │       │
│  │  ┌─────────────────────────────────────┐     │   │       │
│  │  │         Statistics Panel            │     │   │       │
│  │  └─────────────────────────────────────┘     │   │       │
│  └──────────────────────────────────────────────┘   │       │
└─────────────────────────────────────────────────────┼───────┘
         ▲                                            │
         │ Right/Middle Click                         │
         │                                            │
┌────────┴────────────────────────────────────────────┴───────┐
│                    Extension Core                            │
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Pinger     │    │   Quality    │    │    Stats     │  │
│  │   Module     │───▶│   Calculator │───▶│   Tracker    │  │
│  │              │    │              │    │              │  │
│  │ - Async ping │    │ - Weighted   │    │ - History    │  │
│  │ - Interval   │    │   scoring    │    │ - Metrics    │  │
│  │ - Timeout    │    │ - Profiles   │    │ - Aggregation│  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│         │                   │                    │          │
│         │                   ▼                    │          │
│         │          ┌──────────────────┐         │          │
│         │          │  State Machine   │         │          │
│         │          │                  │         │          │
│         │          │ Healthy/Problem/ │         │          │
│         │          │ Dropped/Reviving │         │          │
│         │          └──────────────────┘         │          │
│         │                                        │          │
│         ▼                                        ▼          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Settings (GSettings)                     │  │
│  │  - Target IP, Ping Count, Interval, Profile, etc.    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Pinger Module (`lib/pinger.js`)

**Responsibility:** Execute asynchronous ping operations and emit results

```javascript
// Pseudo-code structure
class Pinger {
  constructor(targetIp, intervalMs, timeoutMs)
  start()                        // Begin ping loop
  stop()                         // Stop ping loop
  setTarget(ip)                  // Change target IP
  setInterval(ms)                // Change interval
  
  // Signals
  connect('ping-result', callback)  // Emit: { success, rtt, timestamp }
  connect('ping-error', callback)   // Emit: { error }
}
```

**Implementation Approach:**
- Use `Gio.Subprocess` to call system `ping` command (cross-platform compatible)
- Alternative: Use `Gio.Socket` with ICMP (requires root) or TCP ping to port 80/443
- Maintain circular buffer of last N results

**Circular Buffer:**
```javascript
class CircularBuffer {
  constructor(maxSize)
  push(item)                   // Add item, remove oldest if full
  getHistory()                 // Return array of all items
  getRecent(count)             // Return last N items
  clear()                      // Reset buffer
}
```

---

### 2. Quality Calculator (`lib/quality.js`)

**Responsibility:** Calculate connection quality score based on weighted metrics

```javascript
class QualityCalculator {
  constructor(profile)
  
  calculateQuality(packetLossPercent, avgLatencyMs)
  // Returns: 0-100 quality score
  
  getQualityLevel(score)
  // Returns: 'excellent' | 'good' | 'fair' | 'poor' | 'critical'
  
  getColorForLevel(level)
  // Returns: hex color or GNOME style class
}
```

**Weighted Formula:**
```javascript
function calculateQuality(packetLoss, latency, profile) {
  // Normalize packet loss (0% loss = 100 score, 100% loss = 0 score)
  const packetScore = Math.max(0, 100 - (packetLoss * 100));
  
  // Normalize latency based on profile max
  const latencyScore = Math.max(0, 100 - ((latency / profile.maxLatency) * 100));
  
  // Weighted combination
  const quality = (packetScore * 0.6) + (latencyScore * 0.4);
  
  return Math.round(quality);
}
```

**Profile Definitions:**
```javascript
const PROFILES = {
  AUTO: { name: 'Auto-detect', maxLatency: 100 },
  LAN: { name: 'LAN/Ethernet', maxLatency: 1, minAck: 100 },
  FIBER: { name: 'Fiber', maxLatency: 5, minAck: 97 },
  WIFI_LOCAL: { name: 'WiFi Local', maxLatency: 10, minAck: 95 },
  WIFI_INTERNET: { name: 'WiFi/Tethering', maxLatency: 40, minAck: 95 },
  ADSL: { name: 'ADSL', maxLatency: 90, minAck: 95 }
};
```

---

### 3. State Machine (`lib/state.js`)

**Responsibility:** Track connection state transitions and trigger alerts

```javascript
const ConnectionState = {
  HEALTHY: 'healthy',
  PROBLEM: 'problem',
  DROPPED: 'dropped',
  REVIVING: 'reviving',
  RESTORED: 'restored'
};

class StateMachine {
  constructor(recentWindowSize = 5)
  
  update(pingResult)           // Process new ping, may trigger state change
  getCurrentState()            // Return current state
  isDropped()                  // Quick check for dropped state
  isRecovering()               // Quick check for reviving/restored
  
  // Signals
  connect('state-changed', callback)  // Emit: { oldState, newState }
  connect('alert', callback)          // Emit: { type: 'drop' | 'restore' }
}
```

**State Transition Logic:**
```javascript
function determineState(recentPings, currentState) {
  const failures = recentPings.filter(p => !p.success).length;
  const successes = recentPings.filter(p => p.success).length;
  const failureRate = failures / recentPings.length;
  const successRate = successes / recentPings.length;
  
  if (currentState === DROPPED) {
    if (successRate >= 0.10) return RESTORED;
    if (successRate >= 0.05) return REVIVING;
    return DROPPED;
  }
  
  if (failureRate >= 0.10) return DROPPED;
  if (failureRate >= 0.05) return PROBLEM;
  if (successRate >= 0.10) return HEALTHY;
  
  return currentState;
}
```

---

### 4. Statistics Tracker (`lib/stats.js`)

**Responsibility:** Aggregate and provide ping statistics

```javascript
class StatsTracker {
  constructor()
  
  recordPing(result)           // Add ping result to stats
  getStats()                   // Return aggregated statistics
  getHistory()                 // Return full ping history for graphs
  reset()                      // Clear all stats (on restore)
  
  // Statistics returned:
  // - totalPings, successfulPings, failedPings
  // - packetLossPercent
  // - minLatency, maxLatency, avgLatency
  // - uptimeSinceLastRestore
}
```

---

### 5. Panel Indicator (`ui/indicator.js`)

**Responsibility:** Render system panel icon with quality overlay

```javascript
class ConnectionIndicator extends PanelMenu.Button {
  constructor(settings, stateMachine)
  
  updateIcon(state, quality)   // Update icon based on state/quality
  setThemeVariant(isDark)      // Switch icon set for theme
  
  // Icon rendering strategy:
  // - Base: Network/signal bars SVG
  // - Overlay: Colored rectangle with alpha for quality
  // - Text: Percentage number (optional)
}
```

**Icon Asset Strategy:**
- Create SVG icons at 16x16 and 24x24 sizes
- Two variants: `network-symbolic.svg` (dark theme) and `network-symbolic-light.svg` (light theme)
- Use `St.Icon` with `icon-name` for symbolic icons
- Color overlay via `St.Widget` with CSS background-color

**Theme Detection:**
```javascript
const settings = new Gio.Settings({ schema: 'org.gnome.desktop.interface' });
const colorScheme = settings.get_string('color-scheme');
// 'prefer-dark' or 'prefer-light'
```

---

### 6. Dropdown Panel (`ui/panel.js`)

**Responsibility:** Render popup panel with graphs and statistics

```javascript
class ConnectionPanel extends PopupMenu.PopupMenu {
  constructor(indicator, statsTracker, stateMachine)
  
  update()                     // Refresh all panel contents
  _createStatusSection()       // Build status summary widget
  _createGraphsSection()       // Build graph containers
  _createStatsSection()        // Build statistics display
}
```

**Panel Layout:**
```
┌─────────────────────────────────────────┐
│ Connection Monitor              [⚙️]    │
├─────────────────────────────────────────┤
│ Status: ● Healthy                       │
│ Quality: 87% (Good)                     │
│ Profile: Fiber (Auto-detected)          │
│ Packet Loss: 2% | Avg Latency: 4.2ms   │
├─────────────────────────────────────────┤
│ ACK Success Rate                        │
│ ┌─────────────────────────────────┐     │
│ │ ████ ████ ████ ████ ████ ████   │     │
│ └─────────────────────────────────┘     │
│  Past ─────────────────────────── Now   │
├─────────────────────────────────────────┤
│ Latency (ms)                            │
│ ┌─────────────────────────────────┐     │
│ │    ╱╲    ╱╲                      │     │
│ │   ╱  ╲  ╱  ╲╱╲                  │     │
│ │  ╱    ╲╱    ╲ ╲╱                │     │
│ └─────────────────────────────────┘     │
│ 0ms ─────────────────────────── 20ms    │
├─────────────────────────────────────────┤
│ Total Pings: 1,247                      │
│ Successful: 1,222 (98.0%)               │
│ Failed: 25 (2.0%)                       │
│ Latency: 1.2ms / 4.2ms / 18.7ms        │
│ Uptime: 14m 32s                         │
└─────────────────────────────────────────┘
```

---

### 7. Graph Rendering (`ui/graphs.js`)

**Responsibility:** Render real-time line/bar graphs using Cairo

**Implementation Options:**

**Option A: Clutter Canvas (Recommended for GNOME)**
```javascript
class PingGraph extends Clutter.Canvas {
  constructor(data, options)
  
  setData(data)                // Update graph data
  _draw(canvas, cr, width, height)  // Cairo drawing callback
}

// Usage:
const canvas = new PingGraph(pingHistory, {
  type: 'line',           // or 'bar'
  color: '#3584e4',
  fillColor: '#3584e440',
  maxValue: 100,
  showGrid: true
});
```

**Option B: Pre-rendered SVG**
- Generate SVG string and update `Clutter.Image`
- Less efficient for frequent updates

**Graph Specifications:**

**ACK Graph:**
- Type: Bar chart or binary line graph
- Y-axis: 0 (failed) to 1 (successful)
- X-axis: Ping index (0 to history.length)
- Bar color: Green (#2ecc71) for success, Red (#e74c3c) for failure

**Latency Graph:**
- Type: Line graph with filled area
- Y-axis: 0 to dynamic max (based on profile or observed max)
- X-axis: Ping index
- Line color: Blue (#3584e4)
- Fill: Semi-transparent blue

---

### 8. Settings UI (`prefs.js`)

**Responsibility:** GNOME Extensions preferences dialog

```javascript
import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ConnMonPreferences extends ExtensionPreferences {
  getPreferencesWidget() {
    // Build GTK4 preferences widget
    return new ConnMonSettingsWidget(this.getSettings());
  }
}
```

**Settings Widget Layout:**
```
┌─────────────────────────────────────────┐
│ Connection Monitor Settings             │
├─────────────────────────────────────────┤
│ Target IP Address: [1.1.1.1        ]    │
│                                         │
│ Ping Count:        [100      ] ◄►      │
│                    (Range: 10-500)      │
│                                         │
│ Ping Interval:     [1 second ▼]         │
│                    Options: 0.5s, 1s,   │
│                             2s, 5s, 10s │
│                                         │
│ Connection Profile: [Auto-detect ▼]    │
│                    Options: Auto, LAN,  │
│                    Fiber, WiFi Local,   │
│                    WiFi Internet, ADSL  │
│                                         │
│ ☑ Enable sound alerts                   │
│ ☐ Show quality percentage on icon       │
│                                         │
│ Graph Update Rate: [Per-ping ▼]         │
│                                         │
│ [Reset to Defaults]                     │
└─────────────────────────────────────────┘
```

---

## Data Flow

### Ping Cycle Flow
```
1. Timer triggers (every N seconds)
   ↓
2. Pinger sends ICMP/TCP ping
   ↓
3. Pinger receives response (or timeout)
   ↓
4. Pinger emits 'ping-result' signal
   ↓
5. StatsTracker records result
   ↓
6. QualityCalculator computes new quality score
   ↓
7. StateMachine processes result, may change state
   ↓
8. StateMachine emits 'state-changed' (if applicable)
   ↓
9. Indicator updates icon
   ↓
10. Panel updates graphs and stats
```

### Settings Change Flow
```
1. User changes setting in prefs.js
   ↓
2. GSettings writes to dconf
   ↓
3. Extension receives 'changed' signal
   ↓
4. Affected component reconfigures:
   - Target IP → Pinger.setTarget()
   - Interval → Pinger.setInterval()
   - Profile → QualityCalculator.setProfile()
   ↓
5. UI updates to reflect new settings
```

---

## GNOME Shell API Usage

### Key Imports
```javascript
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';
```

### Extension Lifecycle
```javascript
export default class ConnMonExtension extends Extension {
  enable() {
    this.settings = this.getSettings();
    this.pinger = new Pinger(this.settings);
    this.stats = new StatsTracker();
    this.quality = new QualityCalculator(this.settings);
    this.state = new StateMachine();
    
    this.indicator = new ConnectionIndicator(this.settings, this.state);
    this.panel = new ConnectionPanel(this.indicator, this.stats, this.state);
    
    Main.panel.addToStatusArea('conn-mon', this.indicator);
    
    // Connect signals
    this.pinger.connect('ping-result', this._onPingResult.bind(this));
    this.state.connect('alert', this._onAlert.bind(this));
    
    // Start pinging
    this.pinger.start();
  }
  
  disable() {
    this.pinger.stop();
    this.indicator.destroy();
    // Clean up all resources
  }
}
```

---

## Settings Schema

**File:** `schemas/org.gnome.shell.extensions.conn_mon.gschema.xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<schemalist gettext-domain="conn-mon">
  <schema id="org.gnome.shell.extensions.conn_mon" path="/org/gnome/shell/extensions/conn-mon/">
    
    <key name="target-ip" type="s">
      <default>'1.1.1.1'</default>
      <summary>Target IP address for ping</summary>
      <description>IPv4 or IPv6 address to ping for connectivity monitoring</description>
    </key>
    
    <key name="ping-count" type="i">
      <default>100</default>
      <summary>Number of pings to track in history</summary>
      <description>Total number of ping results to keep in the history buffer (10-500)</description>
    </key>
    
    <key name="ping-interval" type="i">
      <default>1000</default>
      <summary>Ping interval in milliseconds</summary>
      <description>Time between consecutive pings (500, 1000, 2000, 5000, or 10000 ms)</description>
    </key>
    
    <key name="profile" type="s">
      <default>'auto'</default>
      <summary>Connection profile</summary>
      <description>Connection type profile: auto, lan, fiber, wifi-local, wifi-internet, adsl</description>
    </key>
    
    <key name="sound-alerts" type="b">
      <default>true</default>
      <summary>Enable sound alerts</summary>
      <description>Play system sounds on connection drop/restore</description>
    </key>
    
    <key name="show-percentage" type="b">
      <default>true</default>
      <summary>Show quality percentage on icon</summary>
      <description>Display numeric quality percentage as overlay on the indicator icon</description>
    </key>
    
    <key name="graph-update-rate" type="s">
      <default>'per-ping'</default>
      <summary>Graph update frequency</summary>
      <description>How often to update graphs: per-ping or interval</description>
    </key>
    
  </schema>
</schemalist>
```

---

## Sound Implementation

**Using GNOME System Sounds:**
```javascript
import { SoundPlayer } from 'resource:///org/gnome/shell/ui/sound.js';

// Or use GSound (preferred for GNOME 40+)
import GSound from 'gi://GSound';

class SoundManager {
  constructor() {
    this.context = GSound.context_get_default();
  }
  
  playConnect() {
    this.context.play_simple({
      GSound.ATTR_EVENT_ID: 'screen-lock',
      GSound.ATTR_EVENT_DESCRIPTION: 'Connection established'
    });
  }
  
  playDisconnect() {
    this.context.play_simple({
      GSound.ATTR_EVENT_ID: 'window-close',
      GSound.ATTR_EVENT_DESCRIPTION: 'Connection lost'
    });
  }
}
```

**Alternative: Custom Sound Files**
```javascript
const SoundTheme = {
  CONNECT: 'network-connectivity-established',
  DISCONNECT: 'network-disconnected'
};

// Use system sound theme
Canberra.cache_play(SoundTheme.CONNECT);
Canberra.play(SoundTheme.CONNECT);
```

---

## Performance Considerations

### Memory Management
- **Circular Buffer:** Fixed-size array for ping history (max 500 entries)
- **Graph Data:** Pre-allocate Clutter actor arrays
- **Cleanup:** Clear timers and disconnect signals on disable

### CPU Efficiency
- **Async Pinging:** Non-blocking subprocess calls
- **Throttled UI:** Update graphs at most once per ping interval
- **Lazy Rendering:** Only redraw visible portions of graphs

### Battery Impact
- **Adaptive Interval:** Option to increase interval on battery power
- **Sleep Detection:** Pause pinging during system suspend

---

## Error Handling

### Ping Failures
```javascript
try {
  const result = await this._executePing();
  this.emit('ping-result', result);
} catch (error) {
  if (error.code === Gio.IOErrorEnum.TIMED_OUT) {
    this.emit('ping-result', { success: false, rtt: null, timeout: true });
  } else {
    logError(error, 'ConnMon: Ping failed');
    this.emit('ping-error', error);
  }
}
```

### Extension Errors
```javascript
// In enable()
try {
  this._initializeComponents();
} catch (error) {
  logError(error, 'ConnMon: Failed to enable');
  this.disable();
  Main.notify('Connection Monitor', 'Failed to start extension');
}
```

---

## Testing Strategy

### Unit Tests (Optional for Extensions)
```javascript
// Test quality calculation
describe('QualityCalculator', () => {
  it('should return 100 for perfect connection', () => {
    const quality = calc.calculateQuality(0, 1);
    expect(quality).toBe(100);
  });
  
  it('should return 0 for 100% packet loss', () => {
    const quality = calc.calculateQuality(100, 0);
    expect(quality).toBe(0);
  });
});
```

### Manual Testing Checklist
- [ ] Icon displays correctly in dark/light themes
- [ ] Panel opens on click
- [ ] Graphs update in real-time
- [ ] Sound plays on drop/restore
- [ ] Settings persist across restarts
- [ ] Extension survives GNOME Shell restart
- [ ] No memory leaks after 1 hour of operation

---

## Dependencies

### Required
- GNOME Shell 50+
- GSettings (dconf)
- System ping command or network sockets

### Optional
- GSound for audio alerts
- Canberra for sound theme integration

---

## Open Technical Decisions

1. **Ping Implementation:** Subprocess vs. native socket
   - Subprocess: Easier, works without root
   - Native socket: Faster, but may need TCP ping workaround

2. **Graph Library:** Custom Cairo vs. pre-built widget
   - Custom: Full control, lighter
   - Pre-built: Faster development, more dependencies

3. **Icon Rendering:** Symbolic SVG vs. PNG assets
   - Symbolic: Theme-aware, scalable
   - PNG: More control over appearance

---

**Document Version:** 1.0  
**Created:** 2026-03-31  
**Status:** Draft - Awaiting Technical Review
