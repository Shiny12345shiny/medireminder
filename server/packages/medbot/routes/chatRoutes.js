/**
 * ================================================================
 * medbot/routes/chatRoutes.js
 * Express router for all chat endpoints
 * ================================================================
 */

"use strict";

const express = require("express");
const router = express.Router();
const { protect } = require("../../../middlewares/auth");
const chatEngine = require("../core/chatEngine");
const config = require("../config");

// All chat routes require authentication
router.use(protect);

// ─────────────────────────────────────────────
// POST /api/chat/message
// Send a message and get a response
// ─────────────────────────────────────────────

router.post("/message", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    const userId = req.user._id;

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        error: "Message is required.",
      });
    }

    if (message.length > config.chat.maxMessageLength) {
      return res.status(400).json({
        success: false,
        error: `Message too long. Maximum ${config.chat.maxMessageLength} characters.`,
      });
    }

    const result = await chatEngine.processMessage(userId, message, sessionId || null);

    return res.status(200).json({
      success: true,
      data: {
        reply: result.reply,
        sessionId: result.sessionId,
        messageId: result.messageId,
      },
    });
  } catch (error) {
    console.error("[ChatRoutes] /message error:", error.message);

    if (error.message?.includes("API key")) {
      return res.status(503).json({
        success: false,
        error: "Chat service is not configured. Please contact support.",
      });
    }

    return res.status(500).json({
      success: false,
      error: "Failed to process your message. Please try again.",
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/chat/history/:sessionId
// Get full message history for a session
// ─────────────────────────────────────────────

router.get("/history/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user._id;

    const history = await chatEngine.getSessionHistory(userId, sessionId);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: "Session not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    console.error("[ChatRoutes] /history error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch chat history.",
    });
  }
});

// ─────────────────────────────────────────────
// GET /api/chat/sessions
// Get all sessions for the current user
// ─────────────────────────────────────────────

router.get("/sessions", async (req, res) => {
  try {
    const sessions = await chatEngine.getUserSessions(req.user._id);

    return res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("[ChatRoutes] /sessions error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch sessions.",
    });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/chat/session/:sessionId
// Delete a specific session
// ─────────────────────────────────────────────

router.delete("/session/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const deleted = await chatEngine.deleteSession(req.user._id, sessionId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "Session not found.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Session deleted successfully.",
    });
  } catch (error) {
    console.error("[ChatRoutes] /session DELETE error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to delete session.",
    });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/chat/sessions/all
// Clear all sessions for the current user
// ─────────────────────────────────────────────

router.delete("/sessions/all", async (req, res) => {
  try {
    const count = await chatEngine.clearAllSessions(req.user._id);

    return res.status(200).json({
      success: true,
      message: `${count} session(s) cleared.`,
    });
  } catch (error) {
    console.error("[ChatRoutes] /sessions/all DELETE error:", error.message);
    return res.status(500).json({
      success: false,
      error: "Failed to clear sessions.",
    });
  }
});

module.exports = router;