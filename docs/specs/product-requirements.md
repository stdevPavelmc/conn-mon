# Connection Monitor Extension - Product Requirements Document (PRD)

## Overview

A GNOME Shell extension (v50+) that monitors network connectivity by continuously pinging a configurable IP address and displaying real-time connection quality statistics through a hybrid icon indicator and live graphs.

---

## Target Users

- Users who need to monitor network connection quality in real-time
- Network administrators troubleshooting connectivity issues
- Users switching between different connection types (WiFi, Ethernet, tethering)

---

## Core Features

### 1. Ping Monitoring

| Setting | Default | Configurable Range |
|---------|---------|-------------------|
| Ping count (history) | 100 pings | 10-500 pings |
| Target IP | `1.1.1.1` | Any valid IPv4/IPv6 |
| Ping interval | 1 second | 0.5s, 1s, 2s, 5s, 10s |

**Metrics Tracked:**
- Successful pings (ACK count)
- Failed/missed pings (timeout count)
- Round-trip time (RTT) in milliseconds
- Packet loss percentage
- Average/min/max latency

### 2. Connection Quality Profiles

**Hybrid Mode:** Auto-detect connection type with manual override option.

| Profile | Latency Range | Min Packet Ack | Use Case |
|---------|--------------|----------------|----------|
| LAN/Ethernet | < 1 ms | 100% | Wired local network |
| Fiber | 2-5 ms | ≥97% | Fiber ISP connection |
| WiFi Local | 3-10 ms | ≥95% | Local WiFi network |
| WiFi/Tethering | 10-40 ms | ≥95% | Internet via WiFi/tethering |
| ADSL | 70-90 ms | ≥95% | DSL ISP connection |
| Custom | user configured setting | user configured setting | User string |

**Quality Calculation:**
- Weighted combination: **60% packet loss + 40% latency**
- Quality score: 0-100% (displayed as color + numeric/bars overlay)

### 3. Status Detection & Alerts

**Recent Window:** Last 5 pings (for rapid detection)

| State | Trigger | Action |
|-------|---------|--------|
| **Problem** | ≥5% failure in recent 5 pings (≥1 failed) | Icon changes to warning state |
| **Dropped** | ≥10% failure in recent 5 pings (≥2 failed) | Icon shows critical + system disconnect sound |
| **Reviving** | ≥5% success in recent 5 pings after drop (≥1 success) | Icon shows recovering state |
| **Restored** | ≥10% success in recent 5 pings (≥2 success) after drop | Icon shows healthy + system connect sound |

**State Machine:**
```
Healthy → Problem → Dropped → Reviving → Restored → Healthy
                         ↑                        ↓
                         └────────────────────────┘
```

### 4. Visual Indicator (Hybrid Icon)

**Icon Design:**
- Primary: Signal bars or gauge meter showing quality level
- Overlay: Numeric percentage or bar count
- Color-coded: Green (excellent) → Yellow (warning) → Orange (poor) → Red (critical/dropped)
- Theme support: Dark (default) and light GNOME themes

**Quality Visualization:**

| Quality Score | Color | Bars/Gauge |
|--------------|-------|------------|
| 90-100% | Green | 4 bars / Full |
| 70-89% | Light Green | 3 bars / 75% |
| 50-69% | Yellow | 2 bars / 50% |
| 30-49% | Orange | 1 bar / 25% |
| 0-29% | Red | 0 bars / Empty |

### 5. Interactive Panel (Hover/Click)

**Panel Contents:**
1. **Overall Status Summary**
   - Current connection state (Healthy/Problem/Dropped/Reviving/Restored)
   - Quality score percentage
   - Active profile name
   - Current packet loss % and average latency

2. **Live Graph #1: ACK Success Rate Over Time**
   - Y-axis: Binary (0 = failed, 1 = successful)
   - X-axis: Ping sequence (left = oldest, right = "Now")
   - Full history display (all 100 pings)
   - Visual: Bar chart or line graph

3. **Live Graph #2: Latency (RTT) Over Time**
   - Y-axis: Milliseconds (auto-scaled on mean/min/max values)
   - X-axis: Ping sequence (left = oldest, right = "Now")
   - Full history display (all 100 pings)
   - Visual: Line graph with filled area below, is possible a gradient to dark against X axis

4. **Statistics Section**
   - Total pings sent
   - Successful: X (Y%)
   - Failed: X (Y%)
   - Latency: Min / Avg / Max ms
   - Uptime since last restoration

### 6. Settings Access

- **Right-click or Middle-click** on extension icon → Opens settings panel
- Settings accessible via GNOME Extensions app

### 7. Configurable Settings

| Setting | Type | Default |
|---------|------|---------|
| Target IP | Text input | `1.1.1.1` |
| Ping count | Number (10-500) | 100 |
| Ping interval | Dropdown | 1 second (1-10 seconds) |
| Profile selection | Dropdown (Auto/LAN/Fiber/WiFi Local/WiFi Internet/ADSL/Custom) | Auto |
| Sound alerts | Toggle | Enabled |
| Show quality percentage | Toggle | Enabled |
| Allow Throttling ping frequency | Toggle | Enabled |


---

