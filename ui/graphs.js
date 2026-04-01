/**
 * Graph Components
 *
 * Real-time graphs for ACK success rate and latency using Cairo rendering.
 */

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Cairo from 'gi://cairo';

/**
 * Convert hex color string to RGBA components for Cairo
 * @param {string} hex - Hex color string (#RRGGBB or #RRGGBBAA)
 * @returns {number[]} [r, g, b, a] each in range 0.0–1.0
 */
function hexToRGBA(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1.0;
    return [r, g, b, a];
}

/**
 * PingGraph - DrawingArea-based graph for ping data
 */
export const PingGraph = GObject.registerClass({
    GTypeName: 'ConnMonPingGraph'
}, class PingGraph extends St.DrawingArea {
    _init(options = {}) {
        super._init();

        this.data = options.data || [];
        this.graphType = options.type || 'line';  // 'line' or 'bar'
        this.color = options.color || '#3584e4';
        this.fillColor = options.fillColor || '#3584e440';
        this.maxValue = options.maxValue || 100;
        this.minValue = options.minValue || 0;
        this.showGrid = options.showGrid !== false;
        this.gridColor = options.gridColor || '#33333340';
        this.textColor = options.textColor || '#aaaaaa';
        this.valueFormatter = options.valueFormatter || null;

        // Set initial size
        this.set_size(300, 100);

        // Connect draw signal for St.DrawingArea
        this.connect('repaint', this._onRepaint.bind(this));
    }

    /**
     * Handle repaint signal
     * @private
     */
    _onRepaint() {
        const allocation = this.get_allocation_box();
        const width = allocation.x2 - allocation.x1;
        const height = allocation.y2 - allocation.y1;

        const cr = this.get_context();
        this._doDraw(cr, width, height);
    }

    /**
     * Set graph data
     * @param {Array} data - Array of values to display
     */
    setData(data) {
        this.data = data;
        this.queue_repaint();
    }

    /**
     * Set Y-axis maximum value
     * @param {number} max - Maximum value
     */
    setMaxValue(max) {
        this.maxValue = max;
        this.queue_repaint();
    }

    /**
     * Draw the graph
     * @private
     */
    _doDraw(cr, width, height) {
        // Clear canvas
        cr.setSourceRGBA(0, 0, 0, 0);
        cr.paint();

        if (this.data.length === 0) {
            return;
        }

        // Calculate dimensions
        const paddingLeft = 30;
        const paddingRight = 10;
        const paddingTop = 10;
        const paddingBottom = 20;

        const graphWidth = width - paddingLeft - paddingRight;
        const graphHeight = height - paddingTop - paddingBottom;

        // Draw grid
        if (this.showGrid) {
            this._drawGrid(cr, paddingLeft, paddingTop, graphWidth, graphHeight);
        }

        // Draw data
        if (this.graphType === 'bar') {
            this._drawBarGraph(cr, paddingLeft, paddingTop, graphWidth, graphHeight);
        } else {
            this._drawLineGraph(cr, paddingLeft, paddingTop, graphWidth, graphHeight);
        }

        // Draw axes labels
        this._drawLabels(cr, width, height, paddingLeft, paddingTop, graphWidth, graphHeight);
    }
    
    /**
     * Invalidate and trigger redraw
     */
    invalidate() {
        this.queue_repaint();
    }

    /**
     * Draw grid lines
     * @private
     */
    _drawGrid(cr, x, y, width, height) {
        cr.setSourceRGBA(...hexToRGBA(this.gridColor));
        cr.setLineWidth(1);
        
        // Horizontal grid lines (3 lines)
        for (let i = 0; i <= 3; i++) {
            const gy = y + (height / 3) * i;
            cr.moveTo(x, gy);
            cr.lineTo(x + width, gy);
        }
        
        cr.stroke();
    }
    
    /**
     * Draw bar graph
     * @private
     */
    _drawBarGraph(cr, x, y, width, height) {
        const barCount = this.data.length;
        const barWidth = Math.max(1, (width / barCount) - 1);
        
        for (let i = 0; i < barCount; i++) {
            const value = this.data[i];
            const normalizedValue = (value - this.minValue) / (this.maxValue - this.minValue);
            const barHeight = normalizedValue * height;
            
            const barX = x + (i * (barWidth + 1));
            const barY = y + height - barHeight;
            
            // Color based on value (for ACK graph: green=1, red=0)
            if (value >= 0.9) {
                cr.setSourceRGBA(...hexToRGBA('#2ecc71'));  // Green
            } else if (value >= 0.5) {
                cr.setSourceRGBA(...hexToRGBA('#f1c40f'));  // Yellow
            } else {
                cr.setSourceRGBA(...hexToRGBA('#e74c3c'));  // Red
            }
            
            // Draw bar
            cr.rectangle(barX, barY, barWidth, barHeight);
            cr.fill();
        }
    }
    
    /**
     * Draw line graph with filled area
     * @private
     */
    _drawLineGraph(cr, x, y, width, height) {
        const pointCount = this.data.length;
        if (pointCount < 2) {
            return;
        }
        
        const stepX = width / (pointCount - 1);
        
        // Create path for line
        cr.setSourceRGBA(...hexToRGBA(this.color));
        cr.setLineWidth(2);
        cr.setLineJoin(Cairo.LineJoin.ROUND);
        cr.setLineCap(Cairo.LineCap.ROUND);
        
        // Draw line
        for (let i = 0; i < pointCount; i++) {
            const value = this.data[i];
            const normalizedValue = (value - this.minValue) / (this.maxValue - this.minValue);
            const pointX = x + (i * stepX);
            const pointY = y + height - (normalizedValue * height);
            
            if (i === 0) {
                cr.moveTo(pointX, pointY);
            } else {
                cr.lineTo(pointX, pointY);
            }
        }
        
        cr.stroke();
        
        // Draw filled area below line
        cr.setSourceRGBA(...hexToRGBA(this.fillColor));
        
        for (let i = 0; i < pointCount; i++) {
            const value = this.data[i];
            const normalizedValue = (value - this.minValue) / (this.maxValue - this.minValue);
            const pointX = x + (i * stepX);
            const pointY = y + height - (normalizedValue * height);
            
            if (i === 0) {
                cr.moveTo(pointX, pointY);
            } else {
                cr.lineTo(pointX, pointY);
            }
        }
        
        // Close path to bottom
        cr.lineTo(x + width, y + height);
        cr.lineTo(x, y + height);
        cr.closePath();
        cr.fill();
    }
    
    /**
     * Draw axis labels
     * @private
     */
    _drawLabels(cr, width, height, paddingLeft, paddingTop, graphWidth, graphHeight) {
        // Y-axis labels
        cr.setSourceRGBA(...hexToRGBA(this.textColor));
        
        // Top value
        const topValue = this.valueFormatter ? this.valueFormatter(this.maxValue) : `${Math.round(this.maxValue)}`;
        cr.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        cr.setFontSize(10);
        cr.moveTo(2, paddingTop + 10);
        cr.showText(topValue);
        
        // Bottom value
        const bottomValue = this.valueFormatter ? this.valueFormatter(this.minValue) : `${Math.round(this.minValue)}`;
        cr.moveTo(2, paddingTop + graphHeight);
        cr.showText(bottomValue);
        
        // "Now" label on right
        cr.moveTo(width - 25, paddingTop + graphHeight + 15);
        cr.showText('Now');
    }
});

