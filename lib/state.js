/**
 * State Machine Module
 * 
 * Tracks connection state transitions based on recent ping results.
 * Uses a sliding window of the most recent pings for detection.
 */

import GObject from 'gi://GObject';

/**
 * Connection states
 */
export const ConnectionState = {
    HEALTHY: 'healthy',
    PROBLEM: 'problem',
    DROPPED: 'dropped',
    REVIVING: 'reviving',
    RESTORED: 'restored'
};

/**
 * State descriptions for UI
 */
export const StateDescriptions = {
    [ConnectionState.HEALTHY]: 'Connection Healthy',
    [ConnectionState.PROBLEM]: 'Connection Problems',
    [ConnectionState.DROPPED]: 'Connection Dropped',
    [ConnectionState.REVIVING]: 'Connection Reviving',
    [ConnectionState.RESTORED]: 'Connection Restored'
};

/**
 * StateMachine - Manages connection state transitions
 * 
 * State transition logic:
 * - From HEALTHY: 5% failure (1/5) → PROBLEM, 10% failure (2/5) → DROPPED
 * - From DROPPED: 5% success (1/5) → REVIVING, 10% success (2/5) → RESTORED
 * - From RESTORED: 5% failure → PROBLEM, then back to HEALTHY or DROPPED
 */
export const StateMachine = GObject.registerClass({
    GTypeName: 'ConnMonStateMachine',
    Signals: {
        'state-changed': {
            param_types: [GObject.TYPE_STRING, GObject.TYPE_STRING]
        },
        'alert': {
            param_types: [GObject.TYPE_STRING]
        }
    }
}, class StateMachine extends GObject.Object {
    _init(settings) {
        super._init();
        this.settings = settings;
        this.windowSize = settings.get_int('recent-window-size');
        
        this.currentState = ConnectionState.HEALTHY;
        this.recentPings = [];
        
        // Track state history
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
    }
    
    /**
     * Process a ping result and potentially change state
     * @param {Object} result - Ping result from pinger
     */
    processPing(result) {
        // Add to recent pings window
        this.recentPings.push(result);
        
        // Maintain window size
        if (this.recentPings.length > this.windowSize) {
            this.recentPings.shift();
        }
        
        // Track consecutive results
        if (result.success) {
            this.consecutiveSuccesses++;
            this.consecutiveFailures = 0;
        } else {
            this.consecutiveFailures++;
            this.consecutiveSuccesses = 0;
        }
        
        // Determine new state based on current state and recent results
        const newState = this._determineState();
        
        // Handle state transition
        if (newState !== this.currentState) {
            const oldState = this.currentState;
            this.currentState = newState;
            
            // Emit state change signal
            this.emit('state-changed', oldState, newState);
            
            // Emit alert for specific transitions
            this._checkForAlerts(oldState, newState);
        }
    }
    
    /**
     * Determine the appropriate state based on recent pings
     * @private
     * @returns {string} New state
     */
    _determineState() {
        if (this.recentPings.length === 0) {
            return ConnectionState.HEALTHY;
        }
        
        const failures = this.recentPings.filter(r => !r.success).length;
        const successes = this.recentPings.filter(r => r.success).length;
        const total = this.recentPings.length;
        
        const failureRate = failures / total;
        const successRate = successes / total;
        
        // State-specific logic
        switch (this.currentState) {
            case ConnectionState.DROPPED:
                // From DROPPED: check for recovery
                if (successRate >= 0.10) {  // 10% success (e.g., 2/5 or more)
                    return ConnectionState.RESTORED;
                }
                if (successRate >= 0.05) {  // 5% success (e.g., 1/5)
                    return ConnectionState.REVIVING;
                }
                return ConnectionState.DROPPED;
            
            case ConnectionState.REVIVING:
                // From REVIVING: check for full restore or back to dropped
                if (successRate >= 0.10) {
                    return ConnectionState.RESTORED;
                }
                if (failureRate >= 0.10) {
                    return ConnectionState.DROPPED;
                }
                return ConnectionState.REVIVING;
            
            case ConnectionState.RESTORED:
                // From RESTORED: treat similar to HEALTHY but with awareness
                if (failureRate >= 0.10) {
                    return ConnectionState.DROPPED;
                }
                if (failureRate >= 0.05) {
                    return ConnectionState.PROBLEM;
                }
                return ConnectionState.HEALTHY;
            
            case ConnectionState.PROBLEM:
                // From PROBLEM: check for improvement or worsening
                if (failureRate >= 0.10) {
                    return ConnectionState.DROPPED;
                }
                if (failureRate < 0.05) {
                    return ConnectionState.HEALTHY;
                }
                return ConnectionState.PROBLEM;
            
            case ConnectionState.HEALTHY:
            default:
                // From HEALTHY: check for problems
                if (failureRate >= 0.10) {
                    return ConnectionState.DROPPED;
                }
                if (failureRate >= 0.05) {
                    return ConnectionState.PROBLEM;
                }
                return ConnectionState.HEALTHY;
        }
    }
    
    /**
     * Check if state transition should trigger an alert
     * @private
     * @param {string} oldState - Previous state
     * @param {string} newState - New state
     */
    _checkForAlerts(oldState, newState) {
        // Connection dropped alert
        if (newState === ConnectionState.DROPPED) {
            this.emit('alert', 'drop');
        }
        
        // Connection restored alert (from reviving or dropped)
        if (newState === ConnectionState.RESTORED &&
            (oldState === ConnectionState.REVIVING || oldState === ConnectionState.DROPPED)) {
            this.emit('alert', 'restore');
        }
    }
    
    /**
     * Get current state
     * @returns {string} Current connection state
     */
    getCurrentState() {
        return this.currentState;
    }
    
    /**
     * Check if connection is dropped
     * @returns {boolean} True if in DROPPED state
     */
    isDropped() {
        return this.currentState === ConnectionState.DROPPED;
    }
    
    /**
     * Check if connection is recovering (reviving or restored)
     * @returns {boolean} True if recovering
     */
    isRecovering() {
        return this.currentState === ConnectionState.REVIVING ||
               this.currentState === ConnectionState.RESTORED;
    }
    
    /**
     * Check if connection is healthy
     * @returns {boolean} True if in HEALTHY or RESTORED state
     */
    isHealthy() {
        return this.currentState === ConnectionState.HEALTHY ||
               this.currentState === ConnectionState.RESTORED;
    }
    
    /**
     * Get state description for UI
     * @returns {string} Human-readable state description
     */
    getStateDescription() {
        return StateDescriptions[this.currentState] || 'Unknown';
    }
    
    /**
     * Get consecutive failure count
     * @returns {number} Number of consecutive failed pings
     */
    getConsecutiveFailures() {
        return this.consecutiveFailures;
    }
    
    /**
     * Get consecutive success count
     * @returns {number} Number of consecutive successful pings
     */
    getConsecutiveSuccesses() {
        return this.consecutiveSuccesses;
    }
    
    /**
     * Reset state machine (called on settings change or manual reset)
     */
    reset() {
        this.currentState = ConnectionState.HEALTHY;
        this.recentPings = [];
        this.consecutiveFailures = 0;
        this.consecutiveSuccesses = 0;
    }
    
    /**
     * Update window size from settings
     * @param {number} size - New window size
     */
    setWindowSize(size) {
        this.windowSize = size;
        
        // Trim recent pings if necessary
        while (this.recentPings.length > size) {
            this.recentPings.shift();
        }
    }
});
