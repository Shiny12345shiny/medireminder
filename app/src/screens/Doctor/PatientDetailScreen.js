import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials, formatDate, formatDateTime } from '../../utils/helpers';

const PatientDetailScreen = ({ route, navigation }) => {
  const { patientId } = route.params;

  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('info');

  useEffect(() => {
    loadPatientData();
  }, [patientId]);

  const loadPatientData = async () => {
    setLoading(true);
    try {
      const [patientResponse, appointmentsResponse] = await Promise.all([
        apiClient.get(`${API_ENDPOINTS.MY_PATIENTS}/${patientId}`),
        apiClient.get(API_ENDPOINTS.CONSULTATIONS, {
          params: { patientId }
        })
      ]);

      setPatient(patientResponse.data);
      setAppointments(appointmentsResponse.data || []);
    } catch (error) {
      console.error('Error loading patient data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderInfoTab = () => (
    <View style={styles.tabContent}>
      {/* Basic Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Basic Information</Text>
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="email" size={20} color="#667eea" />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{patient.email}</Text>
            </View>
          </View>

          {patient.phone && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="phone" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Phone</Text>
                <Text style={styles.infoValue}>{patient.phone}</Text>
              </View>
            </View>
          )}

          {patient.gender && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="gender-male-female" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Gender</Text>
                <Text style={styles.infoValue}>
                  {patient.gender.charAt(0).toUpperCase() + patient.gender.slice(1)}
                </Text>
              </View>
            </View>
          )}

          {patient.dateOfBirth && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="cake" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Date of Birth</Text>
                <Text style={styles.infoValue}>{formatDate(patient.dateOfBirth)}</Text>
              </View>
            </View>
          )}

          {patient.address && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{patient.address}</Text>
              </View>
            </View>
          )}
        </View>
      </View>

      {/* Medical History */}
      {patient.medicalHistory && patient.medicalHistory.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Medical History</Text>
          <View style={styles.card}>
            {patient.medicalHistory.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <MaterialCommunityIcons name="circle-small" size={20} color="#667eea" />
                <Text style={styles.historyText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Allergies */}
      {patient.allergies && patient.allergies.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Allergies</Text>
          <View style={styles.card}>
            {patient.allergies.map((allergy, index) => (
              <View key={index} style={styles.allergyChip}>
                <MaterialCommunityIcons name="alert-circle" size={16} color="#f44336" />
                <Text style={styles.allergyText}>{allergy}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Emergency Contact */}
      {patient.emergencyContact && patient.emergencyContact.name && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="account-alert" size={20} color="#667eea" />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Name</Text>
                <Text style={styles.infoValue}>{patient.emergencyContact.name}</Text>
              </View>
            </View>

            {patient.emergencyContact.phone && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone-alert" size={20} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{patient.emergencyContact.phone}</Text>
                </View>
              </View>
            )}

            {patient.emergencyContact.relation && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="account-heart" size={20} color="#667eea" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Relation</Text>
                  <Text style={styles.infoValue}>{patient.emergencyContact.relation}</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );

  const renderAppointmentsTab = () => (
    <View style={styles.tabContent}>
      {appointments.length > 0 ? (
        appointments.map((appointment) => (
          <TouchableOpacity
            key={appointment._id}
            style={styles.appointmentCard}
            onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment._id })}
          >
            <View style={styles.appointmentHeader}>
              <View style={styles.appointmentDate}>
                <MaterialCommunityIcons name="calendar" size={18} color="#667eea" />
                <Text style={styles.appointmentDateText}>
                  {formatDate(appointment.appointmentDate)}
                </Text>
              </View>
              <View style={[
                styles.appointmentStatus,
                { backgroundColor: getStatusColor(appointment.status) }
              ]}>
                <Text style={styles.statusText}>
                  {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                </Text>
              </View>
            </View>

            <Text style={styles.appointmentTime}>
              {appointment.appointmentTime} • {appointment.consultationType}
            </Text>

            {appointment.reason && (
              <Text style={styles.appointmentReason} numberOfLines={2}>
                {appointment.reason}
              </Text>
            )}

            {appointment.prescription && (
              <View style={styles.prescriptionBadge}>
                <MaterialCommunityIcons name="prescription" size={14} color="#4caf50" />
                <Text style={styles.prescriptionText}>Prescription Available</Text>
              </View>
            )}
          </TouchableOpacity>
        ))
      ) : (
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="calendar-blank" size={60} color="#ccc" />
          <Text style={styles.emptyStateText}>No appointments found</Text>
        </View>
      )}
    </View>
  );

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled':
        return '#2196f3';
      case 'confirmed':
        return '#4caf50';
      case 'in-progress':
        return '#ff9800';
      case 'completed':
        return '#9c27b0';
      case 'cancelled':
        return '#f44336';
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

  if (!patient) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Patient not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            {patient.profilePicture ? (
              <Image source={{ uri: patient.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(patient.name)}</Text>
              </View>
            )}
          </View>

          <Text style={styles.patientName}>{patient.name}</Text>
          
          {patient.age && (
            <Text style={styles.patientAge}>{patient.age} years old</Text>
          )}

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="calendar-check" size={20} color="#fff" />
              <Text style={styles.statText}>{appointments.length} visits</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'info' && styles.tabActive]}
          onPress={() => setSelectedTab('info')}
        >
          <Text style={[styles.tabText, selectedTab === 'info' && styles.tabTextActive]}>
            Information
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'appointments' && styles.tabActive]}
          onPress={() => setSelectedTab('appointments')}
        >
          <Text style={[styles.tabText, selectedTab === 'appointments' && styles.tabTextActive]}>
            Appointments
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'info' ? renderInfoTab() : renderAppointmentsTab()}
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
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20
  },
  headerContent: {
    alignItems: 'center'
  },
  avatarContainer: {
    marginBottom: 15
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#fff'
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff'
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#667eea'
  },
  patientName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  patientAge: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 20
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: '#667eea'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  tabTextActive: {
    color: '#667eea'
  },
  content: {
    flex: 1
  },
  tabContent: {
    paddingBottom: 30
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20
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
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6
  },
  historyText: {
    fontSize: 15,
    color: '#666',
    flex: 1
  },
  allergyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    marginBottom: 8,
    gap: 6
  },
  allergyText: {
    fontSize: 14,
    color: '#f44336',
    fontWeight: '600'
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginHorizontal: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  appointmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  appointmentDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  appointmentDateText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#667eea'
  },
  appointmentStatus: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  appointmentTime: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6
  },
  appointmentReason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 8
  },
  prescriptionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  prescriptionText: {
    fontSize: 12,
    color: '#4caf50',
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15
  }
});

export default PatientDetailScreen;