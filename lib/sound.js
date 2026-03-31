/**
 * Sound Manager Module
 * 
 * Plays system sounds for connection state alerts.
 * Uses GSound for GNOME integration.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

/**
 * SoundManager - Plays system sounds for alerts
 */
export class SoundManager {
    constructor(settings) {
        this.settings = settings;
        this.context = null;
        
        try {
            // Try to initialize GSound context
            this.context = Gio.DBus.proxy_new_for_bus_sync(
                Gio.BusType.SESSION,
                Gio.DBusProxyFlags.NONE,
                'org.freedesktop.canberra',
                '/org/freedesktop/canberra',
                'org.freedesktop.canberra',
                null
            );
        } catch (error) {
            // GSound/Canberra not available, will use fallback
            log('ConnMon: Sound system not available, sounds disabled');
            this.context = null;
        }
    }
    
    /**
     * Play connection established sound
     */
    playConnect() {
        if (!this.settings.get_boolean('sound-alerts')) {
            return;
        }
        
        this._playSound('network-connectivity-established', 'Connection established');
    }
    
    /**
     * Play connection lost sound
     */
    playDisconnect() {
        if (!this.settings.get_boolean('sound-alerts')) {
            return;
        }
        
        this._playSound('network-disconnected', 'Connection lost');
    }
    
    /**
     * Play a system sound
     * @private
     * @param {string} eventId - Sound event ID
     * @param {string} description - Sound description
     */
    _playSound(eventId, description) {
        if (!this.context) {
            // Fallback: try using system bell or log
            log(`ConnMon: Would play sound: ${eventId} - ${description}`);
            return;
        }
        
        try {
            // Use Canberra play_simple via D-Bus
            // This is a simplified approach - in production you might want
            // to use the actual GSound library
            const props = new GLib.Variant('a{sv}', {
                'event.id': new GLib.Variant('s', eventId),
                'event.description': new GLib.Variant('s', description),
                'media.role': new GLib.Variant('s', 'alert')
            });
            
            this.context.call_sync(
                'PlaySimple',
                new GLib.Variant('(a{sv})', [props]),
                null,
                Gio.DBusCallFlags.NO_AUTO_START,
                1000,  // 1 second timeout
                null
            );
        } catch (error) {
            // If sound fails, log but don't crash
            log(`ConnMon: Failed to play sound: ${error.message}`);
        }
    }
    
    /**
     * Alternative: Play sound using Paplay (PulseAudio)
     * This is a fallback if GSound is not available
     * @private
     * @param {string} soundFile - Path to sound file
     */
    _playSoundFile(soundFile) {
        try {
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.NONE
            });
            
            // Try paplay first (PulseAudio)
            launcher.spawnv(['paplay', soundFile]);
        } catch (error) {
            log(`ConnMon: Failed to play sound file: ${error.message}`);
        }
    }
    
    /**
     * Check if sound is available
     * @returns {boolean} True if sound system is working
     */
    isSoundAvailable() {
        return this.context !== null;
    }
}