## Technical Requirements

### Platform
- **GNOME Shell Version:** 50+
- **Extension Format:** ES6 modules (`.js` with `import` statements)
- **Settings Storage:** GSettings with XML schema

### Dependencies
- Standard GNOME Shell APIs (`imports.gi.*`)
- No external npm/pip dependencies
- System `ping` command or native socket implementation

### File Structure
```
Conn_mon/
├── extension.js           # Main extension entry point
├── prefs.js               # Settings UI
├── metadata.json          # Extension metadata
├── schemas/
│   └── org.gnome.shell.extensions.conn_mon.gschema.xml
├── lib/
│   ├── pinger.js          # Ping monitoring logic
│   ├── quality.js         # Quality calculation
│   └── stats.js           # Statistics tracking
├── ui/
│   ├── indicator.js       # Panel icon/indicator
│   ├── panel.js           # Dropdown panel with graphs
│   └── graphs.js          # Graph rendering components
├── sounds/                # (Optional, if not using system sounds)
└── resources/
    └── icons/             # SVG icons for light/dark themes
```

### Performance Constraints
- Ping operations must run asynchronously (non-blocking)
- Graph rendering should use Cairo or Clutter for efficiency
- Memory management: Fixed-size buffer for ping history (circular buffer)
- UI updates throttled to prevent excessive redraws

---

## User Stories

### US1: Quick Status Check
> As a user, I want to glance at my panel and immediately know my connection quality so I can identify issues without opening any menus.

**Acceptance Criteria:**
- Icon is always visible in system panel
- Color changes are immediately noticeable
- Quality indicator (bars/percentage) is legible at small sizes

### US2: Detailed Analysis
> As a user experiencing issues, I want to see historical ping data so I can identify patterns (intermittent drops, latency spikes).

**Acceptance Criteria:**
- Panel opens on click/hover
- Both graphs display full ping history
- Graphs update in real-time with each ping
- Statistics are accurate and clearly labeled

### US3: Alert Awareness
> As a user, I want to be audibly notified when my connection drops or recovers so I'm aware even when not looking at the screen.

**Acceptance Criteria:**
- System sound plays on connection drop
- System sound plays on connection restoration
- Sounds are distinct and recognizable
- Users can disable sounds in settings

### US4: Profile Flexibility
> As a user with multiple connection types, I want the extension to adapt to my current connection or let me manually select the appropriate profile.

**Acceptance Criteria:**
- Auto-detection suggests appropriate profile based on baseline latency
- Manual override available in settings
- User can define a Custom type of connection on a separate dialog.
- Profile thresholds are clearly documented and visible when I'm selecting one

### US5: Theme Compatibility
> As a user who switches between dark and light themes, I want the extension icon to be visible and aesthetically consistent.

**Acceptance Criteria:**
- Icon automatically adapts to GNOME theme
- Icons are legible on both light and dark backgrounds
- Follows GNOME Human Interface Guidelines

---

## Edge Cases & Error Handling

1. **No Network Interface:** Display "No connection" state with gray icon
2. **Ping Command Unavailable:** Fallback to native socket implementation or show error
3. **Target IP Unreachable:** After 10 consecutive failures, show "Target unreachable" warning
4. **Extension Reload:** Preserve ping history if possible, otherwise restart cleanly
5. **High CPU Usage:** Throttle ping frequency if system is under heavy load or heavy network usage (optional)

---

## Out of Scope (v1.0)

- Multiple target IPs simultaneously (specify as a comma separated list?)
- Export ping logs to file
- Notification popups (only sound alerts)
- Historical data persistence across extension reloads
- Upload/download speed monitoring
- Network interface selection (uses default route)

---

## Success Metrics

- **Accuracy:** Ping statistics match system `ping` command output
- **Responsiveness:** Connection state changes detected within 5 seconds
- **Performance:** < 1% CPU usage during normal operation
- **Usability:** Users can understand connection status within 2 seconds of glancing at panel

---

## Open Questions for User

1. **Graph Style:** Should graphs be:
   - [ ] Line graphs (smooth, continuous)
   - [ ] Bar charts (discrete per-ping)
   - [x] Hybrid (line with filled area)

2. **Icon Specifics:** For the hybrid approach, do you prefer:
   - [x] Signal bars (like WiFi indicator) with color overlay
   - [ ] Circular gauge meter with percentage inside
   - [ ] Custom network icon with colored badge overlay

3. **Profile Thresholds:** Are the suggested profile values acceptable, or should we adjust any ranges?
   - Allow the user to define and select a Custom profile for his use cases, with custom threshold. 

4. **Graph Y-Axis:** For the latency graph, should the Y-axis:
   - [x] Auto-scale based on observed min/max values allowing a 10% margin
   - [ ] Use fixed maximum (e.g., 200ms)
   - [ ] Use profile-based maximum (e.g., 100ms for LAN, 500ms for ADSL)

---

## Next Steps

1. User reviews and approves this PRD
2. Create Solution Design Document (SDD) with technical architecture
3. Create Implementation Plan with phased tasks
4. Begin implementation

---

**Document Version:** 1.0
**Created:** 2026-03-31
**Status:** Approved

