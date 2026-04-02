/**
 * Quality Calculator Module
 * 
 * Calculates connection quality based on weighted combination of
 * packet loss and latency, using configurable profiles.
 */

/**
 * Connection profile definitions with thresholds
 */
export const PROFILES = {
    auto: {
        id: 'auto',
        name: 'Auto-detect',
        description: 'Automatically detect connection type',
        expectedLatency: 310  // Default fallback
    },
    lan: {
        id: 'lan',
        name: 'LAN Ethernet',
        description: 'Wired local network',
        expectedLatency: 1    // Expected excellent latency
    },
    fiber: {
        id: 'fiber',
        name: 'Fiber',
        description: 'Fiber ISP connection',
        expectedLatency: 5    // Expected excellent latency
    },
    'wifi-local': {
        id: 'wifi-local',
        name: 'WiFi Local',
        description: 'Local WiFi network',
        expectedLatency: 10   // Expected excellent latency
    },
    'wifi-internet': {
        id: 'wifi-internet',
        name: 'WiFi/Tethering',
        description: 'Internet via WiFi or tethering',
        expectedLatency: 40   // Expected excellent latency
    },
    'wifi-public': {
        id: 'wifi-public',
        name: 'Public/Bad WiFi',
        description: 'Public or congested WiFi',
        expectedLatency: 300  // Expected excellent latency
    },
    adsl: {
        id: 'adsl',
        name: 'ADSL',
        description: 'DSL ISP connection',
        expectedLatency: 90   // Expected excellent latency
    }
};

/**
 * Quality levels with thresholds
 */
export const QualityLevel = {
    EXCELLENT: 'excellent',  // 90-100%
    GOOD: 'good',            // 70-89%
    FAIR: 'fair',            // 50-69%
    POOR: 'poor',            // 30-49%
    CRITICAL: 'critical'     // 0-29%
};

/**
 * QualityCalculator - Computes connection quality score
 */
export class QualityCalculator {
    constructor(settings) {
        this.settings = settings;
        this.currentProfile = this._loadProfile();
        this.detectedProfile = null;
        this.baselineLatency = null;
        this.baselineCount = 0;
    }
    
    /**
     * Load current profile from settings
     * @private
     */
    _loadProfile() {
        const profileId = this.settings.get_string('profile');
        return PROFILES[profileId] || PROFILES.auto;
    }
    
    /**
     * Get effective profile (may be auto-detected)
     * @returns {Object} Profile object
     */
    getProfile() {
        if (this.currentProfile.id === 'auto' && this.detectedProfile) {
            return this.detectedProfile;
        }
        return this.currentProfile;
    }
    
    /**
     * Get profile name for display
     * @returns {string} Profile name
     */
    getProfileName() {
        const profile = this.getProfile();
        if (this.currentProfile.id === 'auto' && this.detectedProfile) {
            return `${this.detectedProfile.name} (Auto)`;
        }
        return profile.name;
    }
    
    /**
     * Update profile from settings (called when settings change)
     */
    updateProfile() {
        this.currentProfile = this._loadProfile();
        
        // If switching to auto, clear detected profile
        if (this.currentProfile.id === 'auto') {
            this.detectedProfile = null;
            this.baselineLatency = null;
            this.baselineCount = 0;
        }
    }
    
    /**
     * Calculate latency score using power decay
     * 
     * Formula: score = 100 * (expectedLatency / actualLatency)^k
     * Where k ≈ 0.415 to achieve 2×expected = 75 score
     * 
     * @param {number} latencyMs - Actual latency in milliseconds
     * @param {number} expectedLatencyMs - Expected excellent latency
     * @returns {number} Latency score (0-100)
     */
    _calculateLatencyScore(latencyMs, expectedLatencyMs) {
        // Sensitivity constant for 2× = 75 score
        const k = 0.415;
        
        // At or better than expected = perfect score
        if (latencyMs <= expectedLatencyMs) {
            return 100;
        }
        
        // Power decay: larger deviations have progressively bigger impact
        return 100 * Math.pow(expectedLatencyMs / latencyMs, k);
    }
    
    /**
     * Calculate packet score using power decay
     * 
     * Formula: score = 100 * (retentionRate)^k
     * Where k ≈ 5.609 to achieve 5% loss = 75 score
     * 
     * @param {number} packetLossPercent - Packet loss as percentage (0-100)
     * @returns {number} Packet score (0-100)
     */
    _calculatePacketScore(packetLossPercent) {
        // Sensitivity constant for 5% loss = 75 score
        const k = 5.609;
        
        // Retention rate: percentage of packets successfully received
        const retentionPercent = 100 - packetLossPercent;
        
        // Power decay: packet loss has severe impact on quality
        return 100 * Math.pow(retentionPercent / 100, k);
    }
    
