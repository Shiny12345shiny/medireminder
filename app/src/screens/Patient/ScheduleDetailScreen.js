import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSchedule } from '../../context/ScheduleContext';
import {
  formatDate,
  formatTime,
  getMedicineTypeColor,
  calculateStockDaysRemaining,
  getStockStatus
} from '../../utils/helpers';
import { colors } from '../../constants/theme';

const ScheduleDetailScreen = ({ route, navigation }) => {
  const { scheduleId } = route.params;
  const { getSchedule, deleteSchedule, pauseSchedule, resumeSchedule, refillStock } = useSchedule();

  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refilling, setRefilling] = useState(false);
  const [refillModalVisible, setRefillModalVisible] = useState(false);
  const [refillQuantity, setRefillQuantity] = useState('');

  useEffect(() => {
    loadSchedule();
  }, [scheduleId]);

  const loadSchedule = async () => {
    setLoading(true);
    const result = await getSchedule(scheduleId);
    if (result.success) {
      const scheduleData = result.data?.data || result.data;
      setSchedule(scheduleData);
    }
    setLoading(false);
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Schedule',
      'Are you sure you want to delete this medicine schedule?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteSchedule(scheduleId);
            if (result.success) {
              navigation.goBack();
            }
          }
        }
      ]
    );
  };

  const handlePauseResume = async () => {
    if (schedule.isPaused) {
      const result = await resumeSchedule(scheduleId);
      if (result.success) {
        loadSchedule();
      }
    } else {
      Alert.alert(
        'Pause Schedule',
        'How long do you want to pause this schedule?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: '1 Day',
            onPress: async () => {
              const pauseUntil = new Date();
              pauseUntil.setDate(pauseUntil.getDate() + 1);
              const result = await pauseSchedule(scheduleId, pauseUntil);
              if (result.success) loadSchedule();
            }
          },
          {
            text: '1 Week',
            onPress: async () => {
              const pauseUntil = new Date();
              pauseUntil.setDate(pauseUntil.getDate() + 7);
              const result = await pauseSchedule(scheduleId, pauseUntil);
              if (result.success) loadSchedule();
            }
          },
          {
            text: 'Indefinitely',
            onPress: async () => {
              const result = await pauseSchedule(scheduleId);
              if (result.success) loadSchedule();
            }
          }
        ]
      );
    }
  };

  const handleRefill = async () => {
    const quantity = parseFloat(refillQuantity);
    if (!quantity || quantity <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity');
      return;
    }

    setRefilling(true);
    const result = await refillStock(scheduleId, quantity);
    setRefilling(false);

    if (result.success) {
      setRefillModalVisible(false);
      setRefillQuantity('');
      loadSchedule();
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!schedule) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Schedule not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const daysRemaining = calculateStockDaysRemaining(
    schedule.stock.remainingQuantity,
    schedule.timings.length
  );
  const stockStatus = getStockStatus(daysRemaining);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <LinearGradient
          colors={[getMedicineTypeColor(schedule.medicineType, colors), '#764ba2']}
          style={styles.headerCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <Text style={styles.medicineName}>{schedule.medicineName}</Text>
            <Text style={styles.medicineType}>
              {schedule.medicineType.charAt(0).toUpperCase() + schedule.medicineType.slice(1)}
            </Text>
          </View>

          {schedule.isPaused && (
            <View style={styles.pausedBadge}>
              <MaterialCommunityIcons name="pause" size={16} color="#fff" />
              <Text style={styles.pausedText}>Paused</Text>
            </View>
          )}
        </LinearGradient>

        {/* Dosage Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dosage Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="pill" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Dosage</Text>
                <Text style={styles.infoValue}>
                  {schedule.dosage.amount} {schedule.dosage.unit}
                </Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Frequency</Text>
                <Text style={styles.infoValue}>
                  {schedule.frequency.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Timings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Daily Schedule</Text>
          <View style={styles.card}>
            {schedule.timings.map((timing, index) => (
              <View key={index} style={styles.timingRow}>
                <View style={styles.timingDot} />
                <Text style={styles.timingTime}>{timing.time}</Text>
                <View style={styles.timingLabel}>
                  <Text style={styles.timingLabelText}>
                    {timing.label.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Stock Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Stock Information</Text>
            <TouchableOpacity
              style={styles.refillButton}
              onPress={() => setRefillModalVisible(true)}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#667eea" />
              <Text style={styles.refillButtonText}>Refill</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <View style={styles.stockHeader}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockQuantity}>{schedule.stock.remainingQuantity}</Text>
                <Text style={styles.stockUnit}>{schedule.dosage.unit}</Text>
              </View>
              <View style={[styles.stockBadge, { backgroundColor: stockStatus.color }]}>
                <Text style={styles.stockBadgeText}>{stockStatus.label}</Text>
              </View>
            </View>

            <View style={styles.stockDetails}>
              <View style={styles.stockDetailRow}>
                <Text style={styles.stockDetailLabel}>Days Remaining</Text>
                <Text style={styles.stockDetailValue}>{daysRemaining} days</Text>
              </View>
              <View style={styles.stockDetailRow}>
                <Text style={styles.stockDetailLabel}>Total Stock</Text>
                <Text style={styles.stockDetailValue}>{schedule.stock.totalQuantity}</Text>
              </View>
              {schedule.stock.lastRefillDate && (
                <View style={styles.stockDetailRow}>
                  <Text style={styles.stockDetailLabel}>Last Refill</Text>
                  <Text style={styles.stockDetailValue}>
                    {formatDate(schedule.stock.lastRefillDate)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Duration Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar-start" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Start Date</Text>
                <Text style={styles.infoValue}>{formatDate(schedule.duration.startDate)}</Text>
              </View>
            </View>

            {!schedule.duration.isIndefinite && schedule.duration.endDate && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="calendar-end" size={24} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>End Date</Text>
                  <Text style={styles.infoValue}>{formatDate(schedule.duration.endDate)}</Text>
                </View>
              </View>
            )}

            {schedule.duration.isIndefinite && (
              <View style={styles.indefiniteBadge}>
                <MaterialCommunityIcons name="infinity" size={20} color="#2196f3" />
                <Text style={styles.indefiniteText}>Indefinite Duration</Text>
              </View>
            )}
          </View>
        </View>

        {/* Instructions Section */}
        {schedule.instructions && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Instructions</Text>
            <View style={styles.card}>
              {schedule.instructions.beforeFood && (
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="food-off" size={20} color="#666" />
                  <Text style={styles.instructionText}>Take before food</Text>
                </View>
              )}
              {schedule.instructions.afterFood && (
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="food" size={20} color="#666" />
                  <Text style={styles.instructionText}>Take after food</Text>
                </View>
              )}
              {schedule.instructions.withFood && (
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="silverware" size={20} color="#666" />
                  <Text style={styles.instructionText}>Take with food</Text>
                </View>
              )}
              {schedule.instructions.emptyStomach && (
                <View style={styles.instructionItem}>
                  <MaterialCommunityIcons name="food-variant-off" size={20} color="#666" />
                  <Text style={styles.instructionText}>Take on empty stomach</Text>
                </View>
              )}
              {schedule.instructions.specialInstructions && (
                <View style={styles.specialInstructions}>
                  <Text style={styles.specialInstructionsText}>
                    {schedule.instructions.specialInstructions}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Adherence Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Adherence</Text>
          <View style={styles.card}>
            <View style={styles.adherenceHeader}>
              <Text style={styles.adherenceScore}>{schedule.adherenceScore}%</Text>
              <Text style={styles.adherenceLabel}>Adherence Rate</Text>
            </View>

            <View style={styles.adherenceStats}>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatValue}>{schedule.totalDosesTaken}</Text>
                <Text style={styles.adherenceStatLabel}>Taken</Text>
              </View>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatValue}>{schedule.totalDosesMissed}</Text>
                <Text style={styles.adherenceStatLabel}>Missed</Text>
              </View>
              <View style={styles.adherenceStat}>
                <Text style={styles.adherenceStatValue}>
                  {schedule.totalDosesTaken + schedule.totalDosesMissed}
                </Text>
                <Text style={styles.adherenceStatLabel}>Total</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditSchedule', { scheduleId: schedule._id })}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.pauseButton]}
            onPress={handlePauseResume}
          >
            <MaterialCommunityIcons
              name={schedule.isPaused ? 'play' : 'pause'}
              size={20}
              color="#fff"
            />
            <Text style={styles.actionButtonText}>
              {schedule.isPaused ? 'Resume' : 'Pause'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.deleteButton]}
            onPress={handleDelete}
          >
            <MaterialCommunityIcons name="delete" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Delete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Refill Modal */}
      <Modal
        visible={refillModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRefillModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Refill Stock</Text>
            <Text style={styles.modalSubtitle}>
              Current stock: {schedule.stock.remainingQuantity} {schedule.dosage.unit}
            </Text>

            <View style={styles.modalInput}>
              <TextInput
                style={styles.input}
                placeholder="Enter quantity to add"
                keyboardType="numeric"
                value={refillQuantity}
                onChangeText={setRefillQuantity}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => {
                  setRefillModalVisible(false);
                  setRefillQuantity('');
                }}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleRefill}
                disabled={refilling}
              >
                {refilling ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Refill</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20
  },
  errorButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  content: {
    flex: 1
  },
  headerCard: {
    padding: 20,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerContent: {
    marginBottom: 10
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  medicineType: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  pausedText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600'
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  refillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4
  },
  refillButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15
  },
  infoContent: {
    flex: 1
  },
  infoLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 15
  },
  timingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#667eea'
  },
  timingTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    width: 80
  },
  timingLabel: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  timingLabelText: {
    fontSize: 13,
    color: '#666'
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  stockInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 5
  },
  stockQuantity: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333'
  },
  stockUnit: {
    fontSize: 16,
    color: '#666'
  },
  stockBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  stockBadgeText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: '600'
  },
  stockDetails: {
    gap: 10
  },
  stockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  stockDetailLabel: {
    fontSize: 14,
    color: '#666'
  },
  stockDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  indefiniteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
    padding: 12,
    borderRadius: 8,
    gap: 8
  },
  indefiniteText: {
    fontSize: 15,
    color: '#2196f3',
    fontWeight: '600'
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12
  },
  instructionText: {
    fontSize: 15,
    color: '#666'
  },
  specialInstructions: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginTop: 10
  },
  specialInstructionsText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  adherenceHeader: {
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 15
  },
  adherenceScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4caf50',
    marginBottom: 5
  },
  adherenceLabel: {
    fontSize: 14,
    color: '#666'
  },
  adherenceStats: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  adherenceStat: {
    alignItems: 'center'
  },
  adherenceStatValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  adherenceStatLabel: {
    fontSize: 13,
    color: '#666'
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingBottom: 30,
    gap: 10
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6
  },
  editButton: {
    backgroundColor: '#667eea'
  },
  pauseButton: {
    backgroundColor: '#ff9800'
  },
  deleteButton: {
    backgroundColor: '#f44336'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20
  },
  modalInput: {
    marginBottom: 20
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333'
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center'
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0'
  },
  modalButtonConfirm: {
    backgroundColor: '#667eea'
  },
  modalButtonTextCancel: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600'
  },
  modalButtonTextConfirm: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600'
  }
});

export default ScheduleDetailScreen;