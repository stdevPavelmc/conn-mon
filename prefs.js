/**
 * Connection Monitor - Preferences UI
 * 
 * Settings dialog for configuring the Connection Monitor extension.
 */

import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class ConnectionMonitorPreferences extends ExtensionPreferences {
    getPreferencesWidget() {
        const settings = this.getSettings();
        
        // Create preferences widget
        const widget = new Adw.PreferencesPage();
        
        // General settings group
        const generalGroup = new Adw.PreferencesGroup({
            title: 'General Settings',
            description: 'Configure ping monitoring parameters'
        });
        
        // Target IP setting
        const ipRow = new Adw.EntryRow({
            title: 'Target IP Address',
            text: settings.get_string('target-ip'),
            activatable: true
        });
        
        // Create clear button with proper GTK4 cursor handling
        const clearButton = new Gtk.Button({
            icon_name: 'edit-clear-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat']
        });
        ipRow.add_suffix(clearButton);
        
        clearButton.connect('clicked', () => {
            ipRow.text = '';
        });
        
        ipRow.connect('notify::text', () => {
            const text = ipRow.text.trim();
            if (this._isValidIP(text)) {
                settings.set_string('target-ip', text);
            }
            // Show/hide clear button based on whether there's text
            clearButton.visible = ipRow.text.length > 0;
        });
        generalGroup.add(ipRow);
        
        // Ping count setting
        const pingCountRow = new Adw.SpinRow({
            title: 'Ping Count (History)',
            subtitle: 'Number of pings to track (10-500)',
            adjustment: new Gtk.Adjustment({
                lower: 10,
                upper: 500,
                step_increment: 10,
                page_increment: 50
            })
        });
        pingCountRow.value = settings.get_int('ping-count');
        pingCountRow.connect('notify::value', () => {
            settings.set_int('ping-count', pingCountRow.value);
        });
        generalGroup.add(pingCountRow);
        
        // Ping interval setting
        const intervalRow = new Adw.ComboRow({
            title: 'Ping Interval',
            subtitle: 'Time between consecutive pings',
            model: new Gtk.StringList({
                strings: ['0.5 seconds', '1 second', '2 seconds', '5 seconds', '10 seconds']
            })
        });
        
        const intervalMap = { 500: 0, 1000: 1, 2000: 2, 5000: 3, 10000: 4 };
        const intervalReverse = [500, 1000, 2000, 5000, 10000];
        intervalRow.selected = intervalMap[settings.get_int('ping-interval')] || 1;
        
        intervalRow.connect('notify::selected', () => {
            const interval = intervalReverse[intervalRow.selected];
            settings.set_int('ping-interval', interval);
        });
        generalGroup.add(intervalRow);
        
        // Recent window size setting
        const windowRow = new Adw.SpinRow({
            title: 'Recent Window Size',
            subtitle: 'Pings to consider for drop/restore detection (5-20)',
            adjustment: new Gtk.Adjustment({
                lower: 5,
                upper: 20,
                step_increment: 1,
                page_increment: 5
            })
        });
        windowRow.value = settings.get_int('recent-window-size');
        windowRow.connect('notify::value', () => {
            settings.set_int('recent-window-size', windowRow.value);
        });
        generalGroup.add(windowRow);
        
        widget.add(generalGroup);
        
        // Profile settings group
        const profileGroup = new Adw.PreferencesGroup({
            title: 'Connection Profile',
            description: 'Define quality thresholds for your connection type'
        });
        
        const profileRow = new Adw.ComboRow({
            title: 'Profile Selection',
            model: new Gtk.StringList({
                strings: [
                    'Auto-detect',
                    'LAN/Ethernet (≤1ms)',
                    'Fiber (≤5ms)',
                    'WiFi Local (≤10ms)',
                    'WiFi/Tethering (≤40ms)',
                    'Public/Bad WiFi (≤300ms)',
                    'ADSL (≤90ms)'
                ]
            })
        });
        
        const profileMap = {
            'auto': 0,
            'lan': 1,
            'fiber': 2,
            'wifi-local': 3,
            'wifi-internet': 4,
            'wifi-public': 5,
            'adsl': 6
        };
        const profileReverse = ['auto', 'lan', 'fiber', 'wifi-local', 'wifi-internet', 'wifi-public', 'adsl'];
        
        profileRow.selected = profileMap[settings.get_string('profile')] || 0;
        
        profileRow.connect('notify::selected', () => {
            const profile = profileReverse[profileRow.selected];
            settings.set_string('profile', profile);
        });
        profileGroup.add(profileRow);
        
        widget.add(profileGroup);
        
        // Appearance & Alerts group
        const appearanceGroup = new Adw.PreferencesGroup({
            title: 'Appearance &amp; Alerts',
            description: 'Customize visual and audio feedback'
        });
        
        // Show percentage toggle
        const percentageRow = new Adw.SwitchRow({
            title: 'Show Quality Percentage',
            subtitle: 'Display numeric percentage on the indicator icon'
        });
        percentageRow.active = settings.get_boolean('show-percentage');
        percentageRow.connect('notify::active', () => {
            settings.set_boolean('show-percentage', percentageRow.active);
        });
        appearanceGroup.add(percentageRow);
        
        // Sound alerts toggle
        const soundRow = new Adw.SwitchRow({
            title: 'Sound Alerts',
            subtitle: 'Play sounds on connection drop/restore'
        });
        soundRow.active = settings.get_boolean('sound-alerts');
        soundRow.connect('notify::active', () => {
            settings.set_boolean('sound-alerts', soundRow.active);
        });
        appearanceGroup.add(soundRow);
        
        // Graph update rate setting
        const graphRateRow = new Adw.ComboRow({
            title: 'Graph Update Rate',
            model: new Gtk.StringList({
                strings: ['Per-ping', 'Every 5 seconds', 'Every 10 seconds']
            })
        });
        
        const graphRateMap = { 'per-ping': 0, '5s': 1, '10s': 2 };
        graphRateRow.selected = graphRateMap[settings.get_string('graph-update-rate')] || 0;
        
        graphRateRow.connect('notify::selected', () => {
            const rate = ['per-ping', '5s', '10s'][graphRateRow.selected];
            settings.set_string('graph-update-rate', rate);
        });
        appearanceGroup.add(graphRateRow);
        
        widget.add(appearanceGroup);
        
        // Reset button
        const resetGroup = new Adw.PreferencesGroup();
        const resetRow = new Adw.ActionRow({
            title: 'Reset to Defaults',
            subtitle: 'Restore all settings to their default values'
        });
        
        const resetButton = new Gtk.Button({
            label: 'Reset',
            valign: Gtk.Align.CENTER,
            css_classes: ['destructive-action']
        });
        resetButton.connect('clicked', () => {
            settings.reset('target-ip');
            settings.reset('ping-count');
            settings.reset('ping-interval');
            settings.reset('profile');
            settings.reset('sound-alerts');
            settings.reset('show-percentage');
            settings.reset('graph-update-rate');
            settings.reset('recent-window-size');
            
            // Update UI
            ipRow.text = settings.get_string('target-ip');
            pingCountRow.value = settings.get_int('ping-count');
            intervalRow.selected = intervalMap[settings.get_int('ping-interval')];
            profileRow.selected = profileMap[settings.get_string('profile')];
            percentageRow.active = settings.get_boolean('show-percentage');
            soundRow.active = settings.get_boolean('sound-alerts');
            graphRateRow.selected = graphRateMap[settings.get_string('graph-update-rate')];
            windowRow.value = settings.get_int('recent-window-size');
        });
        
        resetRow.add_suffix(resetButton);
        resetGroup.add(resetRow);
        widget.add(resetGroup);
        
        return widget;
    }
    
    _isValidIP(ip) {
        // Simple IPv4 validation
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
        if (ipv4Regex.test(ip)) {
            return ip.split('.').every(num => {
                const n = parseInt(num);
                return n >= 0 && n <= 255;
            });
        }
        
        // Simple IPv6 validation (basic check)
        const ipv6Regex = /^([\da-fA-F]{1,4}:){7}[\da-fA-F]{1,4}$/;
        return ipv6Regex.test(ip);
    }
}
