import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet, Modal } from 'react-native';

const Loading = ({
  visible = true,
  text = 'Loading...',
  size = 'large',
  color = '#667eea',
  overlay = false,
  style
}) => {
  if (overlay) {
    return (
      <Modal
        transparent
        visible={visible}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlayContainer}>
          <View style={styles.overlayContent}>
            <ActivityIndicator size={size} color={color} />
            {text && <Text style={styles.overlayText}>{text}</Text>}
          </View>
        </View>
      </Modal>
    );
  }

  if (!visible) return null;

  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size={size} color={color} />
      {text && <Text style={styles.text}>{text}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  text: {
    marginTop: 12,
    fontSize: 16,
    color: '#666'
  },
  overlayContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  overlayContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 30,
    alignItems: 'center',
    minWidth: 150
  },
  overlayText: {
    marginTop: 15,
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  }
});

export default Loading;