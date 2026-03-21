import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const Button = ({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  fullWidth = false
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          container: styles.primaryContainer,
          text: styles.primaryText
        };
      case 'secondary':
        return {
          container: styles.secondaryContainer,
          text: styles.secondaryText
        };
      case 'outline':
        return {
          container: styles.outlineContainer,
          text: styles.outlineText
        };
      case 'ghost':
        return {
          container: styles.ghostContainer,
          text: styles.ghostText
        };
      case 'danger':
        return {
          container: styles.dangerContainer,
          text: styles.dangerText
        };
      default:
        return {
          container: styles.primaryContainer,
          text: styles.primaryText
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          container: styles.smallContainer,
          text: styles.smallText,
          icon: 16
        };
      case 'medium':
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          icon: 20
        };
      case 'large':
        return {
          container: styles.largeContainer,
          text: styles.largeText,
          icon: 24
        };
      default:
        return {
          container: styles.mediumContainer,
          text: styles.mediumText,
          icon: 20
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        variantStyles.container,
        sizeStyles.container,
        fullWidth && styles.fullWidth,
        disabled && styles.disabled,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? '#667eea' : '#fff'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyles.icon}
              color={variantStyles.text.color}
              style={styles.iconLeft}
            />
          )}
          
          <Text style={[variantStyles.text, sizeStyles.text, textStyle]}>
            {title}
          </Text>

          {icon && iconPosition === 'right' && (
            <MaterialCommunityIcons
              name={icon}
              size={sizeStyles.icon}
              color={variantStyles.text.color}
              style={styles.iconRight}
            />
          )}
        </>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'transparent'
  },
  fullWidth: {
    width: '100%'
  },
  disabled: {
    opacity: 0.5
  },
  // Variants
  primaryContainer: {
    backgroundColor: '#667eea',
    borderColor: '#667eea'
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600'
  },
  secondaryContainer: {
    backgroundColor: '#4caf50',
    borderColor: '#4caf50'
  },
  secondaryText: {
    color: '#fff',
    fontWeight: '600'
  },
  outlineContainer: {
    backgroundColor: 'transparent',
    borderColor: '#667eea'
  },
  outlineText: {
    color: '#667eea',
    fontWeight: '600'
  },
  ghostContainer: {
    backgroundColor: 'transparent',
    borderColor: 'transparent'
  },
  ghostText: {
    color: '#667eea',
    fontWeight: '600'
  },
  dangerContainer: {
    backgroundColor: '#f44336',
    borderColor: '#f44336'
  },
  dangerText: {
    color: '#fff',
    fontWeight: '600'
  },
  // Sizes
  smallContainer: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 32
  },
  smallText: {
    fontSize: 13
  },
  mediumContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 44
  },
  mediumText: {
    fontSize: 15
  },
  largeContainer: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    minHeight: 52
  },
  largeText: {
    fontSize: 17
  },
  // Icons
  iconLeft: {
    marginRight: 8
  },
  iconRight: {
    marginLeft: 8
  }
});

export default Button;