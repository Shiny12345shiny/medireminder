import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Platform,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSchedule } from '../../context/ScheduleContext';
import { formatDate } from '../../utils/helpers';

const CreateScheduleScreen = ({ navigation }) => {
  const { createSchedule } = useSchedule();

  const [formData, setFormData] = useState({
    medicineName: '',
    medicineType: 'tablet',
    dosage: {
      amount: '',
      unit: 'mg'
    },
    frequency: 'once-daily',
    timings: [{ time: '08:00', label: 'morning' }],
    duration: {
      startDate: new Date(),
      endDate: null,
      isIndefinite: true
    },
    stock: {
      totalQuantity: '',
      remainingQuantity: '',
      refillThreshold: '7'
    },
    instructions: {
      beforeFood: false,
      afterFood: false,
      withFood: false,
      emptyStomach: false,
      specialInstructions: ''
    },
    identification: {
      color: '',
      shape: ''
    }
  });

  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [selectedTimingIndex, setSelectedTimingIndex] = useState(0);
  const [loading, setLoading] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const updateNestedField = (parent, field, value) => {
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value
      }
    }));
  };

  const handleFrequencyChange = (frequency) => {
    let timings = [];
    switch (frequency) {
      case 'once-daily':
        timings = [{ time: '08:00', label: 'morning' }];
        break;
      case 'twice-daily':
        timings = [
          { time: '08:00', label: 'morning' },
          { time: '20:00', label: 'night' }
        ];
        break;
      case 'thrice-daily':
        timings = [
          { time: '08:00', label: 'morning' },
          { time: '14:00', label: 'afternoon' },
          { time: '20:00', label: 'night' }
        ];
        break;
      case 'four-times-daily':
        timings = [
          { time: '08:00', label: 'morning' },
          { time: '12:00', label: 'noon' },
          { time: '16:00', label: 'evening' },
          { time: '20:00', label: 'night' }
        ];
        break;
      default:
        timings = [{ time: '08:00', label: 'custom' }];
    }
    updateFormData('frequency', frequency);
    updateFormData('timings', timings);
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      const timeString = `${hours}:${minutes}`;

      const newTimings = [...formData.timings];
      newTimings[selectedTimingIndex].time = timeString;
      updateFormData('timings', newTimings);
    }
  };

  const addTiming = () => {
    updateFormData('timings', [
      ...formData.timings,
      { time: '12:00', label: 'custom' }
    ]);
  };

  const removeTiming = (index) => {
    if (formData.timings.length > 1) {
      const newTimings = formData.timings.filter((_, i) => i !== index);
      updateFormData('timings', newTimings);
    }
  };

  const validateForm = () => {
    if (!formData.medicineName.trim()) {
      Alert.alert('Validation Error', 'Please enter medicine name');
      return false;
    }

    if (!formData.dosage.amount || parseFloat(formData.dosage.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid dosage amount');
      return false;
    }

    if (!formData.stock.totalQuantity || parseFloat(formData.stock.totalQuantity) <= 0) {
      Alert.alert('Validation Error', 'Please enter valid stock quantity');
      return false;
    }

    if (formData.timings.length === 0) {
      Alert.alert('Validation Error', 'Please add at least one timing');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);

    const scheduleData = {
      ...formData,
      dosage: {
        amount: parseFloat(formData.dosage.amount),
        unit: formData.dosage.unit
      },
      stock: {
        totalQuantity: parseFloat(formData.stock.totalQuantity),
        remainingQuantity: parseFloat(formData.stock.totalQuantity),
        refillThreshold: parseInt(formData.stock.refillThreshold)
      }
    };

    const result = await createSchedule(scheduleData);
    setLoading(false);

    if (result.success) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Medicine Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medicine Information</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medicine Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter medicine name"
              placeholderTextColor="#999"
              value={formData.medicineName}
              onChangeText={(text) => updateFormData('medicineName', text)}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medicine Type</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.medicineType}
                onValueChange={(value) => updateFormData('medicineType', value)}
                style={styles.picker}
              >
                <Picker.Item label="Tablet" value="tablet" />
                <Picker.Item label="Capsule" value="capsule" />
                <Picker.Item label="Syrup" value="syrup" />
                <Picker.Item label="Injection" value="injection" />
                <Picker.Item label="Drops" value="drops" />
                <Picker.Item label="Inhaler" value="inhaler" />
                <Picker.Item label="Ointment" value="ointment" />
                <Picker.Item label="Other" value="other" />
              </Picker>
            </View>
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Dosage Amount *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 500"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.dosage.amount}
                onChangeText={(text) => updateNestedField('dosage', 'amount', text)}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Unit</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.dosage.unit}
                  onValueChange={(value) => updateNestedField('dosage', 'unit', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="mg" value="mg" />
                  <Picker.Item label="ml" value="ml" />
                  <Picker.Item label="mcg" value="mcg" />
                  <Picker.Item label="g" value="g" />
                  <Picker.Item label="IU" value="IU" />
                  <Picker.Item label="tablet(s)" value="tablet" />
                  <Picker.Item label="capsule(s)" value="capsule" />
                  <Picker.Item label="drop(s)" value="drop" />
                  <Picker.Item label="puff(s)" value="puff" />
                </Picker>
              </View>
            </View>
          </View>
        </View>

        {/* Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Schedule</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Frequency</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.frequency}
                onValueChange={handleFrequencyChange}
                style={styles.picker}
              >
                <Picker.Item label="Once Daily" value="once-daily" />
                <Picker.Item label="Twice Daily" value="twice-daily" />
                <Picker.Item label="Thrice Daily" value="thrice-daily" />
                <Picker.Item label="Four Times Daily" value="four-times-daily" />
                <Picker.Item label="As Needed" value="as-needed" />
                <Picker.Item label="Custom" value="custom" />
              </Picker>
            </View>
          </View>

          <View style={styles.inputGroup}>
            <View style={styles.labelRow}>
              <Text style={styles.label}>Timings</Text>
              {formData.frequency === 'custom' && (
                <TouchableOpacity onPress={addTiming} style={styles.addButton}>
                  <MaterialCommunityIcons name="plus" size={18} color="#667eea" />
                  <Text style={styles.addButtonText}>Add Time</Text>
                </TouchableOpacity>
              )}
            </View>

            {formData.timings.map((timing, index) => (
              <View key={index} style={styles.timingRow}>
                <TouchableOpacity
                  style={styles.timeInput}
                  onPress={() => {
                    setSelectedTimingIndex(index);
                    setShowTimePicker(true);
                  }}
                >
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#667eea" />
                  <Text style={styles.timeText}>{timing.time}</Text>
                </TouchableOpacity>

                <View style={[styles.pickerContainer, { flex: 1 }]}>
                  <Picker
                    selectedValue={timing.label}
                    onValueChange={(value) => {
                      const newTimings = [...formData.timings];
                      newTimings[index].label = value;
                      updateFormData('timings', newTimings);
                    }}
                    style={styles.picker}
                  >
                    <Picker.Item label="Morning" value="morning" />
                    <Picker.Item label="Afternoon" value="afternoon" />
                    <Picker.Item label="Evening" value="evening" />
                    <Picker.Item label="Night" value="night" />
                    <Picker.Item label="Before Bed" value="before-bed" />
                    <Picker.Item label="Custom" value="custom" />
                  </Picker>
                </View>

                {formData.timings.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeTiming(index)}
                  >
                    <MaterialCommunityIcons name="close" size={20} color="#f44336" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
          </View>
        </View>

        {/* Duration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Duration</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Start Date</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowStartDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color="#667eea" />
              <Text style={styles.dateText}>{formatDate(formData.duration.startDate)}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Indefinite Duration</Text>
            <Switch
              value={formData.duration.isIndefinite}
              onValueChange={(value) => updateNestedField('duration', 'isIndefinite', value)}
              trackColor={{ false: '#ccc', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          {!formData.duration.isIndefinite && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>End Date</Text>
              <TouchableOpacity
                style={styles.dateInput}
                onPress={() => setShowEndDatePicker(true)}
              >
                <MaterialCommunityIcons name="calendar" size={20} color="#667eea" />
                <Text style={styles.dateText}>
                  {formData.duration.endDate
                    ? formatDate(formData.duration.endDate)
                    : 'Select end date'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Stock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Stock Information</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Total Quantity *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., 30"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.stock.totalQuantity}
                onChangeText={(text) => updateNestedField('stock', 'totalQuantity', text)}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Refill Alert (days)</Text>
              <TextInput
                style={styles.input}
                placeholder="7"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={formData.stock.refillThreshold}
                onChangeText={(text) => updateNestedField('stock', 'refillThreshold', text)}
              />
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Instructions</Text>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Before Food</Text>
            <Switch
              value={formData.instructions.beforeFood}
              onValueChange={(value) => updateNestedField('instructions', 'beforeFood', value)}
              trackColor={{ false: '#ccc', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>After Food</Text>
            <Switch
              value={formData.instructions.afterFood}
              onValueChange={(value) => updateNestedField('instructions', 'afterFood', value)}
              trackColor={{ false: '#ccc', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>With Food</Text>
            <Switch
              value={formData.instructions.withFood}
              onValueChange={(value) => updateNestedField('instructions', 'withFood', value)}
              trackColor={{ false: '#ccc', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.switchRow}>
            <Text style={styles.label}>Empty Stomach</Text>
            <Switch
              value={formData.instructions.emptyStomach}
              onValueChange={(value) => updateNestedField('instructions', 'emptyStomach', value)}
              trackColor={{ false: '#ccc', true: '#667eea' }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Special Instructions</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special instructions..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              value={formData.instructions.specialInstructions}
              onChangeText={(text) => updateNestedField('instructions', 'specialInstructions', text)}
            />
          </View>
        </View>

        {/* Identification (Optional) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Identification (Optional)</Text>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
              <Text style={styles.label}>Color</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., White"
                placeholderTextColor="#999"
                value={formData.identification.color}
                onChangeText={(text) => updateNestedField('identification', 'color', text)}
              />
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Shape</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Round"
                placeholderTextColor="#999"
                value={formData.identification.shape}
                onChangeText={(text) => updateNestedField('identification', 'shape', text)}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, loading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitButtonText}>
            {loading ? 'Creating...' : 'Create Schedule'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date/Time Pickers */}
      {showStartDatePicker && (
        <DateTimePicker
          value={formData.duration.startDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowStartDatePicker(false);
            if (date) updateNestedField('duration', 'startDate', date);
          }}
          minimumDate={new Date()}
        />
      )}

      {showEndDatePicker && (
        <DateTimePicker
          value={formData.duration.endDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            setShowEndDatePicker(false);
            if (date) updateNestedField('duration', 'endDate', date);
          }}
          minimumDate={formData.duration.startDate}
        />
      )}

      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
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
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40
  },
  section: {
    marginBottom: 25
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15
  },
  inputGroup: {
    marginBottom: 15
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
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
    height: 80,
    textAlignVertical: 'top'
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
  row: {
    flexDirection: 'row'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginBottom: 10
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
  timingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    gap: 10,
    minWidth: 120
  },
  timeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600'
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  addButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffebee',
    alignItems: 'center',
    justifyContent: 'center'
  },
  submitButton: {
    backgroundColor: '#667eea',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold'
  }
});

export default CreateScheduleScreen;