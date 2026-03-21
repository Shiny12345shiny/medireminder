import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatTime, formatDateTime, getStatusColor } from '../../utils/helpers';
import { colors } from '../../constants/theme';

const ReminderDetailScreen = ({ route, navigation }) => {
  const { reminderId } = route.params;

  const [reminder, setReminder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [snoozeModalVisible, setSnoozeModalVisible] = useState(false);
  const [skipModalVisible, setSkipModalVisible] = useState(false);
  const [sideEffectModalVisible, setSideEffectModalVisible] = useState(false);
  const [notes, setNotes] = useState('');
  const [snoozeMinutes, setSnoozeMinutes] = useState('10');
  const [skipReason, setSkipReason] = useState('');
  const [sideEffect, setSideEffect] = useState('');
  const [sideEffectSeverity, setSideEffectSeverity] = useState('mild');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadReminder();
  }, [reminderId]);

  const loadReminder = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.REMINDER_DETAIL(reminderId));
      setReminder(response.data || response);
    } catch (error) {
      console.error('Error loading reminder:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmTaken = async () => {
    setProcessing(true);
    try {
      await apiClient.post(API_ENDPOINTS.CONFIRM_REMINDER(reminderId), {
        notes
      });
      setConfirmModalVisible(false);
      setNotes('');
      await loadReminder();
      Alert.alert('Success', 'Medicine marked as taken');
    } catch (error) {
      console.error('Error confirming reminder:', error);
      Alert.alert('Error', 'Failed to confirm medicine taken');
    } finally {
      setProcessing(false);
    }
  };

  const handleSnooze = async () => {
    const minutes = parseInt(snoozeMinutes);
    if (!minutes || minutes <= 0) {
      Alert.alert('Invalid Input', 'Please enter a valid number of minutes');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.post(API_ENDPOINTS.SNOOZE_REMINDER(reminderId), {
        minutes
      });
      setSnoozeModalVisible(false);
      setSnoozeMinutes('10');
      await loadReminder();
      Alert.alert('Snoozed', `Reminder snoozed for ${minutes} minutes`);
    } catch (error) {
      console.error('Error snoozing reminder:', error);
      Alert.alert('Error', 'Failed to snooze reminder');
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = async () => {
    setProcessing(true);
    try {
      await apiClient.post(API_ENDPOINTS.SKIP_REMINDER(reminderId), {
        reason: skipReason
      });
      setSkipModalVisible(false);
      setSkipReason('');
      await loadReminder();
      Alert.alert('Skipped', 'Reminder has been skipped');
    } catch (error) {
      console.error('Error skipping reminder:', error);
      Alert.alert('Error', 'Failed to skip reminder');
    } finally {
      setProcessing(false);
    }
  };

  const handleReportSideEffect = async () => {
    if (!sideEffect.trim()) {
      Alert.alert('Invalid Input', 'Please describe the side effect');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.post(`${API_ENDPOINTS.REMINDER_DETAIL(reminderId)}/side-effect`, {
        effect: sideEffect,
        severity: sideEffectSeverity
      });
      setSideEffectModalVisible(false);
      setSideEffect('');
      setSideEffectSeverity('mild');
      await loadReminder();
      Alert.alert('Reported', 'Side effect has been reported');
    } catch (error) {
      console.error('Error reporting side effect:', error);
      Alert.alert('Error', 'Failed to report side effect');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!reminder) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Reminder not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(reminder.status, colors);
  const canConfirm = ['pending', 'sent', 'snoozed', 'missed'].includes(reminder.status);
  const canSnooze = ['pending', 'sent'].includes(reminder.status);
  const canSkip = ['pending', 'sent', 'snoozed'].includes(reminder.status);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <LinearGradient
          colors={[statusColor, '#764ba2']}
          style={styles.headerCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons name="pill" size={48} color="#fff" />
            <Text style={styles.medicineName}>
              {reminder.medicineName || reminder.schedule?.medicineName}
            </Text>
            <Text style={styles.dosage}>
              {reminder.dosage?.amount || reminder.schedule?.dosage?.amount}{' '}
              {reminder.dosage?.unit || reminder.schedule?.dosage?.unit}
            </Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {reminder.status.charAt(0).toUpperCase() + reminder.status.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Time Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Time Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Scheduled Time</Text>
                <Text style={styles.infoValue}>{formatTime(reminder.scheduledTime)}</Text>
              </View>
            </View>

            {reminder.takenAt && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="check-circle" size={24} color="#4caf50" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Taken At</Text>
                  <Text style={styles.infoValue}>{formatDateTime(reminder.takenAt)}</Text>
                </View>
              </View>
            )}

            {reminder.status === 'snoozed' && reminder.snoozedUntil && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="sleep" size={24} color="#ff9800" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Snoozed Until</Text>
                  <Text style={styles.infoValue}>{formatTime(reminder.snoozedUntil)}</Text>
                </View>
              </View>
            )}

            {reminder.snoozeCount > 0 && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="replay" size={24} color="#666" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Times Snoozed</Text>
                  <Text style={styles.infoValue}>{reminder.snoozeCount}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Notes */}
        {reminder.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <View style={styles.card}>
              <Text style={styles.notesText}>{reminder.notes}</Text>
            </View>
          </View>
        )}

        {/* Side Effects */}
        {reminder.sideEffects && reminder.sideEffects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reported Side Effects</Text>
            <View style={styles.card}>
              {reminder.sideEffects.map((effect, index) => (
                <View key={index} style={styles.sideEffectItem}>
                  <View style={styles.sideEffectHeader}>
                    <View style={[
                      styles.severityBadge,
                      { backgroundColor: getSeverityColor(effect.severity) }
                    ]}>
                      <Text style={styles.severityText}>
                        {effect.severity.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.sideEffectTime}>
                      {formatDateTime(effect.reportedAt)}
                    </Text>
                  </View>
                  <Text style={styles.sideEffectText}>{effect.effect}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notifications Sent */}
        {reminder.notificationsSent && reminder.notificationsSent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            <View style={styles.card}>
              {reminder.notificationsSent.map((notification, index) => (
                <View key={index} style={styles.notificationItem}>
                  <MaterialCommunityIcons
                    name={getNotificationIcon(notification.type)}
                    size={20}
                    color="#667eea"
                  />
                  <Text style={styles.notificationText}>
                    {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)} sent at{' '}
                    {formatTime(notification.sentAt)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {(canConfirm || canSnooze || canSkip) && (
          <View style={styles.actionButtons}>
            {canConfirm && (
              <TouchableOpacity
                style={[styles.actionButton, styles.confirmButton]}
                onPress={() => setConfirmModalVisible(true)}
              >
                <MaterialCommunityIcons name="check" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Mark as Taken</Text>
              </TouchableOpacity>
            )}

            {canSnooze && (
              <TouchableOpacity
                style={[styles.actionButton, styles.snoozeButton]}
                onPress={() => setSnoozeModalVisible(true)}
              >
                <MaterialCommunityIcons name="sleep" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Snooze</Text>
              </TouchableOpacity>
            )}

            {canSkip && (
              <TouchableOpacity
                style={[styles.actionButton, styles.skipButton]}
                onPress={() => setSkipModalVisible(true)}
              >
                <MaterialCommunityIcons name="skip-next" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Skip</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          style={styles.reportButton}
          onPress={() => setSideEffectModalVisible(true)}
        >
          <MaterialCommunityIcons name="alert" size={20} color="#f44336" />
          <Text style={styles.reportButtonText}>Report Side Effect</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Confirm Modal */}
      <Modal
        visible={confirmModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Confirm Medicine Taken</Text>
            <Text style={styles.modalSubtitle}>Add any notes (optional)</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Notes..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={notes}
              onChangeText={setNotes}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setConfirmModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleConfirmTaken}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Snooze Modal */}
      <Modal
        visible={snoozeModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSnoozeModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Snooze Reminder</Text>
            <Text style={styles.modalSubtitle}>How many minutes?</Text>

            <TextInput
              style={styles.input}
              placeholder="Minutes (e.g., 10)"
              placeholderTextColor="#999"
              keyboardType="numeric"
              value={snoozeMinutes}
              onChangeText={setSnoozeMinutes}
            />

            <View style={styles.quickSnoozeOptions}>
              {[5, 10, 15, 30].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={styles.quickSnoozeButton}
                  onPress={() => setSnoozeMinutes(minutes.toString())}
                >
                  <Text style={styles.quickSnoozeText}>{minutes}m</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSnoozeModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSnooze}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Snooze</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Skip Modal */}
      <Modal
        visible={skipModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSkipModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Skip Reminder</Text>
            <Text style={styles.modalSubtitle}>Reason for skipping (optional)</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={skipReason}
              onChangeText={setSkipReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSkipModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSkip}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Skip</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Side Effect Modal */}
      <Modal
        visible={sideEffectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSideEffectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Report Side Effect</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe the side effect..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={sideEffect}
              onChangeText={setSideEffect}
            />

            <View style={styles.severityOptions}>
              <Text style={styles.severityLabel}>Severity:</Text>
              {['mild', 'moderate', 'severe'].map((severity) => (
                <TouchableOpacity
                  key={severity}
                  style={[
                    styles.severityOption,
                    sideEffectSeverity === severity && styles.severityOptionActive
                  ]}
                  onPress={() => setSideEffectSeverity(severity)}
                >
                  <Text style={[
                    styles.severityOptionText,
                    sideEffectSeverity === severity && styles.severityOptionTextActive
                  ]}>
                    {severity.charAt(0).toUpperCase() + severity.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setSideEffectModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleReportSideEffect}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const getSeverityColor = (severity) => {
  switch (severity) {
    case 'mild':
      return '#4caf50';
    case 'moderate':
      return '#ff9800';
    case 'severe':
      return '#f44336';
    default:
      return '#666';
  }
};

const getNotificationIcon = (type) => {
  switch (type) {
    case 'push':
      return 'cellphone';
    case 'email':
      return 'email';
    case 'sms':
      return 'message-text';
    default:
      return 'bell';
  }
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
    padding: 30,
    margin: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  headerContent: {
    alignItems: 'center'
  },
  medicineName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5,
    textAlign: 'center'
  },
  dosage: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 15
  },
  statusBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600'
  },
  section: {
    paddingHorizontal: 15,
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
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
  notesText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22
  },
  sideEffectItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  sideEffectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  severityText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold'
  },
  sideEffectTime: {
    fontSize: 12,
    color: '#999'
  },
  sideEffectText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10
  },
  notificationText: {
    fontSize: 14,
    color: '#666'
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    gap: 10,
    marginBottom: 10
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
  confirmButton: {
    backgroundColor: '#4caf50'
  },
  snoozeButton: {
    backgroundColor: '#ff9800'
  },
  skipButton: {
    backgroundColor: '#9e9e9e'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 15,
    marginBottom: 30,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#f44336',
    gap: 6
  },
  reportButtonText: {
    color: '#f44336',
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 15
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },
  quickSnoozeOptions: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20
  },
  quickSnoozeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    alignItems: 'center'
  },
  quickSnoozeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  severityOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20
  },
  severityLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  severityOption: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center'
  },
  severityOptionActive: {
    borderColor: '#667eea',
    backgroundColor: '#e8eaf6'
  },
  severityOptionText: {
    fontSize: 13,
    color: '#666'
  },
  severityOptionTextActive: {
    color: '#667eea',
    fontWeight: '600'
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

export default ReminderDetailScreen;