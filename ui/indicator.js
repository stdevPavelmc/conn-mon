/**
 * Panel Indicator Component
 * 
 * Displays connection status in the system panel with
 * signal bars icon and quality percentage overlay.
 */

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import Gio from 'gi://Gio';
import St from 'gi://St';

import * as PanelMenu from 'resource:///org/gnome/shell/ui/panelMenu.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

import { ConnectionState, StateDescriptions } from '../lib/state.js';
import { QualityLevel } from '../lib/quality.js';
import { ConnectionPanel } from './panel.js';

/**
 * ConnectionIndicator - Panel button with connection status
 */
export const ConnectionIndicator = GObject.registerClass({
    GTypeName: 'ConnMonIndicator',
    Signals: {
        'settings-requested': {}
    }
}, class ConnectionIndicator extends PanelMenu.Button {
    _init(settings, metadata) {
        super._init(0.0, 'Connection Monitor', false);
        
        log('ConnMon: Initializing indicator');
        
        this.settings = settings;
        this.metadata = metadata;
        this._panelItem = null;
        
        this.currentState = ConnectionState.HEALTHY;
        this.currentQuality = 100;
        this.currentProfile = 'Auto-detect';
        
        // Create icon container
        this._iconContainer = new St.BoxLayout({
            style_class: 'panel-status-menu-box',
            reactive: true,
            track_hover: true
        });
        
        // Create signal icon
        this._icon = new St.Icon({
            icon_name: 'network-signal-symbolic',
            style_class: 'system-status-icon',
            track_hover: true,
            reactive: true
        });
        
        // Create quality percentage label
        this._percentageLabel = new St.Label({
            text: '',
            style_class: 'conn-mon-percentage',
            y_align: Clutter.ActorAlign.CENTER
        });
        
        // Assemble container
        this._iconContainer.add_child(this._icon);
        this._iconContainer.add_child(this._percentageLabel);
        
        this.add_child(this._iconContainer);
        
        // Ensure the actor is reactive
        this.reactive = true;
        this.track_hover = true;

        // GNOME 49+ fix: Remove the Clutter.ClickGesture that intercepts button events
        // before our button-press-event handlers fire
        if (this._clickGesture) {
            this.remove_action(this._clickGesture);
            this._clickGesture = null;
        }

        // Connect button-press-event on self and child container so clicks land
        // regardless of which actor is the hit target under the pointer
        this._iconContainer.connect('button-press-event', (_actor, event) => {
            return this._onButtonPress(event);
        });
        this.connect('button-press-event', (_actor, event) => {
            return this._onButtonPress(event);
        });

        // Initialize panel menu item
        this._getOrCreatePanel();

        log('ConnMon: Indicator UI created');
        
        // Connect settings changes
        this._settingsChangedId = this.settings.connect(
            'changed',
            this._onSettingsChanged.bind(this)
        );
        
        // Apply initial settings
        this._updatePercentageVisibility();
        
        // Detect theme
        this._updateThemeVariant();
        
        log('ConnMon: Indicator initialized successfully');
    }
    
    /**
     * Update indicator state
     * @param {string} state - Connection state
     * @param {number} quality - Quality score (0-100)
     * @param {string} profile - Current profile name
     */
    updateState(state, quality, profile) {
        this.currentState = state;
        this.currentQuality = quality;
        this.currentProfile = profile;
        
        this._updateIcon(state, quality);
        this._updatePercentage(quality);
        this._updateTooltip(state, quality, profile);
    }
    
    /**
     * Update icon based on state and quality
     * @private
     */
    _updateIcon(state, quality) {
        // Determine number of bars
        let bars = 4;
        if (quality >= 90) bars = 4;
        else if (quality >= 70) bars = 3;
        else if (quality >= 50) bars = 2;
        else if (quality >= 30) bars = 1;
        else bars = 0;
        
        // Select icon based on bars
        let iconName = 'network-signal-symbolic';
        if (bars < 4 && bars > 0) {
            iconName = `network-signal-${bars}-symbolic`;
        } else if (bars === 0) {
            iconName = 'network-signal-0-symbolic';
        }
        
        this._icon.icon_name = iconName;
        
        // Apply color based on state/quality
        const color = this._getColorForQuality(quality, state);
        this._icon.set_style(`color: ${color};`);
    }
    
    /**
     * Update percentage label
     * @private
     */
    _updatePercentage(quality) {
        if (this.settings.get_boolean('show-percentage')) {
            this._percentageLabel.text = `${quality}%`;
            this._percentageLabel.set_style(`color: ${this._getColorForQuality(quality, this.currentState)};`);
        } else {
            this._percentageLabel.text = '';
        }
    }
    
    /**
     * Update tooltip text
     * @private
     */
    _updateTooltip(state, quality, profile) {
        const stateText = StateDescriptions[state] || 'Unknown';
        const tooltipText = `${stateText}\nQuality: ${quality}%\nProfile: ${profile}`;
        
        this.tooltip_text = tooltipText;
    }
    
    /**
     * Get color for quality level
     * @private
     */
    _getColorForQuality(quality, state) {
        // Special colors for specific states
        if (state === ConnectionState.DROPPED) {
            return '#e74c3c';  // Red
        }
        if (state === ConnectionState.REVIVING) {
            return '#f39c12';  // Orange (recovering)
        }
        if (state === ConnectionState.RESTORED) {
            return '#2ecc71';  // Green (just restored)
        }
        
        // Normal quality-based colors
        if (quality >= 90) return '#2ecc71';  // Green
        if (quality >= 70) return '#27ae60';  // Dark green
        if (quality >= 50) return '#f1c40f';  // Yellow
        if (quality >= 30) return '#e67e22';  // Orange
        return '#e74c3c';  // Red
    }
    
    /**
     * Handle button press events via signal (works on GNOME 49+ / Wayland).
     * Left click toggles the popup menu; middle/right click opens settings.
     */
    _onButtonPress(event) {
        const button = event.get_button();
        log(`ConnMon: Button press event - button: ${button}`);

        if (button === 2 || button === 3) {
            log('ConnMon: Opening settings (middle/right click)');
            this.emit('settings-requested');
            return Clutter.EVENT_STOP;
        }

        // Left click: toggle the popup menu
        if (button === 1) {
            this.menu.toggle();
            return Clutter.EVENT_STOP;
        }

        return Clutter.EVENT_PROPAGATE;
    }

    /**
     * Handle enter events for hover
     */
    vfunc_enter_event(event) {
        log('ConnMon: Enter event (hover start)');
        this.add_style_class_name('conn-mon-hover');
        return super.vfunc_enter_event(event);
    }

    /**
     * Handle leave events for hover
     */
    vfunc_leave_event(event) {
        log('ConnMon: Leave event (hover end)');
        this.remove_style_class_name('conn-mon-hover');
        return super.vfunc_leave_event(event);
    }
    
    /**
     * Handle settings changes
     * @private
     */
    _onSettingsChanged(settings, key) {
        if (key === 'show-percentage') {
            this._updatePercentageVisibility();
        }
        
        // Refresh display
        this._updateIcon(this.currentState, this.currentQuality);
        this._updatePercentage(this.currentQuality);
    }
    
    /**
     * Update percentage label visibility
     * @private
     */
    _updatePercentageVisibility() {
        if (this.settings.get_boolean('show-percentage')) {
            this._percentageLabel.show();
            this._updatePercentage(this.currentQuality);
        } else {
            this._percentageLabel.hide();
        }
    }
    
    /**
     * Update theme variant based on GNOME theme
     * @private
     */
    _updateThemeVariant() {
        try {
            const interfaceSettings = new Gio.Settings({
                schema: 'org.gnome.desktop.interface'
            });
            const colorScheme = interfaceSettings.get_string('color-scheme');
            this._isDarkTheme = colorScheme === 'prefer-dark';
            
            // Use add_style_class_name instead of direct assignment to avoid API issues
            this._icon.add_style_class_name('system-status-icon');
        } catch (error) {
            log(`ConnMon: Could not detect theme: ${error.message}`);
        }
    }
    
    /**
     * Get or create the panel menu item
     * @private
     */
    _getOrCreatePanel() {
        if (!this._panelItem) {
            this._panelItem = new ConnectionPanel(this, this.settings);
            this.menu.addMenuItem(this._panelItem);
        }
        return this._panelItem;
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        if (this._settingsChangedId) {
            this.settings.disconnect(this._settingsChangedId);
            this._settingsChangedId = null;
        }
        
        if (this._panelItem) {
            this._panelItem.destroy();
            this._panelItem = null;
        }
        
        super.destroy();
    }
});
