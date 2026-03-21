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
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate, formatTime, formatDateTime, getStatusColor } from '../../utils/helpers';
import { colors } from '../../constants/theme';

const AppointmentDetailScreen = ({ route, navigation }) => {
  const { appointmentId } = route.params;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModalVisible, setCancelModalVisible] = useState(false);
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadAppointment();
  }, [appointmentId]);

  const loadAppointment = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.APPOINTMENT_DETAIL(appointmentId));
      setAppointment(response.data);
    } catch (error) {
      console.error('Error loading appointment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      Alert.alert('Required', 'Please provide a cancellation reason');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.put(API_ENDPOINTS.CANCEL_APPOINTMENT(appointmentId), {
        reason: cancelReason
      });
      setCancelModalVisible(false);
      setCancelReason('');
      await loadAppointment();
      Alert.alert('Cancelled', 'Appointment has been cancelled');
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      Alert.alert('Error', 'Failed to cancel appointment');
    } finally {
      setProcessing(false);
    }
  };

  const handleReschedule = () => {
    setCancelModalVisible(false);
    navigation.navigate('BookAppointment', {
      doctorId: appointment.doctor._id,
      rescheduleFrom: appointmentId
    });
  };

  const handleRate = async () => {
    if (rating === 0) {
      Alert.alert('Required', 'Please provide a rating');
      return;
    }

    setProcessing(true);
    try {
      await apiClient.post(API_ENDPOINTS.RATE_APPOINTMENT(appointmentId), {
        score: rating,
        review: review.trim()
      });
      setRatingModalVisible(false);
      setRating(0);
      setReview('');
      await loadAppointment();
      Alert.alert('Thank You', 'Your rating has been submitted');
    } catch (error) {
      console.error('Error rating appointment:', error);
      Alert.alert('Error', 'Failed to submit rating');
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

  if (!appointment) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Appointment not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(appointment.status, colors);
  const canCancel = ['scheduled', 'confirmed'].includes(appointment.status);
  const canRate = appointment.status === 'completed' && !appointment.rating?.patientRating?.score;

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
            <MaterialCommunityIcons name="doctor" size={48} color="#fff" />
            <Text style={styles.doctorName}>Dr. {appointment.doctor?.name}</Text>
            <Text style={styles.specialization}>{appointment.doctor?.specialization}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>
                {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* Appointment Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appointment Details</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(appointment.appointmentDate)}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="clock-outline" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Time</Text>
                <Text style={styles.infoValue}>{appointment.appointmentTime}</Text>
              </View>
            </View>

            <View style={styles.infoRow}>
              <MaterialCommunityIcons 
                name={
                  appointment.consultationType === 'video' ? 'video' :
                  appointment.consultationType === 'audio' ? 'phone' :
                  appointment.consultationType === 'chat' ? 'message' :
                  'hospital-building'
                } 
                size={24} 
                color="#667eea" 
              />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Type</Text>
                <Text style={styles.infoValue}>
                  {appointment.consultationType.charAt(0).toUpperCase() + 
                   appointment.consultationType.slice(1)} Consultation
                </Text>
              </View>
            </View>

            {appointment.duration && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="timer-outline" size={24} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Duration</Text>
                  <Text style={styles.infoValue}>{appointment.duration} minutes</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Reason */}
        {appointment.reason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reason for Visit</Text>
            <View style={styles.card}>
              <Text style={styles.reasonText}>{appointment.reason}</Text>
            </View>
          </View>
        )}

        {/* Symptoms */}
        {appointment.symptoms && appointment.symptoms.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Symptoms</Text>
            <View style={styles.card}>
              {appointment.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomItem}>
                  <MaterialCommunityIcons name="circle-small" size={20} color="#667eea" />
                  <Text style={styles.symptomText}>{symptom}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Doctor Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Doctor Information</Text>
          <View style={styles.card}>
            {appointment.doctor?.qualifications && (
              <View style={styles.doctorInfoRow}>
                <MaterialCommunityIcons name="school" size={20} color="#666" />
                <Text style={styles.doctorInfoText}>{appointment.doctor.qualifications}</Text>
              </View>
            )}

            {appointment.doctor?.experience && (
              <View style={styles.doctorInfoRow}>
                <MaterialCommunityIcons name="briefcase" size={20} color="#666" />
                <Text style={styles.doctorInfoText}>
                  {appointment.doctor.experience} years experience
                </Text>
              </View>
            )}

            {appointment.doctor?.email && (
              <View style={styles.doctorInfoRow}>
                <MaterialCommunityIcons name="email" size={20} color="#666" />
                <Text style={styles.doctorInfoText}>{appointment.doctor.email}</Text>
              </View>
            )}

            {appointment.doctor?.phone && (
              <View style={styles.doctorInfoRow}>
                <MaterialCommunityIcons name="phone" size={20} color="#666" />
                <Text style={styles.doctorInfoText}>{appointment.doctor.phone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Fee Information */}
        {appointment.fee && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Details</Text>
            <View style={styles.card}>
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Consultation Fee</Text>
                <Text style={styles.feeAmount}>₹{appointment.fee.amount}</Text>
              </View>
              
              <View style={styles.feeRow}>
                <Text style={styles.feeLabel}>Status</Text>
                <View style={[
                  styles.paymentBadge,
                  { backgroundColor: appointment.fee.isPaid ? '#4caf50' : '#ff9800' }
                ]}>
                  <Text style={styles.paymentText}>
                    {appointment.fee.isPaid ? 'Paid' : 'Pending'}
                  </Text>
                </View>
              </View>

              {appointment.fee.paidAt && (
                <View style={styles.feeRow}>
                  <Text style={styles.feeLabel}>Paid At</Text>
                  <Text style={styles.feeValue}>{formatDateTime(appointment.fee.paidAt)}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Prescription */}
        {appointment.prescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription</Text>
            <View style={styles.card}>
              {appointment.prescription.diagnosis && (
                <View style={styles.prescriptionItem}>
                  <Text style={styles.prescriptionLabel}>Diagnosis:</Text>
                  <Text style={styles.prescriptionText}>{appointment.prescription.diagnosis}</Text>
                </View>
              )}

              {appointment.prescription.medicines && appointment.prescription.medicines.length > 0 && (
                <View style={styles.prescriptionItem}>
                  <Text style={styles.prescriptionLabel}>Medicines:</Text>
                  {appointment.prescription.medicines.map((med, index) => (
                    <View key={index} style={styles.medicineItem}>
                      <Text style={styles.medicineName}>{med.name}</Text>
                      <Text style={styles.medicineDosage}>
                        {med.dosage} - {med.frequency}
                      </Text>
                      {med.duration && (
                        <Text style={styles.medicineDuration}>Duration: {med.duration}</Text>
                      )}
                    </View>
                  ))}
                </View>
              )}

              {appointment.prescription.tests && appointment.prescription.tests.length > 0 && (
                <View style={styles.prescriptionItem}>
                  <Text style={styles.prescriptionLabel}>Recommended Tests:</Text>
                  {appointment.prescription.tests.map((test, index) => (
                    <View key={index} style={styles.testItem}>
                      <MaterialCommunityIcons name="test-tube" size={16} color="#666" />
                      <Text style={styles.testText}>{test}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Rating */}
        {appointment.rating?.patientRating?.score && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Rating</Text>
            <View style={styles.card}>
              <View style={styles.ratingDisplay}>
                <Text style={styles.ratingScore}>{appointment.rating.patientRating.score}</Text>
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <MaterialCommunityIcons
                      key={star}
                      name={star <= appointment.rating.patientRating.score ? 'star' : 'star-outline'}
                      size={20}
                      color="#ffc107"
                    />
                  ))}
                </View>
              </View>
              {appointment.rating.patientRating.review && (
                <Text style={styles.reviewText}>{appointment.rating.patientRating.review}</Text>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          {canCancel && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rescheduleButton]}
                onPress={handleReschedule}
              >
                <MaterialCommunityIcons name="calendar-edit" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Reschedule</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.cancelButton]}
                onPress={() => setCancelModalVisible(true)}
              >
                <MaterialCommunityIcons name="cancel" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {canRate && (
            <TouchableOpacity
              style={[styles.actionButton, styles.rateButton]}
              onPress={() => setRatingModalVisible(true)}
            >
              <MaterialCommunityIcons name="star" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Rate Appointment</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

      {/* Cancel Modal */}
      <Modal
        visible={cancelModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Cancel Appointment</Text>
            <Text style={styles.modalSubtitle}>Please provide a reason for cancellation</Text>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Reason for cancellation..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={cancelReason}
              onChangeText={setCancelReason}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setCancelModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Back</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleCancel}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Cancel Appointment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Rating Modal */}
      <Modal
        visible={ratingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRatingModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Rate Your Experience</Text>
            <Text style={styles.modalSubtitle}>How was your consultation?</Text>

            <View style={styles.ratingSelector}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setRating(star)}
                >
                  <MaterialCommunityIcons
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={40}
                    color="#ffc107"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Write a review (optional)..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={4}
              value={review}
              onChangeText={setReview}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setRatingModalVisible(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleRate}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.modalButtonTextConfirm}>Submit</Text>
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
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 5
  },
  specialization: {
    fontSize: 16,
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
  reasonText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22
  },
  symptomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4
  },
  symptomText: {
    fontSize: 15,
    color: '#666'
  },
  doctorInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10
  },
  doctorInfoText: {
    fontSize: 14,
    color: '#666'
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10
  },
  feeLabel: {
    fontSize: 15,
    color: '#666'
  },
  feeAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  feeValue: {
    fontSize: 14,
    color: '#666'
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  paymentText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  prescriptionItem: {
    marginBottom: 15
  },
  prescriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  prescriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  medicineItem: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8
  },
  medicineName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  medicineDosage: {
    fontSize: 14,
    color: '#666'
  },
  medicineDuration: {
    fontSize: 13,
    color: '#999',
    marginTop: 2
  },
  testItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8
  },
  testText: {
    fontSize: 14,
    color: '#666'
  },
  ratingDisplay: {
    alignItems: 'center',
    marginBottom: 15
  },
  ratingScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 10
  },
  stars: {
    flexDirection: 'row',
    gap: 4
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    textAlign: 'center'
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
  rescheduleButton: {
    backgroundColor: '#ff9800'
  },
  cancelButton: {
    backgroundColor: '#f44336'
  },
  rateButton: {
    backgroundColor: '#ffc107'
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
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333',
    marginBottom: 20
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  ratingSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20
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

export default AppointmentDetailScreen;