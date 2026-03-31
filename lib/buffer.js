/**
 * Circular Buffer - Fixed-size buffer that overwrites oldest entries
 */
export class CircularBuffer {
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
        this.buffer = [];
        this.index = 0;
    }

    /**
     * Add item to buffer, removing oldest if full
     * @param {Object} item - Item to add
     */
    push(item) {
        if (this.buffer.length < this.maxSize) {
            this.buffer.push(item);
        } else {
            this.buffer[this.index] = item;
            this.index = (this.index + 1) % this.maxSize;
        }
    }

    /**
     * Get all items in chronological order
     * @returns {Array} All items in buffer
     */
    getHistory() {
        if (this.buffer.length < this.maxSize) {
            return [...this.buffer];
        }

        // Return items in chronological order
        const result = [];
        for (let i = 0; i < this.maxSize; i++) {
            const idx = (this.index + i) % this.maxSize;
            result.push(this.buffer[idx]);
        }
        return result;
    }

    /**
     * Get last N items
     * @param {number} count - Number of recent items to return
     * @returns {Array} Recent items
     */
    getRecent(count = 5) {
        const history = this.getHistory();
        return history.slice(-count);
    }

    /**
     * Clear the buffer
     */
    clear() {
        this.buffer = [];
        this.index = 0;
    }

    /**
     * Get current size
     * @returns {number} Number of items in buffer
     */
    size() {
        return this.buffer.length;
    }

    /**
     * Check if buffer is full
     * @returns {boolean} True if buffer is at max capacity
     */
    isFull() {
        return this.buffer.length >= this.maxSize;
    }
}
