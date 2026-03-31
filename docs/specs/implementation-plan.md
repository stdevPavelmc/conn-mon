# Connection Monitor Extension - Implementation Plan

## Overview

This document outlines the phased implementation approach for the Connection Monitor GNOME Shell extension. The plan follows Test-Driven Development (TDD) principles where applicable and includes specification compliance gates between phases.

---

## Phase 1: Foundation & Core Infrastructure

**Duration:** 2-3 days
**Goal:** Establish project structure and basic ping functionality

### Tasks

#### 1.1 Project Scaffolding
- [ ] Create extension directory structure
- [ ] Write `metadata.json` with extension metadata
- [ ] Create GSettings schema XML file
- [ ] Compile schema with `glib-compile-schemas`
- [ ] Create basic `extension.js` with enable/disable lifecycle
- [ ] Create basic `prefs.js` with empty preferences widget

**Deliverables:**
- Installable extension (loads without errors)
- Settings dialog opens (empty)

**Compliance Gate:** Extension appears in GNOME Extensions app and can be enabled/disabled

---

#### 1.2 Pinger Module (Core)
- [ ] Implement `lib/pinger.js` with async ping using Gio.Subprocess
- [ ] Implement circular buffer for ping history
- [ ] Add configurable target IP and interval
- [ ] Emit signals for ping results and errors
- [ ] Write manual test script to verify ping functionality

**Deliverables:**
- Pinger class that can ping an IP and collect results
- Circular buffer with push/getHistory/getRecent methods

**Compliance Gate:** Pinger successfully pings 1.1.1.1 and logs results to journalctl

---

#### 1.3 Statistics Tracker
- [ ] Implement `lib/stats.js` to aggregate ping data
- [ ] Track: total, successful, failed, min/max/avg latency
- [ ] Implement packet loss percentage calculation
- [ ] Add uptime tracking since last restoration
- [ ] Write unit tests for statistics calculations

**Deliverables:**
- StatsTracker class with accurate metric calculations
- Test suite for stats module

**Compliance Gate:** Stats match manual calculation from ping command output

---

### Phase 1 Review
- [ ] All deliverables complete
- [ ] Code reviewed for GNOME Shell API compliance
- [ ] No memory leaks in 10-minute stress test

---

## Phase 2: Quality Calculation & State Management

**Duration:** 2 days  
**Goal:** Implement connection quality scoring and state machine

### Tasks

#### 2.1 Quality Calculator
- [ ] Implement `lib/quality.js` with weighted scoring formula
- [ ] Define profile thresholds (LAN, Fiber, WiFi, ADSL)
- [ ] Implement auto-detection logic based on baseline latency
- [ ] Add quality level classification (excellent/good/fair/poor/critical)
- [ ] Write unit tests for quality calculations

**Deliverables:**
- QualityCalculator class with profile support
- Test suite covering all profiles and edge cases

**Compliance Gate:** Quality scores match expected values for test scenarios

---

#### 2.2 State Machine
- [ ] Implement `lib/state.js` with state definitions
- [ ] Implement state transition logic (5-ping recent window)
- [ ] Add state change signals
- [ ] Implement alert signals for drop/restore events
- [ ] Write unit tests for state transitions

**Deliverables:**
- StateMachine class with correct transitions
- Test suite covering all state paths

**Compliance Gate:** State machine correctly identifies drops (2+ failures in 5) and restores (2+ successes in 5)

---

#### 2.3 Sound Manager
- [ ] Implement `lib/sound.js` using GSound or Canberra
- [ ] Add playConnect() and playDisconnect() methods
- [ ] Integrate with system sound theme
- [ ] Add settings toggle for sound alerts
- [ ] Manual test: Verify sounds play on state changes

**Deliverables:**
- SoundManager class
- Sounds play on connection drop/restore

**Compliance Gate:** Audible alerts work when extension is enabled

---

### Phase 2 Review
- [ ] Quality calculation accuracy verified
- [ ] State machine handles all edge cases
- [ ] Sound alerts tested on actual hardware

---

## Phase 3: UI - Panel Indicator

**Duration:** 2-3 days  
**Goal:** Create system panel icon with quality visualization

### Tasks

