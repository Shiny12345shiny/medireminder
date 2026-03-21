import { DefaultTheme } from 'react-native-paper';

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#667eea',
    accent: '#764ba2',
    background: '#f5f5f5',
    surface: '#ffffff',
    text: '#333333',
    textSecondary: '#666666',
    error: '#f44336',
    success: '#4caf50',
    warning: '#ff9800',
    info: '#2196f3',
    disabled: '#cccccc',
    placeholder: '#999999',
    backdrop: 'rgba(0, 0, 0, 0.5)',
    
    // Medicine schedule colors
    medicine: {
      tablet: '#4caf50',
      capsule: '#2196f3',
      syrup: '#ff9800',
      injection: '#f44336',
      drops: '#9c27b0',
      inhaler: '#00bcd4',
      ointment: '#ff5722',
      other: '#607d8b'
    },
    
    // Status colors
    status: {
      taken: '#4caf50',
      missed: '#f44336',
      pending: '#ff9800',
      scheduled: '#2196f3',
      cancelled: '#9e9e9e'
    },
    
    // Gradient colors
    gradient: {
      primary: ['#667eea', '#764ba2'],
      success: ['#56ab2f', '#a8e063'],
      warning: ['#f2994a', '#f2c94c'],
      error: ['#eb3349', '#f45c43'],
      info: ['#4facfe', '#00f2fe']
    }
  },
  
  fonts: {
    regular: {
      fontFamily: 'Roboto-Regular',
      fontWeight: 'normal'
    },
    medium: {
      fontFamily: 'Roboto-Medium',
      fontWeight: '500'
    },
    bold: {
      fontFamily: 'Roboto-Bold',
      fontWeight: 'bold'
    },
    light: {
      fontFamily: 'Roboto-Regular',
      fontWeight: '300'
    }
  },
  
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48
  },
  
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xlarge: 16,
    round: 50
  },
  
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2
      },
      shadowOpacity: 0.23,
      shadowRadius: 2.62,
      elevation: 4
    },
    large: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 4
      },
      shadowOpacity: 0.30,
      shadowRadius: 4.65,
      elevation: 8
    }
  },
  
  typography: {
    h1: {
      fontSize: 32,
      fontFamily: 'Roboto-Bold',
      lineHeight: 40
    },
    h2: {
      fontSize: 28,
      fontFamily: 'Roboto-Bold',
      lineHeight: 36
    },
    h3: {
      fontSize: 24,
      fontFamily: 'Roboto-Bold',
      lineHeight: 32
    },
    h4: {
      fontSize: 20,
      fontFamily: 'Roboto-Medium',
      lineHeight: 28
    },
    h5: {
      fontSize: 18,
      fontFamily: 'Roboto-Medium',
      lineHeight: 24
    },
    h6: {
      fontSize: 16,
      fontFamily: 'Roboto-Medium',
      lineHeight: 22
    },
    body1: {
      fontSize: 16,
      fontFamily: 'Roboto-Regular',
      lineHeight: 24
    },
    body2: {
      fontSize: 14,
      fontFamily: 'Roboto-Regular',
      lineHeight: 20
    },
    caption: {
      fontSize: 12,
      fontFamily: 'Roboto-Regular',
      lineHeight: 16
    },
    button: {
      fontSize: 16,
      fontFamily: 'Roboto-Medium',
      textTransform: 'uppercase',
      letterSpacing: 0.5
    }
  },
  
  sizes: {
    icon: {
      small: 16,
      medium: 24,
      large: 32,
      xlarge: 48
    },
    avatar: {
      small: 32,
      medium: 48,
      large: 64,
      xlarge: 96
    },
    button: {
      small: 32,
      medium: 44,
      large: 56
    }
  }
};

export default theme;

// Export individual theme properties for convenience
export const colors = theme.colors;
export const fonts = theme.fonts;
export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const shadows = theme.shadows;
export const typography = theme.typography;
export const sizes = theme.sizes;