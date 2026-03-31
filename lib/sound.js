/**
 * Sound Manager Module
 *
 * Plays system sounds for connection state alerts.
 * Uses GSound (libgsound via GObject-Introspection) for GNOME integration,
 * with a canberra-gtk-play subprocess fallback.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

let GSound = null;
try {
    GSound = await import('gi://GSound');
} catch (_) {
    // GSound not available, will use subprocess fallback
}

/**
 * SoundManager - Plays system sounds for alerts
 */
export class SoundManager {
    constructor(settings) {
        this.settings = settings;
        this._gsoundCtx = null;

        if (GSound) {
            try {
                this._gsoundCtx = new GSound.Context();
                this._gsoundCtx.init(null);
                log('ConnMon: Sound system ready (GSound)');
            } catch (error) {
                log(`ConnMon: GSound init failed: ${error.message}, will use subprocess fallback`);
                this._gsoundCtx = null;
            }
        } else {
            log('ConnMon: GSound not available, will use canberra-gtk-play fallback');
        }
    }

    playConnect() {
        if (!this.settings.get_boolean('sound-alerts'))
            return;
        this._playSound('network-connectivity-established');
    }

    playDisconnect() {
        if (!this.settings.get_boolean('sound-alerts'))
            return;
        this._playSound('network-disconnected');
    }

    _playSound(eventId) {
        if (this._gsoundCtx) {
            try {
                this._gsoundCtx.play_simple({
                    [GSound.ATTR_EVENT_ID]: eventId,
                    [GSound.ATTR_MEDIA_ROLE]: 'alert',
                }, null);
                return;
            } catch (error) {
                log(`ConnMon: GSound play failed: ${error.message}`);
            }
        }

        // Fallback: spawn canberra-gtk-play
        try {
            const proc = Gio.Subprocess.new(
                ['canberra-gtk-play', '-i', eventId],
                Gio.SubprocessFlags.NONE
            );
            proc.wait_async(null, null);
        } catch (error) {
            log(`ConnMon: canberra-gtk-play fallback failed: ${error.message}`);
        }
    }

    isSoundAvailable() {
        return this._gsoundCtx !== null;
    }

    destroy() {
        this._gsoundCtx = null;
    }
}