#### 3.1 Icon Assets
- [ ] Design symbolic SVG icons (network/signal bars)
- [ ] Create dark theme variant
- [ ] Create light theme variant
- [ ] Export to `resources/icons/` directory
- [ ] Test icons in both GNOME themes

**Deliverables:**
- Icon set for dark and light themes
- Icons scale correctly at 16x16 and 24x24

**Compliance Gate:** Icons visible and clear in both themes

---

#### 3.2 Indicator Component
- [ ] Implement `ui/indicator.js` extending PanelMenu.Button
- [ ] Add quality overlay (colored rectangle with alpha)
- [ ] Add optional percentage text overlay
- [ ] Implement theme detection and icon switching
- [ ] Add click handler to toggle panel popup
- [ ] Add right/middle-click handler for settings

**Deliverables:**
- ConnectionIndicator class
- Icon changes color based on quality
- Click opens panel, right-click opens settings

**Compliance Gate:** Indicator responds to quality changes and theme switches

---

#### 3.3 Integration with Core
- [ ] Connect indicator to StateMachine signals
- [ ] Connect indicator to QualityCalculator
- [ ] Update icon on every state/quality change
- [ ] Test end-to-end: ping → quality → state → icon

**Deliverables:**
- Fully integrated indicator
- Real-time icon updates

**Compliance Gate:** Icon accurately reflects connection quality in real-time

---

### Phase 3 Review
- [ ] Icon visible and legible at panel size
- [ ] Theme switching works automatically
- [ ] Click handlers work correctly
- [ ] No visual artifacts or flickering

---

## Phase 4: UI - Dropdown Panel

**Duration:** 3-4 days  
**Goal:** Create informative popup panel with graphs

### Tasks

#### 4.1 Panel Structure
- [ ] Implement `ui/panel.js` extending PopupMenu.PopupMenu
- [ ] Create status summary section (state, quality, profile)
- [ ] Create statistics section (totals, percentages, latency)
- [ ] Create graph containers (ACK and latency)
- [ ] Add settings button (gear icon)

**Deliverables:**
- ConnectionPanel class with all sections
- Panel opens on indicator click

**Compliance Gate:** Panel displays all static information correctly

---

#### 4.2 Graph Component (Cairo)
- [ ] Implement `ui/graphs.js` with Clutter.Canvas
- [ ] Create ACK graph (binary bar/line chart)
- [ ] Create latency graph (line with filled area)
- [ ] Implement auto-scaling Y-axis for latency
- [ ] Add "Now" label on X-axis right side
- [ ] Add grid lines and axis labels

**Deliverables:**
- PingGraph class
- Two graph types: ACK and Latency
- Graphs render correctly with sample data

**Compliance Gate:** Graphs display sample data accurately

---

#### 4.3 Real-Time Updates
- [ ] Connect panel to StatsTracker for data
- [ ] Implement graph update on each ping result
- [ ] Throttle updates if ping interval < 500ms
- [ ] Add smooth transitions for graph changes
- [ ] Test with 100+ ping history

**Deliverables:**
- Live-updating graphs
- Statistics refresh every ping

**Compliance Gate:** Graphs update smoothly without lag

---

#### 4.4 Panel Polish
- [ ] Add scrolling if content exceeds screen height
- [ ] Ensure panel width fits content without wrapping
- [ ] Add loading state during initial ping collection
- [ ] Test panel on different screen sizes
- [ ] Verify accessibility (keyboard navigation)

**Deliverables:**
- Polished, responsive panel UI
- Works on various display configurations

**Compliance Gate:** Panel usable on 1366x768 minimum resolution

---

### Phase 4 Review
- [ ] Graphs render correctly at all data sizes
- [ ] Panel updates smoothly in real-time
- [ ] No memory leaks after 30-minute test
- [ ] Panel accessible via keyboard

---

## Phase 5: Settings UI

**Duration:** 2 days  
**Goal:** Complete preferences dialog with all options

### Tasks

#### 5.1 Settings Widget
- [ ] Implement `prefs.js` with GTK4 widgets
- [ ] Add target IP text field with validation
- [ ] Add ping count spinner (10-500 range)
- [ ] Add ping interval dropdown
- [ ] Add profile dropdown with descriptions
- [ ] Add sound alerts toggle
- [ ] Add show percentage toggle
- [ ] Add graph update rate dropdown

