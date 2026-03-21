/**
 * ================================================================
 * app/src/hooks/useChat.js
 * Custom hook for all chat state and API interactions
 * ================================================================
 */

import { useState, useCallback, useRef } from "react";
import api from "../utils/api";
import { API_ENDPOINTS } from "../constants/config";

export default function useChat() {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  /**
   * Send a message to the bot
   */
  const sendMessage = useCallback(
    async (text) => {
      if (!text?.trim() || isLoading) return;

      const userMessage = {
        id: Date.now().toString(),
        role: "user",
        content: text.trim(),
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        const response = await api.post(API_ENDPOINTS.CHAT.SEND_MESSAGE, {
          message: text.trim(),
          sessionId: sessionId || undefined,
        });

        const data = response.data || response;

        if (data?.sessionId && !sessionId) {
          setSessionId(data.sessionId);
        }

        const botMessage = {
          id: data?.messageId || Date.now().toString() + "_bot",
          role: "assistant",
          content: data?.reply || "Sorry, I could not process your request.",
          timestamp: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (err) {
        setError(err.message || "Failed to send message. Please try again.");

        // Show error as a bot message too
        const errorMessage = {
          id: Date.now().toString() + "_err",
          role: "assistant",
          content: "Sorry, I'm having trouble responding right now. Please try again in a moment.",
          timestamp: new Date().toISOString(),
          isError: true,
        };
        setMessages((prev) => [...prev, errorMessage]);
      } finally {
        setIsLoading(false);
      }
    },
    [isLoading, sessionId]
  );

  /**
   * Load chat history for an existing session
   */
  const loadHistory = useCallback(async (sid) => {
    if (!sid) return;

    setIsLoadingHistory(true);
    try {
      const response = await api.get(
        `${API_ENDPOINTS.CHAT.GET_HISTORY}/${sid}`
      );
      const data = response.data || response;

      if (data?.messages) {
        const formatted = data.messages.map((msg, index) => ({
          id: index.toString(),
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp,
        }));
        setMessages(formatted);
        setSessionId(sid);
      }
    } catch {
      // Silently fail — fresh start
    } finally {
      setIsLoadingHistory(false);
    }
  }, []);

  /**
   * Clear current session and start fresh
   */
  const clearSession = useCallback(async () => {
    if (sessionId) {
      try {
        //await api.delete(`${API_ENDPOINTS.CHAT.CLEAR_SESSION}/${sessionId}`);
        await api.delete(`${API_ENDPOINTS.CHAT.DELETE_SESSION}/${sessionId}`);
      } catch {
        // Ignore deletion error
      }
    }
    setMessages([]);
    setSessionId(null);
    setError(null);
  }, [sessionId]);

  return {
    messages,
    sessionId,
    isLoading,
    isLoadingHistory,
    error,
    sendMessage,
    loadHistory,
    clearSession,
  };
}