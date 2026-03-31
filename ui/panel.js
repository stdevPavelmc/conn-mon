/**
 * Dropdown Panel Component
 * 
 * Displays connection statistics, graphs, and status in the popup panel.
 */

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ConnectionState, StateDescriptions } from '../lib/state.js';
import { AckGraph, LatencyGraph } from './graphs.js';

/**
 * ConnectionPanel - Popup menu with graphs and statistics
 */
export class ConnectionPanel extends PopupMenu.PopupBaseMenuItem {
    constructor(indicator, settings) {
        super({ reactive: false, style_class: 'conn-mon-panel' });
        
        this.indicator = indicator;
        this.settings = settings;
        this.stats = null;
        this.state = null;
        this.quality = 100;
        
        // Create main layout
        this._createLayout();
        
        // Create graphs
        this.ackGraph = new AckGraph();
        this.latencyGraph = new LatencyGraph();
        
        // Set graph sizes
        this.ackGraph.set_size(280, 80);
        this.latencyGraph.set_size(280, 80);
        
        // Add graphs to containers
        this.ackGraphContainer.add_child(this.ackGraph);
        this.latencyGraphContainer.add_child(this.latencyGraph);
    }
    
    /**
     * Create panel layout
     * @private
     */
    _createLayout() {
        const mainLayout = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-main-layout'
        });
        
        // Header section
        mainLayout.add_child(this._createHeaderSection());
        
        // Status section
        mainLayout.add_child(this._createStatusSection());
        
        // Graphs section
        mainLayout.add_child(this._createGraphsSection());
        
        // Statistics section
        mainLayout.add_child(this._createStatsSection());
        
        this.actor.add_child(mainLayout);
    }
    
    /**
     * Create header section
     * @private
     */
    _createHeaderSection() {
        const header = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-header',
            x_expand: true
        });
        
        const title = new St.Label({
            text: 'Connection Monitor',
            style_class: 'conn-mon-title',
            x_expand: true
        });
        
        const settingsButton = new St.Button({
            icon_name: 'emblem-system-symbolic',
            style_class: 'conn-mon-settings-btn',
            track_hover: true,
            x_align: Clutter.ActorAlign.END
        });
        settingsButton.connect('clicked', () => {
            this.indicator.emit('settings-requested');
        });
        
        header.add_child(title);
        header.add_child(settingsButton);
        
        return header;
    }
    
    /**
     * Create status section
     * @private
     */
    _createStatusSection() {
        const statusBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-status-box'
        });
        
        // Status indicator row
        const statusRow = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-status-row',
            x_expand: true
        });
        
        this.statusDot = new St.Label({
            text: '●',
            style_class: 'conn-mon-status-dot',
            style: 'color: #2ecc71;'
        });
        
        this.statusLabel = new St.Label({
            text: 'Connection Healthy',
            style_class: 'conn-mon-status-label',
            x_expand: true
        });
        
        this.qualityLabel = new St.Label({
            text: '100%',
            style_class: 'conn-mon-quality-label'
        });
        
        statusRow.add_child(this.statusDot);
        statusRow.add_child(this.statusLabel);
        statusRow.add_child(this.qualityLabel);
        
        // Profile row
        const profileRow = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-profile-row'
        });
        
        profileRow.add_child(new St.Label({
            text: 'Profile: ',
            style_class: 'conn-mon-profile-label'
        }));
        
        this.profileLabel = new St.Label({
            text: 'Auto-detect',
            style_class: 'conn-mon-profile-value',
            x_expand: true
        });
        
        profileRow.add_child(this.profileLabel);
        
        // Metrics row
        const metricsRow = new St.BoxLayout({
            orientation: Clutter.Orientation.HORIZONTAL,
            style_class: 'conn-mon-metrics-row'
        });
        
        this.packetLossLabel = new St.Label({
            text: 'Packet Loss: 0%',
            style_class: 'conn-mon-metric'
        });
        
        this.latencyLabel = new St.Label({
            text: 'Avg Latency: 0ms',
            style_class: 'conn-mon-metric'
        });
        
        metricsRow.add_child(this.packetLossLabel);
        metricsRow.add_child(this.latencyLabel);
        
        statusBox.add_child(statusRow);
        statusBox.add_child(profileRow);
        statusBox.add_child(metricsRow);
        
        return statusBox;
    }
    
    /**
     * Create graphs section
     * @private
     */
    _createGraphsSection() {
        const graphsBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-graphs-box'
        });
        
        // ACK Graph
        const ackLabel = new St.Label({
            text: 'ACK Success Rate',
            style_class: 'conn-mon-graph-title'
        });
        
        this.ackGraphContainer = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style_class: 'conn-mon-graph-container',
            x_expand: true
        });
        
        // Latency Graph
        const latencyLabel = new St.Label({
            text: 'Latency (ms)',
            style_class: 'conn-mon-graph-title'
        });
        
        this.latencyGraphContainer = new St.Widget({
            layout_manager: new Clutter.BinLayout(),
            style_class: 'conn-mon-graph-container',
            x_expand: true
        });
        
        graphsBox.add_child(ackLabel);
        graphsBox.add_child(this.ackGraphContainer);
        graphsBox.add_child(latencyLabel);
        graphsBox.add_child(this.latencyGraphContainer);
        
        return graphsBox;
    }
    
    /**
     * Create statistics section
     * @private
     */
    _createStatsSection() {
        const statsBox = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-stats-box'
        });
        
        // Stats grid
        const statsGrid = new St.BoxLayout({
            orientation: Clutter.Orientation.VERTICAL,
            style_class: 'conn-mon-stats-grid'
        });
        
        this.totalPingsLabel = new St.Label({
            text: 'Total Pings: 0',
            style_class: 'conn-mon-stat'
        });
        
        this.successfulLabel = new St.Label({
            text: 'Successful: 0 (0%)',
            style_class: 'conn-mon-stat'
        });
        
        this.failedLabel = new St.Label({
            text: 'Failed: 0 (0%)',
            style_class: 'conn-mon-stat'
        });
        
        this.latencyRangeLabel = new St.Label({
            text: 'Latency: 0ms / 0ms / 0ms (Min/Avg/Max)',
            style_class: 'conn-mon-stat'
        });
        
        this.uptimeLabel = new St.Label({
            text: 'Uptime: 0s',
            style_class: 'conn-mon-stat'
        });
        
        statsGrid.add_child(this.totalPingsLabel);
        statsGrid.add_child(this.successfulLabel);
        statsGrid.add_child(this.failedLabel);
        statsGrid.add_child(this.latencyRangeLabel);
        statsGrid.add_child(this.uptimeLabel);
        
        statsBox.add_child(statsGrid);
        
        return statsBox;
    }
    
    /**
     * Update panel with latest data
     * @param {StatsTracker} stats - Statistics tracker
     * @param {StateMachine} state - State machine
     * @param {number} quality - Quality score
     */
    update(stats, state, quality) {
        this.stats = stats;
        this.state = state;
        this.quality = quality;
        
        const statsData = stats.getStats();
        const stateDesc = state.getStateDescription();
        const profile = state.settings ? state.settings.get_string('profile') : 'auto';
        
        // Update status section
        this._updateStatus(stateDesc, quality, profile, statsData);
        
        // Update graphs
        this._updateGraphs(stats);
        
        // Update statistics
        this._updateStatistics(statsData);
    }
    
    /**
     * Update status section
     * @private
     */
    _updateStatus(stateDesc, quality, profile, statsData) {
        // Status dot color
        let dotColor = '#2ecc71';  // Green
        if (this.state.getCurrentState() === ConnectionState.DROPPED) {
            dotColor = '#e74c3c';  // Red
        } else if (this.state.getCurrentState() === ConnectionState.PROBLEM) {
            dotColor = '#f1c40f';  // Yellow
        } else if (this.state.getCurrentState() === ConnectionState.REVIVING) {
            dotColor = '#f39c12';  // Orange
        }
        
        this.statusDot.set_style(`color: ${dotColor};`);
        this.statusLabel.set_text(stateDesc);
        this.qualityLabel.set_text(`${quality}%`);
        this.profileLabel.set_text(profile === 'auto' ? 'Auto-detect' : profile);
        
        // Metrics
        this.packetLossLabel.set_text(`Packet Loss: ${statsData.packetLossPercent.toFixed(1)}%`);
        this.latencyLabel.set_text(`Avg Latency: ${Math.round(statsData.avgLatency)}ms`);
    }
    
    /**
     * Update graphs
     * @private
     */
    _updateGraphs(stats) {
        const history = stats.getHistory();
        
        if (history.length > 0) {
            this.ackGraph.setFromPingResults(history);
            this.latencyGraph.setFromPingResults(history);
        }
    }
    
    /**
     * Update statistics section
     * @private
     */
    _updateStatistics(statsData) {
        this.totalPingsLabel.set_text(`Total Pings: ${statsData.totalPings}`);
        this.successfulLabel.set_text(
            `Successful: ${statsData.successfulPings} (${statsData.packetAckPercent.toFixed(1)}%)`
        );
        this.failedLabel.set_text(
            `Failed: ${statsData.failedPings} (${statsData.packetLossPercent.toFixed(1)}%)`
        );
        this.latencyRangeLabel.set_text(
            `Latency: ${Math.round(statsData.minLatency)}ms / ${Math.round(statsData.avgLatency)}ms / ${Math.round(statsData.maxLatency)}ms`
        );
        this.uptimeLabel.set_text(`Uptime: ${stats.getFormattedUptimeSinceRestore()}`);
    }
    
    /**
     * Clean up resources
     */
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
}
