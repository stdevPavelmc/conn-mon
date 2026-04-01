/**
 * Dropdown Panel Component
 *
 * Displays connection statistics, graphs, and status in the popup panel.
 *
 * ConnectionPanel extends PopupBaseMenuItem (a real GObject/St.BoxLayout
 * subclass) instead of PopupMenuSection.  This avoids both the plain-JS
 * class restriction on GObject.registerClass() and the removed this.actor
 * proxy that existed in older GNOME Shell versions.
 */

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ConnectionState } from '../lib/state.js';
import { AckGraph, LatencyGraph } from './graphs.js';

export const ConnectionPanel = GObject.registerClass(
class ConnectionPanel extends PopupMenu.PopupBaseMenuItem {
    _init(indicator, settings) {
        super._init({
            reactive:    false,
            can_focus:   false,
            style_class: 'conn-mon-panel-item',
        });

        // Hide the ornament/icon column that PopupBaseMenuItem reserves on the left
        this.setOrnament(PopupMenu.Ornament.NONE);

        this.indicator = indicator;
        this.settings  = settings;
        this.stats     = null;
        this.state     = null;
        this.quality   = 100;

        // Main vertical container, added directly to this item's actor
        this._box = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-main-layout',
            x_expand:    true,
        });
        this.add_child(this._box);

        // Build UI sections (these set this.ackGraphContainer etc.)
        this._box.add_child(this._createHeaderSection());
        this._box.add_child(this._createStatusSection());
        this._box.add_child(this._createGraphsSection());
        this._box.add_child(this._createStatsSection());

        // Create graphs and attach to their containers
        this.ackGraph     = new AckGraph();
        this.latencyGraph = new LatencyGraph();
        this.ackGraph.set_size(280, 80);
        this.latencyGraph.set_size(280, 80);
        this.ackGraphContainer.add_child(this.ackGraph);
        this.latencyGraphContainer.add_child(this.latencyGraph);
    }

    // ------------------------------------------------------------------ //
    //  Layout builders
    // ------------------------------------------------------------------ //

    _createHeaderSection() {
        const header = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-header',
            x_expand:    true,
        });

        header.add_child(new St.Label({
            text:        'Connection Monitor',
            style_class: 'conn-mon-title',
            x_expand:    true,
        }));

        const settingsButton = new St.Button({
            icon_name:   'emblem-system-symbolic',
            style_class: 'conn-mon-settings-btn',
            track_hover: true,
            x_align:     Clutter.ActorAlign.END,
        });
        settingsButton.connect('clicked', () => this.indicator.emit('settings-requested'));
        header.add_child(settingsButton);

        return header;
    }

    _createStatusSection() {
        const statusBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-status-box',
        });

        const statusRow = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-status-row',
            x_expand:    true,
        });

        this.statusDot   = new St.Label({ text: '●',                   style_class: 'conn-mon-status-dot',   style: 'color: #2ecc71;' });
        this.statusLabel = new St.Label({ text: 'Connection Healthy',  style_class: 'conn-mon-status-label', x_expand: true });
        this.qualityLabel= new St.Label({ text: '100%',                style_class: 'conn-mon-quality-label' });

        statusRow.add_child(this.statusDot);
        statusRow.add_child(this.statusLabel);
        statusRow.add_child(this.qualityLabel);

        const profileRow = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, style_class: 'conn-mon-profile-row' });
        profileRow.add_child(new St.Label({ text: 'Profile: ', style_class: 'conn-mon-profile-label' }));
        this.profileLabel = new St.Label({ text: 'Auto-detect', style_class: 'conn-mon-profile-value', x_expand: true });
        profileRow.add_child(this.profileLabel);

        const metricsRow = new St.BoxLayout({ orientation: Clutter.Orientation.HORIZONTAL, style_class: 'conn-mon-metrics-row' });
        this.packetLossLabel = new St.Label({ text: 'Packet Loss: 0%',    style_class: 'conn-mon-metric' });
        this.latencyLabel    = new St.Label({ text: 'Avg Latency: 0ms',   style_class: 'conn-mon-metric' });
        metricsRow.add_child(this.packetLossLabel);
        metricsRow.add_child(this.latencyLabel);

        statusBox.add_child(statusRow);
        statusBox.add_child(profileRow);
        statusBox.add_child(metricsRow);
        return statusBox;
    }

    _createGraphsSection() {
        const graphsBox = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, style_class: 'conn-mon-graphs-box' });

        graphsBox.add_child(new St.Label({ text: 'ACK Success Rate', style_class: 'conn-mon-graph-title' }));
        this.ackGraphContainer = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style_class:    'conn-mon-graph-container',
            x_expand:       true,
        });
        graphsBox.add_child(this.ackGraphContainer);

        graphsBox.add_child(new St.Label({ text: 'Latency (ms)', style_class: 'conn-mon-graph-title' }));
        this.latencyGraphContainer = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style_class:    'conn-mon-graph-container',
            x_expand:       true,
        });
        graphsBox.add_child(this.latencyGraphContainer);

        return graphsBox;
    }

    _createStatsSection() {
        const statsBox  = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, style_class: 'conn-mon-stats-box' });
        const statsGrid = new St.BoxLayout({ orientation: Clutter.Orientation.VERTICAL, style_class: 'conn-mon-stats-grid' });

        this.totalPingsLabel   = new St.Label({ text: 'Total Pings: 0',                          style_class: 'conn-mon-stat' });
        this.successfulLabel   = new St.Label({ text: 'Successful: 0 (0%)',                      style_class: 'conn-mon-stat' });
        this.failedLabel       = new St.Label({ text: 'Failed: 0 (0%)',                          style_class: 'conn-mon-stat' });
        this.latencyRangeLabel = new St.Label({ text: 'Latency: 0ms / 0ms / 0ms (Min/Avg/Max)', style_class: 'conn-mon-stat' });
        this.uptimeLabel       = new St.Label({ text: 'Uptime: 0s',                              style_class: 'conn-mon-stat' });

        [this.totalPingsLabel, this.successfulLabel, this.failedLabel,
         this.latencyRangeLabel, this.uptimeLabel].forEach(l => statsGrid.add_child(l));

        statsBox.add_child(statsGrid);
        return statsBox;
    }

    // ------------------------------------------------------------------ //
    //  Update methods
    // ------------------------------------------------------------------ //

    update(stats, state, quality) {
        this.stats   = stats;
        this.state   = state;
        this.quality = quality;

        const statsData = stats.getStats();
        const stateDesc = state.getStateDescription();
        const profile   = state.settings ? state.settings.get_string('profile') : 'auto';

        this._updateStatus(stateDesc, quality, profile, statsData);
        this._updateGraphs(stats);
        this._updateStatistics(statsData);
    }

    _updateStatus(stateDesc, quality, profile, statsData) {
        if (!this.statusDot) return;

        let dotColor = '#2ecc71';
        const cur = this.state.getCurrentState();
        if      (cur === ConnectionState.DROPPED)  dotColor = '#e74c3c';
        else if (cur === ConnectionState.PROBLEM)  dotColor = '#f1c40f';
        else if (cur === ConnectionState.REVIVING) dotColor = '#f39c12';

        this.statusDot.set_style(`color: ${dotColor};`);
        this.statusLabel.set_text(stateDesc);
        this.qualityLabel.set_text(`${quality}%`);
        this.profileLabel.set_text(profile === 'auto' ? 'Auto-detect' : profile);
        this.packetLossLabel.set_text(`Packet Loss: ${statsData.packetLossPercent.toFixed(1)}%`);
        this.latencyLabel.set_text(`Avg Latency: ${Math.round(statsData.avgLatency)}ms`);
    }

    _updateGraphs(stats) {
        if (!this.ackGraph || !this.latencyGraph) return;
        const history = stats.getHistory();
        if (history.length > 0) {
            this.ackGraph.setFromPingResults(history);
            this.latencyGraph.setFromPingResults(history);
        }
    }

    _updateStatistics(statsData) {
        this.totalPingsLabel.set_text(`Total Pings: ${statsData.totalPings}`);
        this.successfulLabel.set_text(`Successful: ${statsData.successfulPings} (${statsData.packetAckPercent.toFixed(1)}%)`);
        this.failedLabel.set_text(`Failed: ${statsData.failedPings} (${statsData.packetLossPercent.toFixed(1)}%)`);
        this.latencyRangeLabel.set_text(`Latency: ${Math.round(statsData.minLatency)}ms / ${Math.round(statsData.avgLatency)}ms / ${Math.round(statsData.maxLatency)}ms`);
        this.uptimeLabel.set_text(`Uptime: ${stats.getFormattedUptimeSinceRestore()}`);
    }

    // ------------------------------------------------------------------ //
    //  Cleanup
    // ------------------------------------------------------------------ //

    destroy() {
        if (this.ackGraph) {
            this.ackGraph.destroy();
            this.ackGraph = null;
        }
        if (this.latencyGraph) {
            this.latencyGraph.destroy();
            this.latencyGraph = null;
        }
        super.destroy();
    }
});
