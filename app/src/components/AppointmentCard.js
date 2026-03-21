import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { formatDate, getStatusColor } from '../utils/helpers';
import { colors } from '../constants/theme';

const AppointmentCard = ({
  doctorName,
  patientName,
  appointmentDate,
  appointmentTime,
  consultationType,
  status,
  reason,
  fee,
  isPaid,
  onPress,
  style,
  userRole = 'patient'
}) => {
  const statusColor = getStatusColor(status, colors);

  const getConsultationIcon = () => {
    switch (consultationType) {
      case 'video':
        return 'video';
      case 'audio':
        return 'phone';
      case 'chat':
        return 'message';
      case 'in-person':
        return 'hospital-building';
      default:
        return 'calendar';
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
          <View style={styles.nameInfo}>
            <Text style={styles.name}>
              {userRole === 'patient' ? `Dr. ${doctorName}` : patientName}
            </Text>
            <View style={styles.typeInfo}>
              <MaterialCommunityIcons
                name={getConsultationIcon()}
                size={14}
                color="#666"
              />
              <Text style={styles.typeText}>
                {consultationType.charAt(0).toUpperCase() + consultationType.slice(1)}
              </Text>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
            <Text style={styles.statusText}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </View>
        </View>

        <View style={styles.details}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar" size={16} color="#666" />
            <Text style={styles.detailText}>{formatDate(appointmentDate)}</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{appointmentTime}</Text>
          </View>
        </View>

        {reason && (
          <View style={styles.reasonContainer}>
            <Text style={styles.reasonLabel}>Reason:</Text>
            <Text style={styles.reasonText} numberOfLines={2}>
              {reason}
            </Text>
          </View>
        )}

        {fee && (
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Fee:</Text>
            <Text style={styles.feeAmount}>
              ₹{fee}
              {isPaid && <Text style={styles.paidBadge}> • Paid</Text>}
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
    marginBottom: 12
  },
  nameInfo: {
    flex: 1,
    marginRight: 10
  },
  name: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6
  },
  typeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  typeText: {
    fontSize: 13,
    color: '#666'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  details: {
    gap: 6,
    marginBottom: 10
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 14,
    color: '#666'
  },
  reasonContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10
  },
  reasonLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 4
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  feeLabel: {
    fontSize: 14,
    color: '#666'
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  paidBadge: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600'
  }
});

export default AppointmentCard;