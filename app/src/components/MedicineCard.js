import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { getMedicineTypeColor } from '../utils/helpers';

const MedicineCard = ({
  medicineName,
  medicineType,
  dosage,
  timings,
  stock,
  adherenceScore,
  isPaused,
  onPress,
  style
}) => {
  const typeColor = getMedicineTypeColor(medicineType);

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.typeIndicator, { backgroundColor: typeColor }]}>
            <MaterialCommunityIcons name="pill" size={20} color="#fff" />
          </View>
          
          <View style={styles.nameContainer}>
            <Text style={styles.medicineName}>{medicineName}</Text>
            <Text style={styles.medicineType}>
              {medicineType.charAt(0).toUpperCase() + medicineType.slice(1)}
            </Text>
          </View>
        </View>

        {isPaused && (
          <View style={styles.pausedBadge}>
            <MaterialCommunityIcons name="pause" size={14} color="#ff9800" />
            <Text style={styles.pausedText}>Paused</Text>
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons name="eyedropper" size={16} color="#666" />
          <Text style={styles.infoText}>
            {dosage?.amount} {dosage?.unit}
          </Text>
        </View>

        {timings && timings.length > 0 && (
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.infoText}>
              {timings.length} time{timings.length > 1 ? 's' : ''} daily
            </Text>
          </View>
        )}

        {stock !== undefined && (
          <View style={styles.stockRow}>
            <MaterialCommunityIcons name="package-variant" size={16} color="#666" />
            <Text style={styles.infoText}>Stock: {stock.remaining}</Text>
            {stock.remaining <= stock.refillThreshold && (
              <View style={styles.lowStockBadge}>
                <Text style={styles.lowStockText}>Low</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {adherenceScore !== undefined && (
        <View style={styles.adherenceContainer}>
          <View style={styles.adherenceHeader}>
            <Text style={styles.adherenceLabel}>Adherence</Text>
            <Text style={styles.adherenceScore}>{adherenceScore}%</Text>
          </View>
          <View style={styles.adherenceBar}>
            <View
              style={[
                styles.adherenceProgress,
                {
                  width: `${adherenceScore}%`,
                  backgroundColor: getAdherenceColor(adherenceScore)
                }
              ]}
            />
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

const getAdherenceColor = (score) => {
  if (score >= 80) return '#4caf50';
  if (score >= 60) return '#ff9800';
  return '#f44336';
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  headerLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12
  },
  typeIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nameContainer: {
    flex: 1
  },
  medicineName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  medicineType: {
    fontSize: 13,
    color: '#666'
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pausedText: {
    fontSize: 11,
    color: '#ff9800',
    fontWeight: '600'
  },
  content: {
    gap: 8,
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666'
  },
  lowStockBadge: {
    backgroundColor: '#ffebee',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 4
  },
  lowStockText: {
    fontSize: 11,
    color: '#f44336',
    fontWeight: '600'
  },
  adherenceContainer: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  adherenceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  adherenceLabel: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600'
  },
  adherenceScore: {
    fontSize: 15,
    color: '#333',
    fontWeight: 'bold'
  },
  adherenceBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    overflow: 'hidden'
  },
  adherenceProgress: {
    height: '100%',
    borderRadius: 3
  }
});

export default MedicineCard;