/**
 * AckGraph - Specialized graph for ACK success rate
 */
export const AckGraph = GObject.registerClass({
    GTypeName: 'ConnMonAckGraph'
}, class AckGraph extends PingGraph {
    _init() {
        super._init({
            type: 'bar',
            color: '#2ecc71',
            fillColor: '#2ecc7140',
            maxValue: 1,
            minValue: 0,
            showGrid: true
        });
    }

    /**
     * Set ACK data (array of 0/1 values)
     * @param {Array} pingResults - Array of ping result objects
     */
    setFromPingResults(pingResults) {
        const data = pingResults.map(r => r.success ? 1 : 0);
        this.setData(data);
    }
});

/**
 * LatencyGraph - Specialized graph for latency over time
 */
export const LatencyGraph = GObject.registerClass({
    GTypeName: 'ConnMonLatencyGraph'
}, class LatencyGraph extends PingGraph {
    _init() {
        super._init({
            type: 'line',
            color: '#3584e4',
            fillColor: '#3584e440',
            maxValue: 100,
            minValue: 0,
            showGrid: true,
            valueFormatter: (v) => `${Math.round(v)}ms`
        });
    }

    /**
     * Set latency data from ping results
     * @param {Array} pingResults - Array of ping result objects
     */
    setFromPingResults(pingResults) {
        const data = pingResults.map(r => r.rtt !== null ? r.rtt : 0);

        // Auto-scale max value
        const maxLatency = Math.max(...data.filter(v => v > 0), 100);
        this.setMaxValue(Math.ceil(maxLatency / 10) * 10);

        this.setData(data);
    }
});
