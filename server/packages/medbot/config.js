/**
 * ================================================================
 * medbot/config.js
 * Centralized configuration for the Medbot package
 * env vars are loaded by the caller (test-chatbot.js or server.js)
 * before this module is required
 * ================================================================
 */

"use strict";

const config = {
  // ─────────────────────────────────────────────
  // Groq AI Settings
  // ─────────────────────────────────────────────
  groq: {
    apiKey: process.env.GROQ_API_KEY || "",
    baseURL: "https://api.groq.com/openai/v1",
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    maxTokens: 1024,
    temperature: 0.7,
    systemPromptMaxLength: 8000,
  },

  // ─────────────────────────────────────────────
  // Drug Database API (FastAPI sidecar)
  // ─────────────────────────────────────────────
  drugApi: {
    baseUrl: process.env.MEDICINE_API_URL || "http://localhost:8000",
    timeoutMs: parseInt(process.env.MEDICINE_API_TIMEOUT || "10000", 10),
    retryAttempts: 2,
    retryDelayMs: 500,
  },

  // ─────────────────────────────────────────────
  // Cache Settings
  // ─────────────────────────────────────────────
  cache: {
    medicineTTLMs: 1000 * 60 * 60,
    searchTTLMs: 1000 * 60 * 15,
    interactionTTLMs: 1000 * 60 * 60 * 6,
    maxCacheSize: 500,
  },

  // ─────────────────────────────────────────────
  // Chat Session Settings
  // ─────────────────────────────────────────────
  chat: {
    maxHistoryMessages: 20,
    sessionTTLDays: 30,
    maxMessageLength: 2000,
    streamingEnabled: false,
  },

  // ─────────────────────────────────────────────
  // User Context Settings
  // ─────────────────────────────────────────────
  context: {
    recentRemindersLimit: 10,
    upcomingRemindersLimit: 5,
    recentAppointmentsLimit: 3,
    recentHealthRecordsLimit: 5,
    adherenceWindowDays: 7,
  },
};

if (!config.groq.apiKey) {
  console.warn(
    "[Medbot] WARNING: GROQ_API_KEY is not set. Chat will not function."
  );
}

module.exports = config;