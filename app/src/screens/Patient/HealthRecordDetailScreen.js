import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate, formatDateTime } from '../../utils/helpers';

const HealthRecordDetailScreen = ({ route, navigation }) => {
  const { recordId } = route.params;

  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecord();
  }, [recordId]);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId));
      setRecord(response.data);
    } catch (error) {
      console.error('Error loading health record:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this health record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId));
              navigation.goBack();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete record');
            }
          }
        }
      ]
    );
  };

  const handleToggleFavorite = async () => {
    try {
      await apiClient.post(`${API_ENDPOINTS.HEALTH_RECORD_DETAIL(recordId)}/favorite`);
      await loadRecord();
    } catch (error) {
      Alert.alert('Error', 'Failed to update favorite status');
    }
  };

  const handleDownloadFile = (fileUrl) => {
    if (fileUrl) {
      Linking.openURL(fileUrl);
    }
  };

  const getRecordTypeIcon = (type) => {
    switch (type) {
      case 'prescription':
        return 'pill';
      case 'lab-report':
        return 'test-tube';
      case 'imaging':
        return 'image-filter-hdr';
      case 'vaccination':
        return 'needle';
      case 'surgery':
        return 'hospital-box';
      case 'vital-signs':
        return 'heart-pulse';
      case 'insurance':
        return 'shield-check';
      default:
        return 'file-document';
    }
  };

  const getRecordTypeColor = (type) => {
    switch (type) {
      case 'prescription':
        return '#667eea';
      case 'lab-report':
        return '#4caf50';
      case 'imaging':
        return '#2196f3';
      case 'vaccination':
        return '#ff9800';
      case 'surgery':
        return '#f44336';
      case 'vital-signs':
        return '#e91e63';
      case 'insurance':
        return '#9c27b0';
      default:
        return '#666';
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!record) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Record not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const typeColor = getRecordTypeColor(record.recordType);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header Card */}
        <LinearGradient
          colors={[typeColor, '#764ba2']}
          style={styles.headerCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.headerContent}>
            <MaterialCommunityIcons
              name={getRecordTypeIcon(record.recordType)}
              size={48}
              color="#fff"
            />
            <Text style={styles.recordTitle}>{record.title}</Text>
            <View style={styles.typeBadge}>
              <Text style={styles.typeText}>
                {record.recordType.replace('-', ' ').toUpperCase()}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.favoriteButton}
            onPress={handleToggleFavorite}
          >
            <MaterialCommunityIcons
              name={record.isFavorite ? 'star' : 'star-outline'}
              size={24}
              color="#fff"
            />
          </TouchableOpacity>
        </LinearGradient>

        {/* Basic Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Basic Information</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={24} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date</Text>
                <Text style={styles.infoValue}>{formatDate(record.date)}</Text>
              </View>
            </View>

            {record.doctor && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="doctor" size={24} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Doctor</Text>
                  <Text style={styles.infoValue}>Dr. {record.doctor.name}</Text>
                  {record.doctor.specialization && (
                    <Text style={styles.infoSubtext}>{record.doctor.specialization}</Text>
                  )}
                </View>
              </View>
            )}

            {record.hospital && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="hospital-building" size={24} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Hospital/Clinic</Text>
                  <Text style={styles.infoValue}>{record.hospital}</Text>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        {record.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <View style={styles.card}>
              <Text style={styles.descriptionText}>{record.description}</Text>
            </View>
          </View>
        )}

        {/* Type-Specific Data */}
        {record.recordType === 'prescription' && record.prescription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Prescription Details</Text>
            <View style={styles.card}>
              {record.prescription.medicines && record.prescription.medicines.length > 0 && (
                <View style={styles.dataSection}>
                  <Text style={styles.dataLabel}>Medicines:</Text>
                  {record.prescription.medicines.map((med, index) => (
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

              {record.prescription.diagnosis && (
                <View style={styles.dataSection}>
                  <Text style={styles.dataLabel}>Diagnosis:</Text>
                  <Text style={styles.dataText}>{record.prescription.diagnosis}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {record.recordType === 'lab-report' && record.labReport && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lab Report Details</Text>
            <View style={styles.card}>
              {record.labReport.testName && (
                <View style={styles.dataSection}>
                  <Text style={styles.dataLabel}>Test Name:</Text>
                  <Text style={styles.dataText}>{record.labReport.testName}</Text>
                </View>
              )}

              {record.labReport.results && record.labReport.results.length > 0 && (
                <View style={styles.dataSection}>
                  <Text style={styles.dataLabel}>Results:</Text>
                  {record.labReport.results.map((result, index) => (
                    <View key={index} style={styles.resultItem}>
                      <Text style={styles.resultParameter}>{result.parameter}</Text>
                      <View style={styles.resultValues}>
                        <Text style={styles.resultValue}>{result.value}</Text>
                        {result.normalRange && (
                          <Text style={styles.resultRange}>
                            Normal: {result.normalRange}
                          </Text>
                        )}
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        )}

        {record.recordType === 'vital-signs' && record.vitalSigns && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Vital Signs</Text>
            <View style={styles.card}>
              {record.vitalSigns.bloodPressure && (
                <View style={styles.vitalItem}>
                  <MaterialCommunityIcons name="heart-pulse" size={20} color="#667eea" />
                  <Text style={styles.vitalLabel}>Blood Pressure:</Text>
                  <Text style={styles.vitalValue}>
                    {record.vitalSigns.bloodPressure.systolic}/
                    {record.vitalSigns.bloodPressure.diastolic} mmHg
                  </Text>
                </View>
              )}

              {record.vitalSigns.heartRate && (
                <View style={styles.vitalItem}>
                  <MaterialCommunityIcons name="heart" size={20} color="#667eea" />
                  <Text style={styles.vitalLabel}>Heart Rate:</Text>
                  <Text style={styles.vitalValue}>{record.vitalSigns.heartRate} bpm</Text>
                </View>
              )}

              {record.vitalSigns.temperature && (
                <View style={styles.vitalItem}>
                  <MaterialCommunityIcons name="thermometer" size={20} color="#667eea" />
                  <Text style={styles.vitalLabel}>Temperature:</Text>
                  <Text style={styles.vitalValue}>{record.vitalSigns.temperature}°F</Text>
                </View>
              )}

              {record.vitalSigns.weight && (
                <View style={styles.vitalItem}>
                  <MaterialCommunityIcons name="weight-kilogram" size={20} color="#667eea" />
                  <Text style={styles.vitalLabel}>Weight:</Text>
                  <Text style={styles.vitalValue}>{record.vitalSigns.weight} kg</Text>
                </View>
              )}

              {record.vitalSigns.height && (
                <View style={styles.vitalItem}>
                  <MaterialCommunityIcons name="human-male-height" size={20} color="#667eea" />
                  <Text style={styles.vitalLabel}>Height:</Text>
                  <Text style={styles.vitalValue}>{record.vitalSigns.height} cm</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Files */}
        {record.files && record.files.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Attachments</Text>
            {record.files.map((file, index) => (
              <TouchableOpacity
                key={index}
                style={styles.fileCard}
                onPress={() => handleDownloadFile(file.url)}
              >
                <View style={styles.fileIcon}>
                  <MaterialCommunityIcons
                    name={file.fileType?.includes('image') ? 'image' : 'file-document'}
                    size={32}
                    color="#667eea"
                  />
                </View>
                <View style={styles.fileInfo}>
                  <Text style={styles.fileName}>{file.fileName}</Text>
                  {file.fileSize && (
                    <Text style={styles.fileSize}>
                      {(file.fileSize / 1024).toFixed(2)} KB
                    </Text>
                  )}
                </View>
                <MaterialCommunityIcons name="download" size={24} color="#667eea" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tags */}
        {record.tags && record.tags.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {record.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Metadata */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Record Information</Text>
          <View style={styles.card}>
            <View style={styles.metadataRow}>
              <Text style={styles.metadataLabel}>Created:</Text>
              <Text style={styles.metadataValue}>{formatDateTime(record.createdAt)}</Text>
            </View>
            {record.updatedAt && record.updatedAt !== record.createdAt && (
              <View style={styles.metadataRow}>
                <Text style={styles.metadataLabel}>Last Updated:</Text>
                <Text style={styles.metadataValue}>{formatDateTime(record.updatedAt)}</Text>
              </View>
            )}
            {record.isArchived && (
              <View style={styles.archivedBadge}>
                <MaterialCommunityIcons name="archive" size={16} color="#ff9800" />
                <Text style={styles.archivedText}>Archived</Text>
              </View>
            )}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.editButton]}
            onPress={() => navigation.navigate('EditHealthRecord', { recordId: record._id })}
          >
            <MaterialCommunityIcons name="pencil" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Edit</Text>
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
    elevation: 3,
    position: 'relative'
  },
  headerContent: {
    alignItems: 'center'
  },
  recordTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 15,
    marginBottom: 10,
    textAlign: 'center'
  },
  typeBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20
  },
  typeText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '700',
    letterSpacing: 1
  },
  favoriteButton: {
    position: 'absolute',
    top: 15,
    right: 15,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center'
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
    gap: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
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
  infoSubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 2
  },
  descriptionText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22
  },
  dataSection: {
    marginBottom: 15
  },
  dataLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8
  },
  dataText: {
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
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  resultParameter: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1
  },
  resultValues: {
    alignItems: 'flex-end'
  },
  resultValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#667eea'
  },
  resultRange: {
    fontSize: 12,
    color: '#999',
    marginTop: 2
  },
  vitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  vitalLabel: {
    flex: 1,
    fontSize: 14,
    color: '#666'
  },
  vitalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  fileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 12
  },
  fileIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fileInfo: {
    flex: 1
  },
  fileName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  fileSize: {
    fontSize: 13,
    color: '#999'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  tag: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16
  },
  tagText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '600'
  },
  metadataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  metadataLabel: {
    fontSize: 14,
    color: '#666'
  },
  metadataValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600'
  },
  archivedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
    gap: 6
  },
  archivedText: {
    fontSize: 13,
    color: '#ff9800',
    fontWeight: '600'
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
  deleteButton: {
    backgroundColor: '#f44336'
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600'
  }
});

export default HealthRecordDetailScreen;