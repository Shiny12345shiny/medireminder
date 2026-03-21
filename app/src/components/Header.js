import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Header = ({
  title,
  subtitle,
  leftIcon = 'arrow-left',
  onLeftPress,
  rightIcon,
  onRightPress,
  rightText,
  variant = 'default',
  style
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'transparent':
        return styles.transparent;
      case 'primary':
        return styles.primary;
      default:
        return styles.default;
    }
  };

  return (
    <View style={[styles.container, getVariantStyles(), style]}>
      {(leftIcon || onLeftPress) && (
        <TouchableOpacity
          style={styles.leftButton}
          onPress={onLeftPress}
          activeOpacity={0.7}
        >
          <MaterialCommunityIcons
            name={leftIcon}
            size={24}
            color={variant === 'primary' ? '#fff' : '#333'}
          />
        </TouchableOpacity>
      )}

      <View style={styles.titleContainer}>
        <Text
          style={[
            styles.title,
            variant === 'primary' && styles.titlePrimary
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              styles.subtitle,
              variant === 'primary' && styles.subtitlePrimary
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      {(rightIcon || rightText || onRightPress) && (
        <TouchableOpacity
          style={styles.rightButton}
          onPress={onRightPress}
          activeOpacity={0.7}
        >
          {rightText ? (
            <Text
              style={[
                styles.rightText,
                variant === 'primary' && styles.rightTextPrimary
              ]}
            >
              {rightText}
            </Text>
          ) : (
            <MaterialCommunityIcons
              name={rightIcon}
              size={24}
              color={variant === 'primary' ? '#fff' : '#333'}
            />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 12,
    minHeight: 56
  },
  default: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  transparent: {
    backgroundColor: 'transparent'
  },
  primary: {
    backgroundColor: '#667eea'
  },
  leftButton: {
    padding: 8,
    marginRight: 8
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  titlePrimary: {
    color: '#fff'
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2
  },
  subtitlePrimary: {
    color: '#fff',
    opacity: 0.9
  },
  rightButton: {
    padding: 8,
    marginLeft: 8
  },
  rightText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea'
  },
  rightTextPrimary: {
    color: '#fff'
  }
});

export default Header;