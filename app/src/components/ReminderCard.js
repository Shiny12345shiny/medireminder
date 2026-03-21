import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatTime, getStatusColor } from '../utils/helpers';
import { colors } from '../constants/theme';

const ReminderCard = ({
  medicineName,
  dosage,
  scheduledTime,
  status,
  takenAt,
  snoozedUntil,
  notes,
  onPress,
  style
}) => {
  const statusColor = getStatusColor(status, colors);

  const getStatusIcon = () => {
    switch (status) {
      case 'taken':
        return 'check-circle';
      case 'missed':
        return 'close-circle';
      case 'pending':
        return 'clock-alert';
      case 'scheduled':
        return 'clock-outline';
      case 'snoozed':
        return 'sleep';
      case 'skipped':
        return 'skip-next';
      default:
        return 'clock-outline';
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, style]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      
      <View style={styles.content}>
        <View style={styles.header}>
          <View style={styles.medicineInfo}>
            <Text style={styles.medicineName}>{medicineName}</Text>
            <Text style={styles.dosage}>
              {dosage?.amount} {dosage?.unit}
            </Text>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <MaterialCommunityIcons name={getStatusIcon()} size={14} color="#fff" />
            <Text style={styles.statusText}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <View style={styles.timeInfo}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.timeText}>{formatTime(scheduledTime)}</Text>
          </View>

          {takenAt && (
            <View style={styles.takenInfo}>
              <MaterialCommunityIcons name="check" size={16} color="#4caf50" />
              <Text style={styles.takenText}>Taken at {formatTime(takenAt)}</Text>
            </View>
          )}

          {status === 'snoozed' && snoozedUntil && (
            <View style={styles.snoozeInfo}>
              <MaterialCommunityIcons name="sleep" size={16} color="#ff9800" />
              <Text style={styles.snoozeText}>Until {formatTime(snoozedUntil)}</Text>
            </View>
          )}
        </View>

        {notes && (
          <View style={styles.notesContainer}>
            <Text style={styles.notesText} numberOfLines={2}>
              {notes}
            </Text>
          </View>
        )}
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12
  },
  content: {
    flex: 1
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  medicineInfo: {
    flex: 1,
    marginRight: 10
  },
  medicineName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  dosage: {
    fontSize: 14,
    color: '#666'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  footer: {
    gap: 8
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  timeText: {
    fontSize: 14,
    color: '#666'
  },
  takenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  takenText: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500'
  },
  snoozeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  snoozeText: {
    fontSize: 13,
    color: '#ff9800',
    fontWeight: '500'
  },
  notesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
  }
});

export default ReminderCard;