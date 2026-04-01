/**
 * Graph Components
 *
 * Real-time graphs for ACK success rate and latency.
 *
 * Uses St.DrawingArea with the 'repaint' signal for Cairo drawing.
 *
 * Clutter.Canvas was removed from the public Mutter/GJS bindings in
 * GNOME Shell 48 as part of the Wayland damage-tracking rewrite.
 * St.DrawingArea is the correct compositor-safe replacement: it hooks
 * into the St/Clutter repaint cycle natively and the cogl_buffer crash
 * that existed in older shells (< 45) no longer occurs.
 *
 * Invalidation: call this._drawingArea.queue_repaint() — equivalent to
 * the old Clutter.Canvas.invalidate(), safe to call from any context.
 */

import GObject from 'gi://GObject';
import Clutter from 'gi://Clutter';
import St from 'gi://St';
import Cairo from 'gi://cairo';

function hexToRGBA(hex) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1.0;
    return [r, g, b, a];
}

/**
 * PingGraph — St.Widget hosting an St.DrawingArea for Cairo drawing.
 *
 * queue_repaint() schedules a redraw through the normal St repaint path,
 * safe to call from ping callbacks / GLib timeouts.
 */
export const PingGraph = GObject.registerClass({
    GTypeName: 'ConnMonPingGraph'
}, class PingGraph extends St.Widget {

    _init(options = {}) {
        super._init({
            layout_manager: new Clutter.BinLayout(),
            x_expand: true,
        });

        this.data           = options.data             || [];
        this.graphType      = options.type             || 'line';
        this.color          = options.color            || '#3584e4';
        this.fillColor      = options.fillColor        || '#3584e440';
        this.maxValue       = options.maxValue         || 100;
        this.minValue       = options.minValue         || 0;
        this.showGrid       = options.showGrid         !== false;
        this.gridColor      = options.gridColor        || '#33333340';
        this.textColor      = options.textColor        || '#aaaaaa';
        this.valueFormatter = options.valueFormatter   || null;

        // St.DrawingArea — the GNOME 48+ Wayland-safe Cairo drawing surface.
        // 'repaint' is emitted by the compositor repaint cycle; queue_repaint()
        // schedules it safely from any GLib context.
        this._drawingArea = new St.DrawingArea({
            x_expand: true,
            y_expand: true,
        });
        this._drawingArea.connect('repaint', this._onRepaint.bind(this));
        this.add_child(this._drawingArea);

        // Set initial size
        this.set_size(300, 100);

        // Resize drawing area when actor size changes
        this.connect('notify::size', this._onSizeChanged.bind(this));
    }

    _onSizeChanged() {
        const w = Math.max(1, Math.round(this.width));
        const h = Math.max(1, Math.round(this.height));
        this._drawingArea.set_size(w, h);
        this._drawingArea.queue_repaint();
    }

    set_size(w, h) {
        super.set_size(w, h);
        if (this._drawingArea) {
            this._drawingArea.set_size(Math.max(1, w), Math.max(1, h));
        }
    }

    /**
     * St.DrawingArea 'repaint' signal — cr is always valid here.
     */
    _onRepaint(area) {
        const cr = area.get_context();
        const [width, height] = area.get_surface_size();
        this._doDraw(cr, width, height);
        // Explicit dispose required — GJS does not GC Cairo contexts promptly
        cr.$dispose();
    }

    setData(data) {
        this.data = data;
        this._drawingArea.queue_repaint();
    }

    setMaxValue(max) {
        this.maxValue = max;
        this._drawingArea.queue_repaint();
    }

    invalidate() {
        this._drawingArea.queue_repaint();
    }

    _doDraw(cr, width, height) {
        // Clear
        cr.setSourceRGBA(0, 0, 0, 0);
        cr.paint();

        if (this.data.length === 0)
            return;

        const paddingLeft   = 30;
        const paddingRight  = 10;
        const paddingTop    = 10;
        const paddingBottom = 20;

        const graphWidth  = width  - paddingLeft - paddingRight;
        const graphHeight = height - paddingTop  - paddingBottom;

        if (this.showGrid)
            this._drawGrid(cr, paddingLeft, paddingTop, graphWidth, graphHeight);

        if (this.graphType === 'bar')
            this._drawBarGraph(cr, paddingLeft, paddingTop, graphWidth, graphHeight);
        else
            this._drawLineGraph(cr, paddingLeft, paddingTop, graphWidth, graphHeight);

        this._drawLabels(cr, width, height, paddingLeft, paddingTop, graphWidth, graphHeight);
    }

    _drawGrid(cr, x, y, width, height) {
        cr.setSourceRGBA(...hexToRGBA(this.gridColor));
        cr.setLineWidth(1);
        for (let i = 0; i <= 3; i++) {
            const gy = y + (height / 3) * i;
            cr.moveTo(x, gy);
            cr.lineTo(x + width, gy);
        }
        cr.stroke();
    }

    _drawBarGraph(cr, x, y, width, height) {
        const barCount = this.data.length;
        const barWidth = Math.max(1, (width / barCount) - 1);
        for (let i = 0; i < barCount; i++) {
            const value = this.data[i];
            const norm  = (value - this.minValue) / (this.maxValue - this.minValue);
            const bh    = norm * height;
            const bx    = x + (i * (barWidth + 1));
            const by    = y + height - bh;

            if (value >= 0.9)       cr.setSourceRGBA(...hexToRGBA('#2ecc71'));
            else if (value >= 0.5)  cr.setSourceRGBA(...hexToRGBA('#f1c40f'));
            else                    cr.setSourceRGBA(...hexToRGBA('#e74c3c'));

            cr.rectangle(bx, by, barWidth, bh);
            cr.fill();
        }
    }

    _drawLineGraph(cr, x, y, width, height) {
        const n = this.data.length;
        if (n < 2) return;

        const stepX = width / (n - 1);

        cr.setSourceRGBA(...hexToRGBA(this.color));
        cr.setLineWidth(2);
        cr.setLineJoin(Cairo.LineJoin.ROUND);
        cr.setLineCap(Cairo.LineCap.ROUND);

        for (let i = 0; i < n; i++) {
            const norm = (this.data[i] - this.minValue) / (this.maxValue - this.minValue);
            const px = x + i * stepX;
            const py = y + height - norm * height;
            i === 0 ? cr.moveTo(px, py) : cr.lineTo(px, py);
        }
        cr.stroke();

        cr.setSourceRGBA(...hexToRGBA(this.fillColor));
        for (let i = 0; i < n; i++) {
            const norm = (this.data[i] - this.minValue) / (this.maxValue - this.minValue);
            const px = x + i * stepX;
            const py = y + height - norm * height;
            i === 0 ? cr.moveTo(px, py) : cr.lineTo(px, py);
        }
        cr.lineTo(x + width, y + height);
        cr.lineTo(x, y + height);
        cr.closePath();
        cr.fill();
    }

    _drawLabels(cr, width, height, paddingLeft, paddingTop, graphWidth, graphHeight) {
        cr.setSourceRGBA(...hexToRGBA(this.textColor));
        cr.selectFontFace('Sans', Cairo.FontSlant.NORMAL, Cairo.FontWeight.NORMAL);
        cr.setFontSize(10);

        const topVal = this.valueFormatter
            ? this.valueFormatter(this.maxValue)
            : `${Math.round(this.maxValue)}`;
        cr.moveTo(2, paddingTop + 10);
        cr.showText(topVal);

        const botVal = this.valueFormatter
            ? this.valueFormatter(this.minValue)
            : `${Math.round(this.minValue)}`;
        cr.moveTo(2, paddingTop + graphHeight);
        cr.showText(botVal);

        cr.moveTo(width - 25, paddingTop + graphHeight + 15);
        cr.showText('Now');
    }
});

export const AckGraph = GObject.registerClass({
    GTypeName: 'ConnMonAckGraph'
}, class AckGraph extends PingGraph {
    _init() {
        super._init({
            type:      'bar',
            color:     '#2ecc71',
            fillColor: '#2ecc7140',
            maxValue:  1,
            minValue:  0,
            showGrid:  true,
        });
    }

    setFromPingResults(pingResults) {
        this.setData(pingResults.map(r => r.success ? 1 : 0));
    }
});

export const LatencyGraph = GObject.registerClass({
    GTypeName: 'ConnMonLatencyGraph'
}, class LatencyGraph extends PingGraph {
    _init() {
        super._init({
            type:           'line',
            color:          '#3584e4',
            fillColor:      '#3584e440',
            maxValue:       100,
            minValue:       0,
            showGrid:       true,
            valueFormatter: v => `${Math.round(v)}ms`,
        });
    }

    setFromPingResults(pingResults) {
        const data = pingResults.map(r => r.rtt !== null ? r.rtt : 0);
        const maxLatency = Math.max(...data.filter(v => v > 0), 100);
        this.maxValue = Math.ceil(maxLatency / 10) * 10;
        this.setData(data);
    }
});
