import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Switch
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from '../../context/AuthContext';
import { isValidPhone, formatDate } from '../../utils/helpers';

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const defaultHours = (user) => {
  const result = {};
  DAYS.forEach(day => {
    result[day] = {
      available: user?.availableHours?.[day]?.available ?? (day !== 'saturday' && day !== 'sunday'),
      start: user?.availableHours?.[day]?.start || '09:00',
      end: user?.availableHours?.[day]?.end || '17:00',
    };
  });
  return result;
};

const EditProfileScreen = ({ navigation }) => {
  const { user, updateProfile } = useAuth();

  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    dateOfBirth: user?.dateOfBirth ? new Date(user.dateOfBirth) : null,
    address: user?.address || '',
    emergencyContact: {
      name: user?.emergencyContact?.name || '',
      phone: user?.emergencyContact?.phone || '',
      relation: user?.emergencyContact?.relation || ''
    },
    // Doctor-specific
    specialization: user?.specialization || '',
    licenseNumber: user?.licenseNumber || '',
    experience: user?.experience?.toString() || '',
    consultationFee: user?.consultationFee?.toString() || '',
    availableHours: defaultHours(user),
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  // Time picker state
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [timePickerTarget, setTimePickerTarget] = useState(null); // { day, field }
  const [timePickerValue, setTimePickerValue] = useState(new Date());

  const isDoctor = user?.role === 'doctor';

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors({ ...errors, [field]: null });
  };

  const updateNestedField = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: { ...prev[parent], [field]: value }
    }));
  };

  const updateDayHours = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      availableHours: {
        ...prev.availableHours,
        [day]: { ...prev.availableHours[day], [field]: value }
      }
    }));
  };

  const openTimePicker = (day, field) => {
    const currentTime = formData.availableHours[day][field] || '09:00';
    const [hours, minutes] = currentTime.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTimePickerValue(date);
    setTimePickerTarget({ day, field });
    setShowTimePicker(true);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime && timePickerTarget) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      updateDayHours(timePickerTarget.day, timePickerTarget.field, `${hours}:${minutes}`);
    }
    setTimePickerTarget(null);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) updateFormData('dateOfBirth', selectedDate);
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (formData.phone && !isValidPhone(formData.phone)) newErrors.phone = 'Please enter a valid 10-digit phone number';
    if (formData.emergencyContact.phone && !isValidPhone(formData.emergencyContact.phone)) newErrors.emergencyPhone = 'Please enter a valid emergency contact number';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const updateData = {
        name: formData.name.trim(),
        phone: formData.phone || undefined,
        gender: formData.gender || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        address: formData.address || undefined,
        emergencyContact: {
          name: formData.emergencyContact.name || undefined,
          phone: formData.emergencyContact.phone || undefined,
          relation: formData.emergencyContact.relation || undefined
        }
      };

      if (isDoctor) {
        updateData.specialization = formData.specialization || undefined;
        updateData.licenseNumber = formData.licenseNumber || undefined;
        updateData.experience = formData.experience ? parseInt(formData.experience) : undefined;
        updateData.consultationFee = formData.consultationFee ? parseFloat(formData.consultationFee) : undefined;
        updateData.availableHours = formData.availableHours;
      }

      const result = await updateProfile(updateData);
      if (result.success) {
        Alert.alert('Success', 'Profile updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Enter your name"
                placeholderTextColor="#999"
                value={formData.name}
                onChangeText={(text) => updateFormData('name', text)}
              />
            </View>
            {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputContainer, styles.inputDisabled]}>
              <MaterialCommunityIcons name="email" size={20} color="#999" />
              <TextInput style={[styles.input, styles.disabledText]} value={user?.email} editable={false} />
            </View>
            <Text style={styles.helperText}>Email cannot be changed</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="phone" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Enter phone number"
                placeholderTextColor="#999"
                value={formData.phone}
                onChangeText={(text) => updateFormData('phone', text)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Gender</Text>
            <View style={styles.pickerContainer}>
              <MaterialCommunityIcons name="gender-male-female" size={20} color="#667eea" />
              <Picker
                selectedValue={formData.gender}
                onValueChange={(value) => updateFormData('gender', value)}
                style={styles.picker}
              >
                <Picker.Item label="Select Gender" value="" />
                <Picker.Item label="Male" value="male" />
                <Picker.Item label="Female" value="female" />
                <Picker.Item label="Other" value="other" />
                <Picker.Item label="Prefer not to say" value="prefer-not-to-say" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)}>
              <MaterialCommunityIcons name="cake" size={20} color="#667eea" />
              <Text style={[styles.input, styles.dateText]}>
                {formData.dateOfBirth ? formatDate(formData.dateOfBirth) : 'Select date of birth'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#667eea" />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter your address"
                placeholderTextColor="#999"
                value={formData.address}
                onChangeText={(text) => updateFormData('address', text)}
                multiline
                numberOfLines={3}
              />
            </View>
          </View>
        </View>

        {/* Emergency Contact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-alert" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Emergency contact name"
                placeholderTextColor="#999"
                value={formData.emergencyContact.name}
                onChangeText={(text) => updateNestedField('emergencyContact', 'name', text)}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="phone-alert" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Emergency contact number"
                placeholderTextColor="#999"
                value={formData.emergencyContact.phone}
                onChangeText={(text) => updateNestedField('emergencyContact', 'phone', text)}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            {errors.emergencyPhone && <Text style={styles.errorText}>{errors.emergencyPhone}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relation</Text>
            <View style={styles.inputContainer}>
              <MaterialCommunityIcons name="account-heart" size={20} color="#667eea" />
              <TextInput
                style={styles.input}
                placeholder="Relationship (e.g., Father, Mother)"
                placeholderTextColor="#999"
                value={formData.emergencyContact.relation}
                onChangeText={(text) => updateNestedField('emergencyContact', 'relation', text)}
              />
            </View>
          </View>
        </View>

        {/* Doctor-specific fields */}
        {isDoctor && (
          <>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Professional Information</Text>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Specialization</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="stethoscope" size={20} color="#667eea" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Cardiologist, General Physician"
                    placeholderTextColor="#999"
                    value={formData.specialization}
                    onChangeText={(text) => updateFormData('specialization', text)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>License Number</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="card-account-details" size={20} color="#667eea" />
                  <TextInput
                    style={styles.input}
                    placeholder="Medical license number"
                    placeholderTextColor="#999"
                    value={formData.licenseNumber}
                    onChangeText={(text) => updateFormData('licenseNumber', text)}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Years of Experience</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="briefcase" size={20} color="#667eea" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 5"
                    placeholderTextColor="#999"
                    value={formData.experience}
                    onChangeText={(text) => updateFormData('experience', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Consultation Fee (₹)</Text>
                <View style={styles.inputContainer}>
                  <MaterialCommunityIcons name="currency-inr" size={20} color="#667eea" />
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 500"
                    placeholderTextColor="#999"
                    value={formData.consultationFee}
                    onChangeText={(text) => updateFormData('consultationFee', text)}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>

            {/* Available Hours */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Available Hours</Text>
              <Text style={styles.helperText}>Set your working hours for each day. Patients will book slots within these times.</Text>

              {DAYS.map(day => (
                <View key={day} style={styles.dayRow}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayName}>{day.charAt(0).toUpperCase() + day.slice(1)}</Text>
                    <Switch
                      value={formData.availableHours[day].available}
                      onValueChange={(val) => updateDayHours(day, 'available', val)}
                      trackColor={{ false: '#ddd', true: '#667eea' }}
                      thumbColor="#fff"
                    />
                  </View>

                  {formData.availableHours[day].available && (
                    <View style={styles.timeRow}>
                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => openTimePicker(day, 'start')}
                      >
                        <MaterialCommunityIcons name="clock-start" size={16} color="#667eea" />
                        <Text style={styles.timeText}>{formData.availableHours[day].start}</Text>
                      </TouchableOpacity>

                      <Text style={styles.timeSeparator}>to</Text>

                      <TouchableOpacity
                        style={styles.timeButton}
                        onPress={() => openTimePicker(day, 'end')}
                      >
                        <MaterialCommunityIcons name="clock-end" size={16} color="#667eea" />
                        <Text style={styles.timeText}>{formData.availableHours[day].end}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          </>
        )}

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={formData.dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={timePickerValue}
          mode="time"
          is24Hour={true}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  section: { marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 8 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 15, paddingVertical: 12, gap: 10
  },
  inputDisabled: { backgroundColor: '#f5f5f5' },
  input: { flex: 1, fontSize: 16, color: '#333' },
  disabledText: { color: '#999' },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  dateText: { paddingVertical: 0 },
  pickerContainer: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#ddd', borderRadius: 12,
    paddingHorizontal: 15, gap: 10
  },
  picker: { flex: 1, height: 50 },
  errorText: { fontSize: 12, color: '#f44336', marginTop: 5, marginLeft: 5 },
  helperText: { fontSize: 12, color: '#999', marginTop: 5, marginLeft: 5 },
  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#667eea', paddingVertical: 16, borderRadius: 12,
    marginTop: 10, gap: 8
  },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  // Available hours styles
  dayRow: {
    backgroundColor: '#fff', borderRadius: 12, padding: 15,
    marginBottom: 10, borderWidth: 1, borderColor: '#eee'
  },
  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center'
  },
  dayName: { fontSize: 15, fontWeight: '600', color: '#333' },
  timeRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 10
  },
  timeButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0f0ff', paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, borderWidth: 1, borderColor: '#667eea'
  },
  timeText: { fontSize: 15, fontWeight: '600', color: '#667eea' },
  timeSeparator: { fontSize: 14, color: '#999', fontWeight: '500' }
});

export default EditProfileScreen;