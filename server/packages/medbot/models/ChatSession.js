/**
 * ================================================================
 * medbot/models/ChatSession.js
 * Mongoose schema for storing chat session history
 * ================================================================
 */

"use strict";

const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    messages: {
      type: [MessageSchema],
      default: [],
    },
    title: {
      type: String,
      default: "New Chat",
      maxlength: 100,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    metadata: {
      messageCount: { type: Number, default: 0 },
      lastTopic: { type: String },
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire sessions after configured days
ChatSessionSchema.index(
  { lastMessageAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 } // 30 days
);

// Update message count before save
ChatSessionSchema.pre("save", function (next) {
  this.metadata.messageCount = this.messages.length;
  next();
});

module.exports = mongoose.model("ChatSession", ChatSessionSchema);