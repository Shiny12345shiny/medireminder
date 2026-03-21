/**
 * ================================================================
 * medbot/drugDatabase/drugService.js
 * Node.js service layer — all calls to the FastAPI drug database
 * ================================================================
 */

"use strict";

const axios = require("axios");
const config = require("../config");
const cache = require("./drugCache");

// ─────────────────────────────────────────────
// Axios Instance
// ─────────────────────────────────────────────

const apiClient = axios.create({
  baseURL: config.drugApi.baseUrl,
  timeout: config.drugApi.timeoutMs,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.code === "ECONNREFUSED") {
      console.error(
        "[DrugService] FastAPI server is not running at",
        config.drugApi.baseUrl
      );
    }
    return Promise.reject(error);
  }
);

// ─────────────────────────────────────────────
// Error Normalizer
// ─────────────────────────────────────────────

function handleError(error, context) {
  if (error.response) {
    return {
      success: false,
      error: error.response.data?.detail || error.response.data?.error || "API error",
      statusCode: error.response.status,
    };
  }
  if (error.code === "ECONNREFUSED") {
    return {
      success: false,
      error: "Medicine database is currently unavailable.",
      statusCode: 503,
    };
  }
  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return {
      success: false,
      error: "Medicine database request timed out.",
      statusCode: 504,
    };
  }
  return {
    success: false,
    error: error.message || "Unknown error",
    statusCode: 500,
  };
}

// ─────────────────────────────────────────────
// Retry Helper
// ─────────────────────────────────────────────

async function withRetry(fn, attempts = config.drugApi.retryAttempts) {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1) throw err;
      await new Promise((r) => setTimeout(r, config.drugApi.retryDelayMs));
    }
  }
}

// ─────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────

/**
 * Get full medicine information by name
 * Supports generic name, brand name, common name (case-insensitive)
 */
async function getMedicineInfo(medicineName) {
  if (!medicineName?.trim()) {
    return { success: false, error: "Medicine name is required.", statusCode: 400 };
  }

  const cacheKey = cache.constructor.buildKey("medicine", medicineName);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.get(`/api/medicine/${encodeURIComponent(medicineName.trim())}`)
    );
    const result = { success: true, data: response.data.data, statusCode: 200 };
    cache.set(cacheKey, result, config.cache.medicineTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `getMedicineInfo(${medicineName})`);
  }
}

/**
 * Search medicines by partial name, category, brand, or condition
 */
async function searchMedicines(query, limit = 10) {
  if (!query?.trim()) {
    return { success: false, error: "Search query is required.", statusCode: 400 };
  }

  const cacheKey = cache.constructor.buildKey("search", query, limit);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.get("/api/search", { params: { query: query.trim(), limit } })
    );
    const result = {
      success: true,
      data: response.data,
      results: response.data.results,
      totalFound: response.data.totalFound,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.searchTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `searchMedicines(${query})`);
  }
}

/**
 * Check drug-drug interactions between 2 or more medicines
 */
async function checkInteractions(medicineNames) {
  if (!Array.isArray(medicineNames) || medicineNames.length < 2) {
    return {
      success: false,
      error: "At least 2 medicine names are required.",
      statusCode: 400,
    };
  }

  const sortedNames = [...medicineNames].sort();
  const cacheKey = cache.constructor.buildKey("interactions", sortedNames.join(","));
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.post("/api/check-interaction", { medicines: medicineNames })
    );
    const result = {
      success: true,
      data: response.data,
      interactions: response.data.interactions,
      hasMajorInteractions: response.data.hasMajorInteractions,
      interactionsFound: response.data.totalInteractionsFound,
      warnings: response.data.warnings,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.interactionTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `checkInteractions(${medicineNames.join(", ")})`);
  }
}

/**
 * Check contraindications for a patient's medical conditions
 */
async function checkContraindications(medicineName, conditions) {
  if (!medicineName?.trim()) {
    return { success: false, error: "Medicine name is required.", statusCode: 400 };
  }
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return { success: false, error: "At least one condition is required.", statusCode: 400 };
  }

  const sortedConditions = [...conditions].sort();
  const cacheKey = cache.constructor.buildKey(
    "contraindications",
    medicineName,
    sortedConditions.join(",")
  );
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.post("/api/check-contraindications", {
        medicine: medicineName.trim(),
        conditions,
      })
    );
    const result = {
      success: true,
      data: response.data,
      safeToUse: response.data.safeToUse,
      contraindicationsFound: response.data.contraindicationsFound,
      recommendation: response.data.recommendation,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.interactionTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `checkContraindications(${medicineName})`);
  }
}

