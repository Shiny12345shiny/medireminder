import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const StatCard = ({
  icon,
  iconColor = '#667eea',
  iconBgColor = '#e8eaf6',
  label,
  value,
  subtitle,
  onPress,
  style
}) => {
  const CardContent = () => (
    <View style={[styles.card, style]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <MaterialCommunityIcons name={icon} size={28} color={iconColor} />
      </View>
      
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        <CardContent />
      </TouchableOpacity>
    );
  }

  return <CardContent />;
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  label: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 11,
    color: '#999',
    marginTop: 4,
    textAlign: 'center'
  }
});

export default StatCard;