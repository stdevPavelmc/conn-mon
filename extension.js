/**
 * Connection Monitor - GNOME Shell Extension
 * 
 * Monitor network connection quality with real-time ping statistics,
 * packet loss tracking, and latency graphs.
 * 
 * @author Pavel
 * @version 3.0
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import { ConnectionIndicator } from './ui/indicator.js';
import { Pinger } from './lib/pinger.js';
import { StatsTracker } from './lib/stats.js';
import { QualityCalculator } from './lib/quality.js';
import { StateMachine, ConnectionState } from './lib/state.js';
import { SoundManager } from './lib/sound.js';

export default class ConnectionMonitorExtension extends Extension {
    enable() {
        try {
            log('ConnMon: Starting extension enable');
            
            // Load settings
            this.settings = this.getSettings();
            
            // Initialize core components
            this.stats = new StatsTracker();
            this.quality = new QualityCalculator(this.settings);
            this.state = new StateMachine(this.settings);
            this.sound = new SoundManager(this.settings);
            
            // Initialize pinger
            this.pinger = new Pinger(this.settings);
            
            // Initialize UI components
            this.indicator = new ConnectionIndicator(this.settings, this.metadata);
            this.indicator.connect('settings-requested', this._openSettings.bind(this));
            
            // Add indicator to panel
            Main.panel.addToStatusArea('conn-mon', this.indicator);
            
            log('ConnMon: Indicator added to panel');
            
            // Connect signals
            this._signalConnections = [];

            this._signalConnections.push({ obj: this.pinger, id: this.pinger.connect('ping-result', this._onPingResult.bind(this)) });
            this._signalConnections.push({ obj: this.pinger, id: this.pinger.connect('ping-error', this._onPingError.bind(this)) });
            this._signalConnections.push({ obj: this.state,  id: this.state.connect('state-changed', this._onStateChanged.bind(this)) });
            
            // Start pinging
            this.pinger.start();
            
            log('ConnMon: Extension enabled successfully');
        } catch (error) {
            logError(error, 'ConnMon: Failed to enable extension');
            this.disable();
            Main.notify(
                'Connection Monitor',
                'Failed to start extension. Check journalctl for details.'
            );
        }
    }
    
    disable() {
        try {
            log('ConnMon: Starting extension disable');
            
            // Stop pinger
            if (this.pinger) {
                this.pinger.stop();
            }

            // Disconnect signals
            if (this._signalConnections) {
                this._signalConnections.forEach(({ obj, id }) => {
                    try { obj.disconnect(id); } catch (_) {}
                });
                this._signalConnections = null;
            }

            // Destroy pinger
            this.pinger = null;

            // Destroy indicator
            if (this.indicator) {
                this.indicator.destroy();
                this.indicator = null;
            }
            
            // Clean up components
            this.stats = null;
            this.quality = null;
            this.state = null;
            this.sound = null;
            this.settings = null;
            
            log('ConnMon: Extension disabled successfully');
        } catch (error) {
            logError(error, 'ConnMon: Failed to disable extension');
        }
    }
    
    _onPingResult(pinger, result) {
        try {
            // Record ping in stats
            this.stats.recordPing(result);
            
            // Update quality calculation
            const quality = this.quality.calculateQuality(
                this.stats.getPacketLossPercent(),
                this.stats.getAverageLatency()
            );
            
            // Update state machine
            this.state.processPing(result);
            
            // Update indicator
            this.indicator.updateState(
                this.state.getCurrentState(),
                quality,
                this.quality.getProfileName()
            );
            
            // Update panel if it exists
            if (this.indicator._panelItem) {
                this.indicator._panelItem.update(this.stats, this.state, quality);
            }
        } catch (error) {
            logError(error, 'ConnMon: Error processing ping result');
        }
    }
    
    _onPingError(pinger, error) {
        log(`ConnMon: Ping error - ${error.message}`);
    }
    
    _onStateChanged(stateMachine, oldState, newState) {
        try {
            log(`ConnMon: State changed from ${oldState} to ${newState}`);
            
            // Play sound alerts based on state
            if (this.settings.get_boolean('sound-alerts')) {
                if (newState === ConnectionState.DROPPED) {
                    this.sound.playDisconnect();
                } else if (newState === ConnectionState.RESTORED) {
                    this.sound.playConnect();
                }
            }
            
            // Update indicator with state change
            const quality = this.quality.calculateQuality(
                this.stats.getPacketLossPercent(),
                this.stats.getAverageLatency()
            );
            this.indicator.updateState(
                newState,
                quality,
                this.quality.getProfileName()
            );
        } catch (error) {
            logError(error, 'ConnMon: Error handling state change');
        }
    }
    
    _openSettings() {
        try {
            const app = Gio.DesktopAppInfo.new('gnome-extensions-app.desktop');
            if (app) {
                app.launch([], null);
            } else {
                // Fallback: open preferences directly
                this.openPreferences();
            }
        } catch (error) {
            logError(error, 'ConnMon: Failed to open settings');
            this.openPreferences();
        }
    }
}