/**
 * Get dosage and timing information for a medicine
 */
async function getMedicineDosage(medicineName) {
  if (!medicineName?.trim()) {
    return { success: false, error: "Medicine name is required.", statusCode: 400 };
  }

  const cacheKey = cache.constructor.buildKey("dosage", medicineName);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.get(`/api/medicine/${encodeURIComponent(medicineName.trim())}/dosage`)
    );
    const result = {
      success: true,
      data: response.data,
      dosage: response.data.dosage,
      timing: response.data.timing,
      storage: response.data.storage,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.medicineTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `getMedicineDosage(${medicineName})`);
  }
}

/**
 * Get all medicines in a category
 */
async function getMedicinesByCategory(category) {
  if (!category?.trim()) {
    return { success: false, error: "Category is required.", statusCode: 400 };
  }

  const cacheKey = cache.constructor.buildKey("category", category);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.get(`/api/category/${encodeURIComponent(category.trim())}`)
    );
    const result = {
      success: true,
      medicines: response.data.medicines,
      totalFound: response.data.totalFound,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.medicineTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `getMedicinesByCategory(${category})`);
  }
}

/**
 * Get all medicine interactions for a specific medicine
 */
async function getMedicineInteractions(medicineName) {
  if (!medicineName?.trim()) {
    return { success: false, error: "Medicine name is required.", statusCode: 400 };
  }

  const cacheKey = cache.constructor.buildKey("med-interactions", medicineName);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() =>
      apiClient.get(
        `/api/medicine/${encodeURIComponent(medicineName.trim())}/interactions`
      )
    );
    const result = {
      success: true,
      data: response.data,
      drugInteractions: response.data.drugInteractions,
      foodInteractions: response.data.foodInteractions,
      summary: response.data.summary,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.medicineTTLMs);
    return result;
  } catch (error) {
    return handleError(error, `getMedicineInteractions(${medicineName})`);
  }
}

/**
 * Get all available categories
 */
async function getAllCategories() {
  const cacheKey = "categories:all";
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  try {
    const response = await withRetry(() => apiClient.get("/api/categories"));
    const result = {
      success: true,
      categories: response.data.categories,
      total: response.data.totalCategories,
      statusCode: 200,
    };
    cache.set(cacheKey, result, config.cache.medicineTTLMs);
    return result;
  } catch (error) {
    return handleError(error, "getAllCategories()");
  }
}

/**
 * Health check — verify FastAPI is reachable
 */
async function checkApiHealth() {
  try {
    const response = await apiClient.get("/health", { timeout: 3000 });
    return {
      healthy: true,
      medicinesLoaded: response.data.medicinesLoaded,
      version: response.data.version,
    };
  } catch {
    return { healthy: false, medicinesLoaded: 0, version: null };
  }
}

/**
 * Extract medicine names mentioned in a text string
 * Uses the search API to detect medicine references in user messages
 */
async function extractMedicinesFromText(text) {
  if (!text?.trim()) return [];

  // Common words to skip
  const stopWords = new Set([
    "can", "take", "i", "my", "the", "a", "is", "are", "was",
    "have", "had", "feel", "feeling", "pain", "help", "what",
    "when", "why", "how", "medicine", "drug", "tablet", "pill",
    "dose", "dosage", "side", "effect", "effects",
  ]);

  // Extract potential medicine-like words (capitalized or 4+ chars)
  const words = text
    .split(/\s+/)
    .map((w) => w.replace(/[^a-zA-Z]/g, "").trim())
    .filter((w) => w.length >= 4 && !stopWords.has(w.toLowerCase()));

  const foundMedicines = [];

  for (const word of words) {
    const result = await searchMedicines(word, 1);
    if (result.success && result.results?.length > 0) {
      const topResult = result.results[0];
      // Only include if it's a strong match
      if (
        topResult.medicineName.toLowerCase().includes(word.toLowerCase()) ||
        word.toLowerCase().includes(topResult.medicineName.toLowerCase().slice(0, 4))
      ) {
        if (!foundMedicines.find((m) => m.medicineName === topResult.medicineName)) {
          foundMedicines.push(topResult);
        }
      }
    }
  }

  return foundMedicines;
}

module.exports = {
  getMedicineInfo,
  searchMedicines,
  checkInteractions,
  checkContraindications,
  getMedicineDosage,
  getMedicinesByCategory,
  getMedicineInteractions,
  getAllCategories,
  checkApiHealth,
  extractMedicinesFromText,
};