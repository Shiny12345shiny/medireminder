/**
 * ================================================================
 * medbot/core/chatEngine.js
 * Groq API integration — sends messages, manages sessions
 * Uses OpenAI-compatible SDK pointed at Groq's baseURL
 * ================================================================
 */

"use strict";
const path = require("path");
const { OpenAI } = require("openai");
//const config = require("../config");
const config = require(path.join(__dirname, "../config"));
console.log("CONFIG IN CHATENGINE:", JSON.stringify(config, null, 2)); // temporary debug
const { buildSystemPrompt, buildDrugContext } = require("./promptBuilder");
const { buildUserContext } = require("../userContext/contextBuilder");
const drugService = require("../drugDatabase/drugService");
const ChatSession = require("../models/ChatSession");

// ─────────────────────────────────────────────
// Groq Client (OpenAI-compatible)
// ─────────────────────────────────────────────

const groq = new OpenAI({
  apiKey: config.groq.apiKey,
  baseURL: config.groq.baseURL,
});

// ─────────────────────────────────────────────
// Core: Process a user message
// ─────────────────────────────────────────────

/**
 * Process a user message and return the bot's response
 * @param {string} userId  - MongoDB user ID
 * @param {string} message - User's message text
 * @param {string|null} sessionId - Existing session ID or null for new
 * @returns {Object} { reply, sessionId, messageId }
 */
async function processMessage(userId, message, sessionId = null) {
  if (!message?.trim()) {
    throw new Error("Message cannot be empty.");
  }

  if (message.length > config.chat.maxMessageLength) {
    throw new Error(
      `Message too long. Maximum ${config.chat.maxMessageLength} characters allowed.`
    );
  }

  // 1. Load or create session
  const session = await getOrCreateSession(userId, sessionId);

  // 2. Build user context (live DB data)
  const userContext = await buildUserContext(userId);

  // 3. Analyze message for drug references and build drug context
  const drugCtx = await analyzeDrugContext(message, userContext);

  // 4. Build system prompt
  const systemPrompt = buildSystemPrompt(userContext, drugCtx);

  // 5. Prepare conversation history for Groq
  const history = prepareHistory(session.messages);

  // 6. Add current user message
  history.push({ role: "user", content: message.trim() });

  // 7. Call Groq API
  let reply = "";
  try {
    const response = await groq.chat.completions.create({
      model: config.groq.model,
      max_tokens: config.groq.maxTokens,
      temperature: config.groq.temperature,
      messages: [
        { role: "system", content: systemPrompt },
        ...history,
      ],
    });

    reply =
      response.choices?.[0]?.message?.content ||
      "I'm sorry, I couldn't generate a response. Please try again.";

    // 8. Save messages to session
    await saveMessages(session, message, reply);

    return {
      reply,
      sessionId: session._id.toString(),
      messageId: response.id || `groq-${Date.now()}`,
      model: response.model,
      usage: response.usage,
    };
  } catch (error) {
    // Handle Groq-specific errors gracefully
    if (error?.status === 401) {
      throw new Error("Invalid Groq API key. Please check your configuration.");
    }
    if (error?.status === 429) {
      throw new Error("Rate limit reached. Please wait a moment and try again.");
    }
    if (error?.status === 503 || error?.code === "ECONNREFUSED") {
      throw new Error("Groq service is temporarily unavailable. Please try again.");
    }
    throw error;
  }
}

// ─────────────────────────────────────────────
// Drug Context Analyzer
// ─────────────────────────────────────────────

/**
 * Analyze the user message for drug references and fetch relevant data
 * from the FastAPI drug database
 */
