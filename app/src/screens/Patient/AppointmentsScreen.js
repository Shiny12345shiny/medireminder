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

const AppointmentsScreen = ({ navigation }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTab, setSelectedTab] = useState('upcoming');

  useEffect(() => {
    loadAppointments();
  }, [selectedTab]);

  const loadAppointments = async () => {
    setLoading(true);
    try {
      const params = {};
      
      if (selectedTab === 'upcoming') {
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
      case 'no-show':
        return 'close-circle';
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

    return (
      <TouchableOpacity
        style={styles.appointmentCard}
        onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: item._id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>Dr. {item.doctor?.name}</Text>
              <Text style={styles.specialization}>{item.doctor?.specialization}</Text>
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

          <View style={styles.appointmentDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color="#666" />
              <Text style={styles.detailText}>{formatDate(item.appointmentDate)}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
              <Text style={styles.detailText}>{item.appointmentTime}</Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons 
                name={getConsultationTypeIcon(item.consultationType)} 
                size={16} 
                color="#666" 
              />
              <Text style={styles.detailText}>
                {item.consultationType.charAt(0).toUpperCase() + item.consultationType.slice(1)}
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

          {item.fee && (
            <View style={styles.feeContainer}>
              <Text style={styles.feeLabel}>Fee:</Text>
              <Text style={styles.feeAmount}>
                ₹{item.fee.amount}
                {item.fee.isPaid && (
                  <Text style={styles.paidBadge}> • Paid</Text>
                )}
              </Text>
            </View>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons 
        name={selectedTab === 'upcoming' ? 'calendar-clock' : 'calendar-check'} 
        size={80} 
        color="#ccc" 
      />
      <Text style={styles.emptyStateTitle}>
        {selectedTab === 'upcoming' ? 'No Upcoming Appointments' : 'No Past Appointments'}
      </Text>
      <Text style={styles.emptyStateText}>
        {selectedTab === 'upcoming' 
          ? 'Book an appointment to consult with a doctor' 
          : "You haven't had any appointments yet"}
      </Text>
      {selectedTab === 'upcoming' && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => navigation.navigate('Doctors')}
        >
          <Text style={styles.emptyStateButtonText}>Find Doctors</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabContainer}>
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

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
          onPress={() => setSelectedTab('all')}
        >
          <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
            All
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

      {/* Book Appointment FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Doctors')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingBottom: 80
  },
  appointmentCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statusIndicator: {
    width: 4,
    borderRadius: 2,
    marginRight: 12
  },
  cardContent: {
    flex: 1
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12
  },
  doctorInfo: {
    flex: 1,
    marginRight: 10
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  specialization: {
    fontSize: 14,
    color: '#666'
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
  appointmentDetails: {
    gap: 8,
    marginBottom: 12
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  detailText: {
    fontSize: 14,
    color: '#666'
  },
  reasonContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginBottom: 8
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
  feeContainer: {
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333'
  },
  paidBadge: {
    fontSize: 12,
    color: '#4caf50',
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
    lineHeight: 22,
    marginBottom: 25,
    paddingHorizontal: 40
  },
  emptyStateButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8
  }
});

export default AppointmentsScreen;