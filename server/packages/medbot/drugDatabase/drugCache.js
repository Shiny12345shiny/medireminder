/**
 * ================================================================
 * medbot/drugDatabase/drugCache.js
 * TTL-based in-memory cache for drug API responses
 * ================================================================
 */

"use strict";

const config = require("../config");

class DrugCache {
  constructor() {
    this.store = new Map();
    this.maxSize = config.cache.maxCacheSize;

    // Cleanup expired entries every 10 minutes
    setInterval(() => this._cleanup(), 1000 * 60 * 10);
  }

  /**
   * Get a cached value by key
   * Returns null if not found or expired
   */
  get(key) {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value;
  }

  /**
   * Set a value in cache with a TTL in milliseconds
   */
  set(key, value, ttlMs) {
    // Evict oldest entry if at capacity
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now(),
    });
  }

  /**
   * Delete a specific key
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear() {
    this.store.clear();
  }

  /**
   * Remove all expired entries
   */
  _cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Build a normalized cache key
   */
  static buildKey(prefix, ...parts) {
    return `${prefix}:${parts.map((p) => String(p).toLowerCase().trim()).join(":")}`;
  }

  /**
   * Get cache stats for debugging
   */
  stats() {
    return {
      totalEntries: this.store.size,
      maxSize: this.maxSize,
    };
  }
}

// Singleton instance shared across the package
const drugCache = new DrugCache();

module.exports = drugCache;