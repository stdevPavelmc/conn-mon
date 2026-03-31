/**
 * Pinger Module
 *
 * Executes asynchronous ping operations and emits results via signals.
 * Uses Gio.Subprocess to call the system ping command.
 */

import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

/**
 * Pinger - Executes ping operations asynchronously
 */
export const Pinger = GObject.registerClass({
    GTypeName: 'ConnMonPinger',
    Signals: {
        'ping-result': {
            flags: GObject.SignalFlags.RUN_FIRST,
            param_types: [GObject.TYPE_JSOBJECT]
        },
        'ping-error': {
            flags: GObject.SignalFlags.RUN_FIRST,
            param_types: [GObject.TYPE_JSOBJECT]
        }
    }
}, class Pinger extends GObject.Object {
    _init(settings) {
        super._init();
        this.settings = settings;
        this.targetIp = settings.get_string('target-ip');
        this.interval = settings.get_int('ping-interval');
        this.timeout = 2000; // 2 second timeout for ping response
        
        this._running = false;
        this._sourceId = null;
        this._pendingSubprocess = null;
    }
    
    /**
     * Start pinging
     */
    start() {
        if (this._running) {
            return;
        }
        
        this._running = true;
        this._executePing();
        
        // Schedule next ping
        this._sourceId = GLib.timeout_add(
            GLib.PRIORITY_DEFAULT,
            this.interval,
            this._executePing.bind(this)
        );
    }
    
    /**
     * Stop pinging
     */
    stop() {
        this._running = false;
        
        // Cancel pending subprocess
        if (this._pendingSubprocess) {
            try {
                this._pendingSubprocess.force_exit();
            } catch (e) {
                // Ignore errors on cleanup
            }
            this._pendingSubprocess = null;
        }
        
        // Remove timeout source
        if (this._sourceId !== null) {
            GLib.source_remove(this._sourceId);
            this._sourceId = null;
        }
    }
    
    /**
     * Set target IP address
     * @param {string} ip - IP address to ping
     */
    setTarget(ip) {
        this.targetIp = ip;
    }
    
    /**
     * Set ping interval
     * @param {number} ms - Interval in milliseconds
     */
    setInterval(ms) {
        this.interval = ms;
        
        // Restart timer if running
        if (this._running) {
            this.stop();
            this.start();
        }
    }
    
    /**
     * Execute a single ping
     * @private
     */
    _executePing() {
        if (!this._running) {
            return GLib.SOURCE_REMOVE;
        }
        
        const startTime = GLib.get_monotonic_time();
        const self = this;
        
        try {
            // Build ping command
            // Using -c 1 for single ping, -W 2 for 2 second timeout
            // On Linux, ping -c 1 -W 2 <ip>
            const cmd = ['ping', '-c', '1', '-W', '2', this.targetIp];
            
            const launcher = new Gio.SubprocessLauncher({
                flags: Gio.SubprocessFlags.STDOUT_PIPE | Gio.SubprocessFlags.STDERR_PIPE
            });
            
            const subprocess = launcher.spawnv(cmd);
            this._pendingSubprocess = subprocess;
            
            // Wait for subprocess to complete using communicate_utf8_async
            subprocess.communicate_utf8_async(null, null, (sub, res) => {
                try {
                    const [success, stdout, stderr] = sub.communicate_utf8_finish(res);
                    const endTime = GLib.get_monotonic_time();

                    let rtt = null;

                    if (success) {
                        // Parse time=X.XXX ms from ping output
                        const timeMatch = stdout.match(/time[=<](\d+\.?\d*)\s*ms/);
                        if (timeMatch) {
                            rtt = parseFloat(timeMatch[1]);
                        } else {
                            // Fallback to estimated RTT from wall-clock timing
                            rtt = (endTime - startTime) / 1000; // µs → ms
                        }
                    }

                    self._pendingSubprocess = null;

                    // Emit result
                    self.emit('ping-result', {
                        success: success,
                        rtt: rtt,
                        timestamp: Math.floor(Date.now() / 1000),
                        target: self.targetIp
                    });
                } catch (error) {
                    self._pendingSubprocess = null;
                    self.emit('ping-error', {
                        message: error.message,
                        code: error.code
                    });

                    // Emit failed ping result
                    self.emit('ping-result', {
                        success: false,
                        rtt: null,
                        timestamp: Math.floor(Date.now() / 1000),
                        target: self.targetIp,
                        error: error.message
                    });
                }
            });
        } catch (error) {
            this._pendingSubprocess = null;
            this.emit('ping-error', {
                message: error.message,
                code: error.code
            });
            
            // Emit failed ping result
            this.emit('ping-result', {
                success: false,
                rtt: null,
                timestamp: Math.floor(Date.now() / 1000),
                target: this.targetIp,
                error: error.message
            });
        }
        
        return GLib.SOURCE_CONTINUE;
    }
});