**Deliverables:**
- Complete settings UI
- All settings editable

**Compliance Gate:** All settings can be modified and saved

---

#### 5.2 Settings Integration
- [ ] Connect settings to extension components
- [ ] Implement live updates (no restart required)
- [ ] Add input validation (IP format, number ranges)
- [ ] Add "Reset to Defaults" button
- [ ] Persist settings to dconf

**Deliverables:**
- Settings changes apply immediately
- Invalid inputs rejected with error messages

**Compliance Gate:** Changing settings immediately affects extension behavior

---

#### 5.3 Profile Descriptions
- [ ] Add tooltip/help text for each profile
- [ ] Show recommended use case for each profile
- [ ] Display profile threshold values in UI
- [ ] Add auto-detect status indicator

**Deliverables:**
- User-friendly profile selection
- Clear guidance for profile choice

**Compliance Gate:** Users can select appropriate profile without documentation

---

### Phase 5 Review
- [ ] All settings functional
- [ ] Validation prevents invalid values
- [ ] Settings persist across restarts
- [ ] UI follows GNOME HIG

---

## Phase 6: Polish & Testing

**Duration:** 2-3 days  
**Goal:** Refine UX, fix bugs, performance optimization

### Tasks

#### 6.1 Error Handling
- [ ] Handle missing ping command gracefully
- [ ] Handle network interface down state
- [ ] Handle target IP unreachable (10+ consecutive failures)
- [ ] Add user-friendly error notifications
- [ ] Implement graceful degradation

**Deliverables:**
- Extension handles all error cases
- Clear error messages to user

**Compliance Gate:** No crashes on network errors

---

#### 6.2 Performance Optimization
- [ ] Profile CPU usage during 1-hour test
- [ ] Optimize graph rendering (reduce redraws)
- [ ] Implement lazy loading for history
- [ ] Add battery-saving mode (optional)
- [ ] Memory leak detection and fixes

**Deliverables:**
- < 1% CPU usage average
- No memory growth over time

**Compliance Gate:** Extension runs 1 hour without issues

---

#### 6.3 Visual Polish
- [ ] Refine icon design based on testing
- [ ] Adjust color thresholds for visibility
- [ ] Fine-tune graph aesthetics
- [ ] Ensure consistent spacing and typography
- [ ] Add animations for state transitions

**Deliverables:**
- Professional, polished appearance
- Consistent with GNOME design language

**Compliance Gate:** UI passes visual review against GNOME HIG

---

#### 6.4 Documentation
- [ ] Write README.md with installation instructions
- [ ] Add screenshots to README
- [ ] Document all settings and their effects
- [ ] Add troubleshooting section
- [ ] Create extension.gnome.org metadata

**Deliverables:**
- Complete README
- Extension ready for publishing

**Compliance Gate:** New user can install and configure without external help

---

### Phase 6 Review
- [ ] All bugs fixed from testing
- [ ] Performance targets met
- [ ] Documentation complete
- [ ] Ready for beta release

---

## Phase 7: Release & Feedback

**Duration:** Ongoing  
**Goal:** Publish extension and incorporate user feedback

### Tasks

#### 7.1 Beta Release
- [ ] Package extension for GNOME Extensions website
- [ ] Submit to extensions.gnome.org
- [ ] Create GitHub repository
- [ ] Announce on GNOME forums/Reddit

**Deliverables:**
- Extension published
- Feedback channel established

---

#### 7.2 Feedback Integration
- [ ] Monitor issues and reviews
- [ ] Prioritize bug reports
- [ ] Collect feature requests
- [ ] Plan v1.1 based on feedback

**Deliverables:**
- Issue tracker active
- Roadmap for next version

---

## Task Dependencies

