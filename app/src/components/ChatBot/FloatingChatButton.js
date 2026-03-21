/**
 * ================================================================
 * app/src/components/ChatBot/FloatingChatButton.js
 * Draggable floating action button that opens the chat modal
 * ================================================================
 */

import React, { useState, useRef } from "react";
import {
  StyleSheet,
  Animated,
  Modal,
  PanResponder,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import ChatWindow from "./ChatWindow";

const BUTTON_SIZE = 56;
const MARGIN = 16;

export default function FloatingChatButton() {
  const [chatVisible, setChatVisible] = useState(false);

  const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

  const position = useRef(
    new Animated.ValueXY({
      x: screenWidth - BUTTON_SIZE - MARGIN,
      y: screenHeight - BUTTON_SIZE - 90,
    })
  ).current;

  const currentPos = useRef({
    x: screenWidth - BUTTON_SIZE - MARGIN,
    y: screenHeight - BUTTON_SIZE - 90,
  });

  const isDragging = useRef(false);
  const dragDistance = useRef(0);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const panResponder = useRef(
    PanResponder.create({
      // Don't claim the responder on start — let taps through
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,

      // Only claim responder once movement is detected
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const dist = Math.sqrt(gestureState.dx ** 2 + gestureState.dy ** 2);
        return dist > 6;
      },
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: () => {
        isDragging.current = false;
        dragDistance.current = 0;
        dragStartPos.current = {
          x: currentPos.current.x,
          y: currentPos.current.y,
        };
        position.setOffset({
          x: currentPos.current.x,
          y: currentPos.current.y,
        });
        position.setValue({ x: 0, y: 0 });
      },

      onPanResponderMove: (_, gestureState) => {
        dragDistance.current = Math.sqrt(
          gestureState.dx ** 2 + gestureState.dy ** 2
        );
        isDragging.current = dragDistance.current > 6;

        const { width, height } = Dimensions.get("window");
        const newX = Math.max(
          0,
          Math.min(
            width - BUTTON_SIZE,
            dragStartPos.current.x + gestureState.dx
          )
        );
        const newY = Math.max(
          0,
          Math.min(
            height - BUTTON_SIZE - 40,
            dragStartPos.current.y + gestureState.dy
          )
        );

        position.setValue({
          x: newX - dragStartPos.current.x,
          y: newY - dragStartPos.current.y,
        });

        currentPos.current = { x: newX, y: newY };
      },

      onPanResponderRelease: () => {
        position.flattenOffset();

        const { width } = Dimensions.get("window");
        const snapX =
          currentPos.current.x < width / 2
            ? MARGIN
            : width - BUTTON_SIZE - MARGIN;

        Animated.spring(position, {
          toValue: { x: snapX, y: currentPos.current.y },
          useNativeDriver: false,
          friction: 6,
        }).start();

        currentPos.current.x = snapX;
        isDragging.current = false;
      },
    })
  ).current;

  const handlePress = () => {
    if (!isDragging.current && dragDistance.current < 8) {
      setChatVisible(true);
    }
    dragDistance.current = 0;
  };

  return (
    <>
      <Animated.View
        style={[
          styles.fab,
          { transform: position.getTranslateTransform() },
        ]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.fabInner}
          onPress={handlePress}
          activeOpacity={0.85}
        >
          <MaterialCommunityIcons name="robot-excited" size={28} color="#fff" />
        </TouchableOpacity>
      </Animated.View>

      <Modal
        visible={chatVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setChatVisible(false)}
      >
        <ChatWindow onClose={() => setChatVisible(false)} />
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    backgroundColor: "#6C63FF",
    elevation: 8,
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    zIndex: 9999,
  },
  fabInner: {
    width: "100%",
    height: "100%",
    borderRadius: BUTTON_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
  },
});