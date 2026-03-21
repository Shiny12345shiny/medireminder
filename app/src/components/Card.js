import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

const Card = ({
  children,
  style,
  onPress,
  variant = 'default',
  noPadding = false,
  noShadow = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'elevated':
        return styles.elevated;
      case 'outlined':
        return styles.outlined;
      case 'filled':
        return styles.filled;
      default:
        return styles.default;
    }
  };

  const cardStyles = [
    styles.card,
    getVariantStyles(),
    noPadding && styles.noPadding,
    noShadow && styles.noShadow,
    style
  ];

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyles}
        onPress={onPress}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    padding: 15,
    backgroundColor: '#fff'
  },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  elevated: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#ddd',
    shadowOpacity: 0,
    elevation: 0
  },
  filled: {
    backgroundColor: '#f5f5f5',
    shadowOpacity: 0,
    elevation: 0
  },
  noPadding: {
    padding: 0
  },
  noShadow: {
    shadowOpacity: 0,
    elevation: 0
  }
});

export default Card;