    /**
     * Calculate quality score based on weighted metrics
     * 
     * Formula: Quality = (PacketScore * 0.4) + (LatencyScore * 0.6)
     * 
     * @param {number} packetLossPercent - Packet loss as percentage (0-100)
     * @param {number} avgLatencyMs - Average latency in milliseconds
     * @returns {number} Quality score (0-100)
     */
    calculateQuality(packetLossPercent, avgLatencyMs) {
        const profile = this.getProfile();
        
        // Packet score: power decay (5% loss = 75 score)
        const packetScore = this._calculatePacketScore(packetLossPercent);
        
        // Latency score: expected latency = 100, degrades with power decay
        // 2× expected = 75 score, graceful degradation beyond
        const latencyScore = this._calculateLatencyScore(avgLatencyMs, profile.expectedLatency);
        
        // Weighted combination: 40% packet loss, 60% latency
        // Latency is more perceptible to users than occasional packet loss
        const quality = (packetScore * 0.4) + (latencyScore * 0.6);
        
        return Math.round(Math.min(100, Math.max(0, quality)));
    }
    
    /**
     * Get quality level from score
     * @param {number} score - Quality score (0-100)
     * @returns {string} Quality level
     */
    getQualityLevel(score) {
        if (score >= 90) return QualityLevel.EXCELLENT;
        if (score >= 70) return QualityLevel.GOOD;
        if (score >= 50) return QualityLevel.FAIR;
        if (score >= 30) return QualityLevel.POOR;
        return QualityLevel.CRITICAL;
    }
    
    /**
     * Get color for quality level
     * @param {string} level - Quality level
     * @returns {string} Hex color code
     */
    getColorForLevel(level) {
        switch (level) {
            case QualityLevel.EXCELLENT:
                return '#2ecc71';  // Green
            case QualityLevel.GOOD:
                return '#27ae60';  // Dark green
            case QualityLevel.FAIR:
                return '#f1c40f';  // Yellow
            case QualityLevel.POOR:
                return '#e67e22';  // Orange
            case QualityLevel.CRITICAL:
                return '#e74c3c';  // Red
            default:
                return '#95a5a6';  // Gray
        }
    }
    
    /**
     * Get color for quality score directly
     * @param {number} score - Quality score (0-100)
     * @returns {string} Hex color code
     */
    getColorForScore(score) {
        const level = this.getQualityLevel(score);
        return this.getColorForLevel(level);
    }
    
    /**
     * Get number of signal bars for quality score
     * @param {number} score - Quality score (0-100)
     * @returns {number} Number of bars (0-4)
     */
    getBarsForScore(score) {
        if (score >= 90) return 4;
        if (score >= 70) return 3;
        if (score >= 50) return 2;
        if (score >= 30) return 1;
        return 0;
    }
    
    /**
     * Attempt to auto-detect connection profile based on latency
     * @param {number} avgLatencyMs - Average latency in milliseconds
     */
    detectProfile(avgLatencyMs) {
        if (this.currentProfile.id !== 'auto') {
            return;  // Manual mode
        }
        
        // Collect baseline samples
        this.baselineCount++;
        
        // Simple moving average for baseline
        if (this.baselineLatency === null) {
            this.baselineLatency = avgLatencyMs;
        } else {
            // Exponential moving average
            this.baselineLatency = (this.baselineLatency * 0.9) + (avgLatencyMs * 0.1);
        }
        
        // Need at least 10 samples for reliable detection
        if (this.baselineCount < 10) {
            return;
        }
        
        // Find best matching profile based on expected latency
        const latency = this.baselineLatency;
        let bestMatch = PROFILES['wifi-internet'];  // Default fallback
        
        if (latency <= PROFILES['lan'].expectedLatency) {
            bestMatch = PROFILES['lan'];
        } else if (latency <= PROFILES['fiber'].expectedLatency) {
            bestMatch = PROFILES['fiber'];
        } else if (latency <= PROFILES['wifi-local'].expectedLatency) {
            bestMatch = PROFILES['wifi-local'];
        } else if (latency <= PROFILES['wifi-internet'].expectedLatency) {
            bestMatch = PROFILES['wifi-internet'];
        } else if (latency <= PROFILES['adsl'].expectedLatency) {
            bestMatch = PROFILES['adsl'];
        } else if (latency <= PROFILES['wifi-public'].expectedLatency) {
            bestMatch = PROFILES['wifi-public'];
        }

        // Only update if profile changed
        if (!this.detectedProfile || this.detectedProfile.id !== bestMatch.id) {
            this.detectedProfile = bestMatch;
        }
    }
    
    /**
     * Reset auto-detection baseline
     */
    resetBaseline() {
        this.baselineLatency = null;
        this.baselineCount = 0;
        this.detectedProfile = null;
    }
}
