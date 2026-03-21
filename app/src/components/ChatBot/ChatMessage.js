/**
 * Individual chat message bubble
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";
  const isError = message.isError;

  const formatTime = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <View style={[styles.row, isUser ? styles.rowUser : styles.rowBot]}>
      {!isUser && (
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>💊</Text>
        </View>
      )}
      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleBot,
            isError && styles.bubbleError,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.messageTextUser : styles.messageTextBot,
            ]}
          >
            {message.content}
          </Text>
        </View>
        <Text style={[styles.time, isUser ? styles.timeUser : styles.timeBot]}>
          {formatTime(message.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginVertical: 4,
    paddingHorizontal: 12,
    alignItems: "flex-end",
  },
  rowUser: {
    justifyContent: "flex-end",
  },
  rowBot: {
    justifyContent: "flex-start",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 16,
  },
  bubbleWrapper: {
    maxWidth: "75%",
  },
  bubble: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  bubbleUser: {
    backgroundColor: "#6C63FF",
    borderBottomRightRadius: 4,
  },
  bubbleBot: {
    backgroundColor: "#F0F0F0",
    borderBottomLeftRadius: 4,
  },
  bubbleError: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FFCCCC",
    borderWidth: 1,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 21,
  },
  messageTextUser: {
    color: "#FFFFFF",
  },
  messageTextBot: {
    color: "#1A1A1A",
  },
  time: {
    fontSize: 11,
    marginTop: 3,
    color: "#999",
  },
  timeUser: {
    textAlign: "right",
  },
  timeBot: {
    textAlign: "left",
    marginLeft: 4,
  },
});