```
Phase 1: Foundation
├─ 1.1 Scaffolding
│  └─ 1.2 Pinger Module
│     └─ 1.3 Stats Tracker
│
Phase 2: Core Logic
├─ 2.1 Quality Calculator
├─ 2.2 State Machine ─┬─ 3.2 Indicator
│                     └─ 4.3 Real-Time Updates
└─ 2.3 Sound Manager
   │
Phase 3: Indicator
├─ 3.1 Icon Assets
└─ 3.2 Indicator ──┬─ 3.3 Integration
                   │
Phase 4: Panel     │
├─ 4.1 Panel ──────┤
├─ 4.2 Graphs ─────┤
└─ 4.3 Updates ────┘
   │
Phase 5: Settings ─┴─ 5.1 Widget
                    ├─ 5.2 Integration
                    └─ 5.3 Descriptions
   │
Phase 6: Polish ────┴─ 6.1 Errors
                    ├─ 6.2 Performance
                    ├─ 6.3 Visual
                    └─ 6.4 Docs
   │
Phase 7: Release ────┴─ 7.1 Beta
                    └─ 7.2 Feedback
```

---

## Specification Compliance Checklist

### PRD Compliance

| Requirement | Status | Phase |
|-------------|--------|-------|
| Configurable ping count (default 100) | ☐ | 1.2, 5.1 |
| Configurable target IP (default 1.1.1.1) | ☐ | 1.2, 5.1 |
| Configurable ping interval | ☐ | 1.2, 5.1 |
| Track ACK/missed pings | ☐ | 1.3 |
| Track response time | ☐ | 1.3 |
| 5 connection profiles | ☐ | 2.1 |
| Weighted quality calculation (60/40) | ☐ | 2.1 |
| Auto-detect profile with override | ☐ | 2.1, 5.1 |
| Hybrid icon (color + bars/percentage) | ☐ | 3.2 |
| Dark/light theme support | ☐ | 3.2 |
| 5% failure = problem state | ☐ | 2.2 |
| 10% failure = dropped state + sound | ☐ | 2.2, 2.3 |
| 5% success = reviving state | ☐ | 2.2 |
| 10% success = restored state + sound | ☐ | 2.2, 2.3 |
| System sound alerts | ☐ | 2.3 |
| Panel on hover/click | ☐ | 3.2, 4.1 |
| ACK graph (live, full history) | ☐ | 4.2, 4.3 |
| Latency graph (live, full history) | ☐ | 4.2, 4.3 |
| Statistics display | ☐ | 4.1 |
| Right/middle-click opens settings | ☐ | 3.2, 5.1 |
| All settings configurable | ☐ | 5.1 |

### SDD Compliance

| Component | Status | Phase |
|-----------|--------|-------|
| CircularBuffer class | ☐ | 1.2 |
| Pinger with signals | ☐ | 1.2 |
| StatsTracker | ☐ | 1.3 |
| QualityCalculator | ☐ | 2.1 |
| StateMachine | ☐ | 2.2 |
| SoundManager | ☐ | 2.3 |
| ConnectionIndicator | ☐ | 3.2 |
| ConnectionPanel | ☐ | 4.1 |
| PingGraph (Cairo) | ☐ | 4.2 |
| Settings widget | ☐ | 5.1 |
| GSettings schema | ☐ | 1.1 |

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Ping requires root | High | Use TCP ping fallback or subprocess with timeout |
| Graph performance poor | Medium | Use Clutter.Canvas, throttle updates |
| GNOME API changes | Medium | Target stable APIs, test on multiple versions |
| Sound not working | Low | Graceful degradation, visual-only alerts |
| Extension crashes shell | High | Extensive error handling, isolated testing |

---

## Estimated Timeline

| Phase | Duration | Cumulative |
|-------|----------|------------|
| Phase 1: Foundation | 3 days | 3 days |
| Phase 2: Core Logic | 2 days | 5 days |
| Phase 3: Indicator | 3 days | 8 days |
| Phase 4: Panel | 4 days | 12 days |
| Phase 5: Settings | 2 days | 14 days |
| Phase 6: Polish | 3 days | 17 days |
| Phase 7: Release | Ongoing | - |

**Total Development Time:** ~17 working days (can be parallelized)

---

## Next Steps

1. **User Review:** Review this implementation plan and provide feedback
2. **Adjustments:** Modify plan based on user input
3. **Begin Phase 1:** Start with project scaffolding (Task 1.1)

---

**Document Version:** 1.0  
**Created:** 2026-03-31  
**Status:** Approved

