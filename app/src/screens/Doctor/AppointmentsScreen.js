import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate, formatTime, getStatusColor } from '../../utils/helpers';
import { colors } from '../../constants/theme';

const DoctorAppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('today');

  useEffect(() => {
    loadAppointments();
  }, [selectedTab]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (selectedTab === 'today') {
        params.date = new Date().toISOString().split('T')[0];
      } else if (selectedTab === 'upcoming') {
        params.upcoming = true;
      } else if (selectedTab === 'past') {
        params.past = true;
      }

      const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS, { params });
      setAppointments(response.data || []);
    } catch (error) {
      console.error('Error loading appointments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadAppointments();
    setRefreshing(false);
  };

  const handleConfirm = async (appointmentId) => {
    try {
      await apiClient.put(API_ENDPOINTS.CONFIRM_APPOINTMENT(appointmentId));
      await loadAppointments();
    } catch (error) {
      console.error('Error confirming appointment:', error);
    }
  };

  const handleStart = async (appointmentId) => {
    try {
      await apiClient.put(API_ENDPOINTS.START_APPOINTMENT(appointmentId));
      navigation.navigate('AppointmentDetail', { appointmentId });
    } catch (error) {
      console.error('Error starting appointment:', error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled':
        return 'calendar-clock';
      case 'confirmed':
        return 'calendar-check';
      case 'in-progress':
        return 'progress-clock';
      case 'completed':
        return 'check-circle';
      case 'cancelled':
        return 'cancel';
      default:
        return 'calendar';
    }
  };

  const getConsultationTypeIcon = (type) => {
    switch (type) {
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

  const renderAppointmentCard = ({ item }) => {
    const statusColor = getStatusColor(item.status, colors);
    const canConfirm = item.status === 'scheduled';
    const canStart = item.status === 'confirmed';

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item._id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.appointmentTime}>
              <MaterialCommunityIcons name="clock-outline" size={18} color="#667eea" />
              <Text style={styles.timeText}>{item.appointmentTime}</Text>
              <Text style={styles.dateText}>{formatDate(item.appointmentDate)}</Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <MaterialCommunityIcons 
                name={getStatusIcon(item.status)} 
                size={14} 
                color="#fff" 
              />
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.patientInfo}>
            <Text style={styles.patientName}>{item.patient?.name}</Text>
            <View style={styles.patientMeta}>
              <MaterialCommunityIcons
                name={getConsultationTypeIcon(item.consultationType)}
                size={14}
                color="#666"
              />
              <Text style={styles.metaText}>
                {item.consultationType.charAt(0).toUpperCase() + 
                 item.consultationType.slice(1)}
              </Text>
            </View>
          </View>

          {item.reason && (
            <View style={styles.reasonContainer}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText} numberOfLines={2}>
                {item.reason}
              </Text>
            </View>
          )}

          {item.symptoms && item.symptoms.length > 0 && (
            <View style={styles.symptomsContainer}>
              <Text style={styles.symptomsLabel}>Symptoms:</Text>
              <View style={styles.symptomsList}>
                {item.symptoms.slice(0, 3).map((symptom, index) => (
                  <View key={index} style={styles.symptomChip}>
                    <Text style={styles.symptomText}>{symptom}</Text>
                  </View>
                ))}
                {item.symptoms.length > 3 && (
                  <Text style={styles.moreSymptoms}>+{item.symptoms.length - 3}</Text>
                )}
              </View>
            </View>
          )}

          {(canConfirm || canStart) && (
            <View style={styles.actionButtons}>
              {canConfirm && (
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => handleConfirm(item._id)}
                >
                  <MaterialCommunityIcons name="check" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Confirm</Text>
                </TouchableOpacity>
              )}

              {canStart && (
                <TouchableOpacity
                  style={styles.startButton}
                  onPress={() => handleStart(item._id)}
                >
                  <MaterialCommunityIcons name="play" size={18} color="#fff" />
                  <Text style={styles.buttonText}>Start</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={selectedTab === 'today' ? 'calendar-today' : 'calendar-blank'} 
        size={80} 
        color="#ccc" 
      />
      <Text style={styles.emptyStateTitle}>
        {selectedTab === 'today' ? 'No Appointments Today' : 
         selectedTab === 'upcoming' ? 'No Upcoming Appointments' : 
         'No Past Appointments'}
      </Text>
      <Text style={styles.emptyStateText}>
        {selectedTab === 'today' 
          ? 'You have no appointments scheduled for today' 
          : selectedTab === 'upcoming'
          ? 'No upcoming appointments found'
          : "You haven't had any appointments yet"}
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'today' && styles.tabActive]}
          onPress={() => setSelectedTab('today')}
        >
          <Text style={[styles.tabText, selectedTab === 'today' && styles.tabTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'upcoming' && styles.tabActive]}
          onPress={() => setSelectedTab('upcoming')}
        >
          <Text style={[styles.tabText, selectedTab === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'past' && styles.tabActive]}
          onPress={() => setSelectedTab('past')}
        >
          <Text style={[styles.tabText, selectedTab === 'past' && styles.tabTextActive]}>
            Past
          </Text>
        </TouchableOpacity>
      </View>

      {/* Appointments List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={appointments}
          renderItem={renderAppointmentCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
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
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 10
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f5f5f5'
  },
  tabActive: {
    backgroundColor: '#667eea'
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666'
  },
  tabTextActive: {
    color: '#fff'
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  listContent: {
    padding: 15,
    paddingBottom: 30
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden'
  },
  statusIndicator: {
    width: 4
  },
  cardContent: {
    flex: 1,
    padding: 15
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea'
  },
  dateText: {
    fontSize: 13,
    color: '#999'
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  patientInfo: {
    marginBottom: 10
  },
  patientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  patientMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontSize: 13,
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
  symptomsContainer: {
    marginBottom: 10
  },
  symptomsLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 6
  },
  symptomsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  symptomChip: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  symptomText: {
    fontSize: 12,
    color: '#667eea'
  },
  moreSymptoms: {
    fontSize: 12,
    color: '#999'
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4caf50',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  startButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10
  },
  emptyStateText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40
  }
});

export default DoctorAppointmentsScreen;