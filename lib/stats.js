/**
 * Statistics Tracker Module
 *
 * Aggregates ping results and provides statistical metrics.
 */

import { CircularBuffer } from './buffer.js';

/**
 * StatsTracker - Tracks and aggregates ping statistics
 */
export class StatsTracker {
    constructor(maxHistory = 100) {
        this.maxHistory = maxHistory;
        this.buffer = new CircularBuffer(maxHistory);
        
        // Running totals
        this.totalPings = 0;
        this.successfulPings = 0;
        this.failedPings = 0;
        
        // Latency tracking
        this.latencySum = 0;
        this.minLatency = Infinity;
        this.maxLatency = 0;
        
        // Session tracking
        this.sessionStart = Math.floor(Date.now() / 1000);
        this.lastRestoreTime = Math.floor(Date.now() / 1000);
    }
    
    /**
     * Record a ping result
     * @param {Object} result - Ping result from pinger
     */
    recordPing(result) {
        this.totalPings++;
        this.buffer.push(result);
        
        if (result.success) {
            this.successfulPings++;
            
            if (result.rtt !== null) {
                this.latencySum += result.rtt;
                this.minLatency = Math.min(this.minLatency, result.rtt);
                this.maxLatency = Math.max(this.maxLatency, result.rtt);
            }
        } else {
            this.failedPings++;
        }
    }
    
    /**
     * Reset statistics (called on connection restore)
     */
    reset() {
        this.buffer.clear();
        this.totalPings = 0;
        this.successfulPings = 0;
        this.failedPings = 0;
        this.latencySum = 0;
        this.minLatency = Infinity;
        this.maxLatency = 0;
        this.lastRestoreTime = Math.floor(Date.now() / 1000);
    }
    
    /**
     * Get packet loss percentage
     * @returns {number} Packet loss as percentage (0-100)
     */
    getPacketLossPercent() {
        if (this.totalPings === 0) {
            return 0;
        }
        return (this.failedPings / this.totalPings) * 100;
    }
    
    /**
     * Get packet success (ack) percentage
     * @returns {number} Success rate as percentage (0-100)
     */
    getPacketAckPercent() {
        if (this.totalPings === 0) {
            return 100;
        }
        return (this.successfulPings / this.totalPings) * 100;
    }
    
    /**
     * Get average latency
     * @returns {number} Average latency in ms, or 0 if no successful pings
     */
    getAverageLatency() {
        if (this.successfulPings === 0 || this.latencySum === 0) {
            return 0;
        }
        return this.latencySum / this.successfulPings;
    }
    
    /**
     * Get recent packet loss percentage
     * @param {number} windowSize - Number of recent pings to consider
     * @returns {number} Recent packet loss as percentage (0-100)
     */
    getRecentPacketLossPercent(windowSize = 5) {
        const recent = this.buffer.getRecent(windowSize);
        if (recent.length === 0) {
            return 0;
        }
        const failures = recent.filter(r => !r.success).length;
        return (failures / recent.length) * 100;
    }
    
    /**
     * Get recent packet success percentage
     * @param {number} windowSize - Number of recent pings to consider
     * @returns {number} Recent success rate as percentage (0-100)
     */
    getRecentPacketAckPercent(windowSize = 5) {
        const recent = this.buffer.getRecent(windowSize);
        if (recent.length === 0) {
            return 100;
        }
        const successes = recent.filter(r => r.success).length;
        return (successes / recent.length) * 100;
    }
    
    /**
     * Get recent average latency
     * @param {number} windowSize - Number of recent pings to consider
     * @returns {number} Recent average latency in ms
     */
    getRecentAverageLatency(windowSize = 5) {
        const recent = this.buffer.getRecent(windowSize);
        const successful = recent.filter(r => r.success && r.rtt !== null);
        
        if (successful.length === 0) {
            return 0;
        }
        
        const sum = successful.reduce((acc, r) => acc + r.rtt, 0);
        return sum / successful.length;
    }
    
    /**
     * Get full ping history for graphs
     * @returns {Array} Array of all ping results in chronological order
     */
    getHistory() {
        return this.buffer.getHistory();
    }
    
    /**
     * Get recent pings
     * @param {number} count - Number of recent pings to return
     * @returns {Array} Recent ping results
     */
    getRecent(count = 5) {
        return this.buffer.getRecent(count);
    }
    
    /**
     * Get comprehensive statistics object
     * @returns {Object} All statistics
     */
    getStats() {
        return {
            totalPings: this.totalPings,
            successfulPings: this.successfulPings,
            failedPings: this.failedPings,
            packetLossPercent: this.getPacketLossPercent(),
            packetAckPercent: this.getPacketAckPercent(),
            minLatency: this.minLatency === Infinity ? 0 : this.minLatency,
            maxLatency: this.maxLatency,
            avgLatency: this.getAverageLatency(),
            recentPacketLossPercent: this.getRecentPacketLossPercent(),
            recentPacketAckPercent: this.getRecentPacketAckPercent(),
            recentAvgLatency: this.getRecentAverageLatency(),
            uptimeSeconds: Math.floor(Date.now() / 1000) - this.sessionStart,
            uptimeSinceRestoreSeconds: Math.floor(Date.now() / 1000) - this.lastRestoreTime
        };
    }
    
    /**
     * Format uptime as human-readable string
     * @param {number} seconds - Seconds to format
     * @returns {string} Formatted uptime (e.g., "14m 32s")
     */
    formatUptime(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        
        if (minutes < 60) {
            return `${minutes}m ${remainingSeconds}s`;
        }
        
        const hours = Math.floor(minutes / 60);
        const remainingMinutes = minutes % 60;
        return `${hours}h ${remainingMinutes}m`;
    }
    
    /**
     * Get formatted uptime since session start
     * @returns {string} Formatted uptime
     */
    getFormattedUptime() {
        const stats = this.getStats();
        return this.formatUptime(stats.uptimeSeconds);
    }
    
    /**
     * Get formatted uptime since last restore
     * @returns {string} Formatted uptime
     */
    getFormattedUptimeSinceRestore() {
        const stats = this.getStats();
        return this.formatUptime(stats.uptimeSinceRestoreSeconds);
    }
}
