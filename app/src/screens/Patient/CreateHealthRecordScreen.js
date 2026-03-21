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
  Platform
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate } from '../../utils/helpers';

const CreateHealthRecordScreen = ({ navigation }) => {
  const [formData, setFormData] = useState({
    title: '',
    recordType: 'prescription',
    date: new Date(),
    description: '',
    hospital: '',
    tags: []
  });

  const [tagInput, setTagInput] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploading, setUploading] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      updateFormData('tags', [...formData.tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    const newTags = formData.tags.filter((_, i) => i !== index);
    updateFormData('tags', newTags);
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      updateFormData('date', selectedDate);
    }
  };

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        multiple: true,
        copyToCacheDirectory: true
      });

      // Support both old API (result.type === 'success') and new Expo API (result.assets)
      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedFiles(prev => [...prev, ...result.assets]);
      } else if (result.type === 'success') {
        setSelectedFiles(prev => [...prev, result]);
      }
    } catch (error) {
      console.error('Error picking files:', error);
      Alert.alert('Error', 'Failed to pick files');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      Alert.alert('Required', 'Please enter a title');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setUploading(true);
    try {
      const submitData = new FormData();
      
      submitData.append('title', formData.title);
      submitData.append('recordType', formData.recordType);
      submitData.append('recordDate', formData.date.toISOString());
      
      if (formData.description) {
        submitData.append('description', formData.description);
      }
      
      if (formData.hospital) {
        submitData.append('hospital', formData.hospital);
      }
      
      if (formData.tags.length > 0) {
        formData.tags.forEach(tag => submitData.append('tags[]', tag));
      }

      // Add files
      selectedFiles.forEach((file, index) => {
        submitData.append('files', {
          uri: file.uri,
          type: file.mimeType || 'application/octet-stream',
          name: file.name
        });
      });

      await apiClient.post(API_ENDPOINTS.HEALTH_RECORDS, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      Alert.alert(
        'Success',
        'Health record created successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error creating health record:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to create health record'
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Title *</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter record title..."
            placeholderTextColor="#999"
            value={formData.title}
            onChangeText={(text) => updateFormData('title', text)}
          />
        </View>

        {/* Record Type */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Type</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={formData.recordType}
              onValueChange={(value) => updateFormData('recordType', value)}
              style={styles.picker}
            >
              <Picker.Item label="Prescription" value="prescription" />
              <Picker.Item label="Lab Report" value="lab-report" />
              <Picker.Item label="Imaging" value="imaging" />
              <Picker.Item label="Vaccination" value="vaccination" />
              <Picker.Item label="Surgery" value="surgery" />
              <Picker.Item label="Vital Signs" value="vital-signs" />
              <Picker.Item label="Insurance" value="insurance" />
            </Picker>
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Date</Text>
          <TouchableOpacity
            style={styles.dateInput}
            onPress={() => setShowDatePicker(true)}
          >
            <MaterialCommunityIcons name="calendar" size={24} color="#667eea" />
            <Text style={styles.dateText}>{formatDate(formData.date)}</Text>
          </TouchableOpacity>
        </View>

        {/* Hospital/Clinic */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hospital/Clinic (Optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter hospital or clinic name..."
            placeholderTextColor="#999"
            value={formData.hospital}
            onChangeText={(text) => updateFormData('hospital', text)}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description (Optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Add details about this record..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
            value={formData.description}
            onChangeText={(text) => updateFormData('description', text)}
          />
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags (Optional)</Text>
          <View style={styles.tagInputContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Add tag..."
              placeholderTextColor="#999"
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={addTag}
            />
            <TouchableOpacity style={styles.addButton} onPress={addTag}>
              <MaterialCommunityIcons name="plus" size={24} color="#667eea" />
            </TouchableOpacity>
          </View>

          {formData.tags.length > 0 && (
            <View style={styles.tagsList}>
              {formData.tags.map((tag, index) => (
                <View key={index} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                  <TouchableOpacity onPress={() => removeTag(index)}>
                    <MaterialCommunityIcons name="close-circle" size={18} color="#667eea" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Files */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            <TouchableOpacity style={styles.pickButton} onPress={pickFiles}>
              <MaterialCommunityIcons name="paperclip" size={20} color="#667eea" />
              <Text style={styles.pickButtonText}>Add Files</Text>
            </TouchableOpacity>
          </View>

          {selectedFiles.length > 0 && (
            <View style={styles.filesList}>
              {selectedFiles.map((file, index) => (
                <View key={index} style={styles.fileItem}>
                  <MaterialCommunityIcons
                    name="file-document"
                    size={24}
                    color="#667eea"
                  />
                  <View style={styles.fileInfo}>
                    <Text style={styles.fileName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    {file.size && (
                      <Text style={styles.fileSize}>
                        {(file.size / 1024).toFixed(2)} KB
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity onPress={() => removeFile(index)}>
                    <MaterialCommunityIcons name="close-circle" size={24} color="#f44336" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.submitButtonText}>Create Record</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={formData.date}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12
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
  tagInputContainer: {
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
  tagsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6
  },
  tagText: {
    fontSize: 14,
    color: '#667eea'
  },
  pickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4
  },
  pickButtonText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
  },
  filesList: {
    gap: 10
  },
  fileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    gap: 10
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  fileSize: {
    fontSize: 12,
    color: '#999'
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 10,
    gap: 8
  },
  submitButtonDisabled: {
    opacity: 0.6
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default CreateHealthRecordScreen;