async function analyzeDrugContext(message, userContext) {
  const drugContextData = {};

  try {
    // Extract medicine names mentioned in the message
    const mentionedMedicines = await drugService.extractMedicinesFromText(message);
    if (mentionedMedicines.length > 0) {
      drugContextData.mentionedMedicines = mentionedMedicines;
    }

    // Get user's active medicine names from their schedules
    const userMedicineNames =
      userContext.medicines?.active?.map((m) => m.name) || [];

    // Check interactions between mentioned medicine + user's current medicines
    if (mentionedMedicines.length > 0 && userMedicineNames.length > 0) {
      const newMedNames = mentionedMedicines.map((m) => m.medicineName);
      const allMeds = [...new Set([...userMedicineNames, ...newMedNames])];

      if (allMeds.length >= 2) {
        const interactionResult = await drugService.checkInteractions(allMeds);
        if (interactionResult.success) {
          drugContextData.interactions = interactionResult;
        }
      }
    }

    // Always check interactions among the user's existing medicines
    if (userMedicineNames.length >= 2 && !drugContextData.interactions) {
      const existingInteractions = await drugService.checkInteractions(
        userMedicineNames
      );
      if (
        existingInteractions.success &&
        existingInteractions.interactions?.length
      ) {
        drugContextData.interactions = existingInteractions;
      }
    }

    // Check contraindications if user mentioned a medicine
    // and has medical history on file
    if (
      mentionedMedicines.length > 0 &&
      userContext.user?.medicalHistory?.length > 0
    ) {
      const firstMed = mentionedMedicines[0].medicineName;
      const contraResult = await drugService.checkContraindications(
        firstMed,
        userContext.user.medicalHistory
      );
      if (contraResult.success) {
        drugContextData.contraindications = contraResult;
      }
    }

    // Fetch dosage info if message contains dosage-related keywords
    const dosageKeywords = [
      "dosage", "dose", "how much", "how many",
      "when to take", "timing", "how often",
    ];
    const askingAboutDosage = dosageKeywords.some((kw) =>
      message.toLowerCase().includes(kw)
    );

    if (askingAboutDosage && mentionedMedicines.length > 0) {
      const dosageResult = await drugService.getMedicineDosage(
        mentionedMedicines[0].medicineName
      );
      if (dosageResult.success) {
        drugContextData.dosageInfo = dosageResult;
      }
    }

    return buildDrugContext(drugContextData);
  } catch (error) {
    console.error("[ChatEngine] Drug context analysis error:", error.message);
    // Don't fail the whole message if drug context fails
    return {};
  }
}

// ─────────────────────────────────────────────
// Session Management
// ─────────────────────────────────────────────

/**
 * Get existing session or create a new one
 */
async function getOrCreateSession(userId, sessionId) {
  if (sessionId) {
    const existing = await ChatSession.findOne({
      _id: sessionId,
      user: userId,
    });
    if (existing) return existing;
  }

  const session = await ChatSession.create({
    user: userId,
    messages: [],
    createdAt: new Date(),
    lastMessageAt: new Date(),
  });

  return session;
}

/**
 * Prepare message history for Groq API
 * Limits to maxHistoryMessages to manage context window
 */
function prepareHistory(messages) {
  const limit = config.chat.maxHistoryMessages;
  const recent = messages.slice(-limit);

  return recent.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Save user message and bot reply to the session document
 */
async function saveMessages(session, userMessage, botReply) {
  session.messages.push(
    { role: "user", content: userMessage, timestamp: new Date() },
    { role: "assistant", content: botReply, timestamp: new Date() }
  );
  session.lastMessageAt = new Date();

  // Keep only the last N*2 messages to avoid unbounded growth
  const maxStored = config.chat.maxHistoryMessages * 2;
  if (session.messages.length > maxStored) {
    session.messages = session.messages.slice(-maxStored);
  }

  await session.save();
}

// ─────────────────────────────────────────────
// History & Session Utilities
// ─────────────────────────────────────────────

/**
 * Get full chat history for a session
 */
async function getSessionHistory(userId, sessionId) {
  const session = await ChatSession.findOne({
    _id: sessionId,
    user: userId,
  }).lean();

  if (!session) return null;

  return {
    sessionId: session._id,
    messages: session.messages,
    createdAt: session.createdAt,
    lastMessageAt: session.lastMessageAt,
  };
}

/**
 * Get all sessions for a user (summary list)
 */
async function getUserSessions(userId) {
  return ChatSession.find({ user: userId })
    .sort({ lastMessageAt: -1 })
    .select("_id createdAt lastMessageAt")
    .lean();
}

/**
 * Delete a specific session
 */
async function deleteSession(userId, sessionId) {
  const result = await ChatSession.deleteOne({
    _id: sessionId,
    user: userId,
  });
  return result.deletedCount > 0;
}

/**
 * Clear all sessions for a user
 */
async function clearAllSessions(userId) {
  const result = await ChatSession.deleteMany({ user: userId });
  return result.deletedCount;
}

module.exports = {
  processMessage,
  getSessionHistory,
  getUserSessions,
  deleteSession,
  clearAllSessions,
};