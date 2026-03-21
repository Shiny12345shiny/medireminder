import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate } from '../../utils/helpers';

const BookAppointmentScreen = ({ route, navigation }) => {
  const { doctorId, rescheduleFrom } = route.params || {};

  const [doctor, setDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [formData, setFormData] = useState({
    appointmentDate: new Date(),
    appointmentTime: '',
    consultationType: 'video',
    reason: '',
    symptoms: [],
    chiefComplaint: '',
    priority: 'medium'
  });

  const [symptomInput, setSymptomInput] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  useEffect(() => {
    if (doctorId) {
      loadDoctorDetails();
    }
  }, [doctorId]);

  useEffect(() => {
    if (formData.appointmentDate) {
      loadAvailableSlots();
    }
  }, [formData.appointmentDate]);

  const loadDoctorDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_DETAIL(doctorId));
      setDoctor(response.data);
    } catch (error) {
      console.error('Error loading doctor details:', error);
      Alert.alert('Error', 'Failed to load doctor details');
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    setLoadingSlots(true);
    try {
      const response = await apiClient.get(
        API_ENDPOINTS.DOCTOR_AVAILABILITY(doctorId),
        {
          params: {
            date: formData.appointmentDate.toISOString().split('T')[0]
          }
        }
      );

      if (response.data?.available && response.data?.slots) {
        const available = response.data.slots.filter(slot => slot.available);
        setAvailableSlots(available);
      } else {
        setAvailableSlots([]);
      }
    } catch (error) {
      console.error('Error loading slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addSymptom = () => {
    if (symptomInput.trim()) {
      updateFormData('symptoms', [...formData.symptoms, symptomInput.trim()]);
      setSymptomInput('');
    }
  };

  const removeSymptom = (index) => {
    const newSymptoms = formData.symptoms.filter((_, i) => i !== index);
    updateFormData('symptoms', newSymptoms);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('appointmentDate', selectedDate);
    }
  };

  const validateForm = () => {
    if (!formData.appointmentTime) {
      Alert.alert('Required', 'Please select an appointment time');
      return false;
    }

    if (!formData.reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for consultation');
      return false;
    }

    return true;
  };

  const handleBookAppointment = async () => {
    if (!validateForm()) return;

    setBooking(true);
    try {
      const bookingData = {
        doctorId,
        appointmentDate: formData.appointmentDate.toISOString().split('T')[0],
        appointmentTime: formData.appointmentTime,
        consultationType: formData.consultationType,
        reason: formData.reason,
        symptoms: formData.symptoms,
        chiefComplaint: formData.chiefComplaint,
        priority: formData.priority
      };

      const response = await apiClient.post(
        API_ENDPOINTS.BOOK_APPOINTMENT,
        bookingData
      );

      Alert.alert(
        'Success',
        'Appointment booked successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Appointments')
          }
        ]
      );
    } catch (error) {
      console.error('Error booking appointment:', error);
      Alert.alert(
        'Booking Failed',
        error.response?.data?.error || 'Failed to book appointment'
      );
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Doctor not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Doctor Info */}
        <View style={styles.doctorCard}>
          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          <Text style={styles.specialization}>{doctor.specialization}</Text>
          {doctor.consultationFee && (
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Consultation Fee:</Text>
              <Text style={styles.feeAmount}>₹{doctor.consultationFee}</Text>
            </View>
          )}
        </View>

        {/* Appointment Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={24} color="#667eea" />
            <Text style={styles.dateText}>{formatDate(formData.appointmentDate)}</Text>
          </TouchableOpacity>
        </View>

        {/* Available Time Slots */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Select Time Slot</Text>
          {loadingSlots ? (
            <View style={styles.slotsLoading}>
              <ActivityIndicator size="small" color="#667eea" />
              <Text style={styles.loadingText}>Loading available slots...</Text>
            </View>
          ) : availableSlots.length > 0 ? (
            <View style={styles.slotsContainer}>
              {availableSlots.map((slot, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.slotButton,
                    formData.appointmentTime === slot.time && styles.slotButtonActive
                  ]}
                  onPress={() => updateFormData('appointmentTime', slot.time)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      formData.appointmentTime === slot.time && styles.slotTextActive
                    ]}
                  >
                    {slot.time}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <View style={styles.noSlots}>
              <MaterialCommunityIcons name="calendar-remove" size={40} color="#ccc" />
              <Text style={styles.noSlotsText}>No slots available for this date</Text>
            </View>
          )}
        </View>

        {/* Consultation Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Consultation Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.consultationType}
              onValueChange={(value) => updateFormData('consultationType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Video Call" value="video" />
              <Picker.Item label="Audio Call" value="audio" />
              <Picker.Item label="Chat" value="chat" />
              <Picker.Item label="In-Person" value="in-person" />
            </Picker>
          </View>
        </View>

        {/* Reason for Consultation */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Reason for Consultation *</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Describe your health concern..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={formData.reason}
            onChangeText={(text) => updateFormData('reason', text)}
          />
        </View>

        {/* Chief Complaint */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Chief Complaint (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Main health issue..."
            placeholderTextColor="#999"
            value={formData.chiefComplaint}
            onChangeText={(text) => updateFormData('chiefComplaint', text)}
          />
        </View>

        {/* Symptoms */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Symptoms (Optional)</Text>
          <View style={styles.symptomInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Add symptom..."
              placeholderTextColor="#999"
              value={symptomInput}
              onChangeText={setSymptomInput}
              onSubmitEditing={addSymptom}
            />
            <TouchableOpacity style={styles.addButton} onPress={addSymptom}>
              <MaterialCommunityIcons name="plus" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>

          {formData.symptoms.length > 0 && (
            <View style={styles.symptomsList}>
              {formData.symptoms.map((symptom, index) => (
                <View key={index} style={styles.symptomChip}>
                  <Text style={styles.symptomText}>{symptom}</Text>
                  <TouchableOpacity onPress={() => removeSymptom(index)}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#666" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Priority */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Priority</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.priority}
              onValueChange={(value) => updateFormData('priority', value)}
              style={styles.picker}
            >
              <Picker.Item label="Low" value="low" />
              <Picker.Item label="Medium" value="medium" />
              <Picker.Item label="High" value="high" />
              <Picker.Item label="Urgent" value="urgent" />
            </Picker>
          </View>
        </View>

        {/* Book Button */}
        <TouchableOpacity
          style={[styles.bookButton, booking && styles.bookButtonDisabled]}
          onPress={handleBookAppointment}
          disabled={booking}
        >
          {booking ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
              <Text style={styles.bookButtonText}>Book Appointment</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.appointmentDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}
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
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  doctorName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  specialization: {
    fontSize: 15,
    color: '#667eea',
    marginBottom: 10
  },
  feeRow: {
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
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4caf50'
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10
  },
  dateText: {
    fontSize: 16,
    color: '#333'
  },
  slotsLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 10
  },
  loadingText: {
    fontSize: 14,
    color: '#666'
  },
  slotsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10
  },
  slotButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    backgroundColor: '#fff'
  },
  slotButtonActive: {
    borderColor: '#667eea',
    backgroundColor: '#667eea'
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666'
  },
  slotTextActive: {
    color: '#fff'
  },
  noSlots: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  noSlotsText: {
    fontSize: 14,
    color: '#999',
    marginTop: 10
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    overflow: 'hidden'
  },
  picker: {
    height: 50
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333'
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top'
  },
  symptomInputContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10
  },
  addButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  symptomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  symptomText: {
    fontSize: 14,
    color: '#667eea'
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8
  },
  bookButtonDisabled: {
    opacity: 0.6
  },
  bookButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default BookAppointmentScreen;