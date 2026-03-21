import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const EmptyState = ({
  icon = 'folder-open-outline',
  title = 'No Data',
  message = 'There is nothing to display here',
  actionText,
  onActionPress,
  iconSize = 80,
  iconColor = '#ccc',
  style
}) => {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
      
      <Text style={styles.title}>{title}</Text>
      
      <Text style={styles.message}>{message}</Text>

      {actionText && onActionPress && (
        <TouchableOpacity style={styles.actionButton} onPress={onActionPress}>
          <Text style={styles.actionText}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center'
  },
  message: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 25
  },
  actionButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  actionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  }
});

export default EmptyState;