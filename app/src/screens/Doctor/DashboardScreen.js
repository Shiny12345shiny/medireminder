import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient, isLogoutCancel } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate, formatTime, getInitials } from '../../utils/helpers';

const { width } = Dimensions.get('window');

const DoctorDashboardScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const isAuthenticatedRef = useRef(isAuthenticated);

  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);

  const [stats, setStats] = useState({
    todayAppointments: 0,
    upcomingAppointments: 0,
    totalPatients: 0,
    completedToday: 0
  });

  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (isAuthenticatedRef.current) {
      loadDashboardData();
    }
  }, [isAuthenticated]);

  const loadDashboardData = async () => {
    if (!isAuthenticatedRef.current) return;
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadTodayAppointments()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_STATS(user._id));
      const data = response.data || response;
      setStats({
        todayAppointments: data.totalAppointments || 0,
        upcomingAppointments: data.upcomingAppointments || 0,
        totalPatients: data.totalPatients || 0,
        completedToday: data.completedAppointments || 0
      });
    } catch (error) {
      if (isLogoutCancel(error)) return;
      console.error('Error loading stats:', error);
    }
  };

  const loadTodayAppointments = async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.CONSULTATIONS, {
        params: {
          date: new Date().toISOString().split('T')[0]
        }
      });
      setTodayAppointments(response.data?.slice(0, 5) || []);
    } catch (error) {
      if (isLogoutCancel(error)) return;
      console.error('Error loading appointments:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

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
          <View>
            <Text style={styles.greeting}>Welcome back,</Text>
            <Text style={styles.userName}>Dr. {user?.name}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate('Profile')}
          >
            {user?.profilePicture ? (
              <Image source={{ uri: user.profilePicture }} style={styles.profileImage} />
            ) : (
              <View style={styles.profilePlaceholder}>
                <Text style={styles.profileInitials}>{getInitials(user?.name)}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
              <MaterialCommunityIcons name="calendar-today" size={24} color="#2196f3" />
            </View>
            <Text style={styles.statValue}>{stats.todayAppointments}</Text>
            <Text style={styles.statLabel}>Today's Appointments</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#f3e5f5' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#9c27b0" />
            </View>
            <Text style={styles.statValue}>{stats.upcomingAppointments}</Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="account-group" size={24} color="#4caf50" />
            </View>
            <Text style={styles.statValue}>{stats.totalPatients}</Text>
            <Text style={styles.statLabel}>Total Patients</Text>
          </View>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#ff9800" />
            </View>
            <Text style={styles.statValue}>{stats.completedToday}</Text>
            <Text style={styles.statLabel}>Completed Today</Text>
          </View>
        </View>

        {/* Today's Appointments */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Today's Schedule</Text>
            <TouchableOpacity onPress={() => navigation.navigate('DoctorAppointments')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {todayAppointments.length > 0 ? (
            todayAppointments.map((appointment) => (
              <TouchableOpacity
                key={appointment._id}
                style={styles.appointmentCard}
                onPress={() => navigation.navigate('AppointmentDetail', { appointmentId: appointment._id })}
              >
                <View style={styles.appointmentTime}>
                  <MaterialCommunityIcons name="clock-outline" size={20} color="#667eea" />
                  <Text style={styles.timeText}>{appointment.appointmentTime}</Text>
                </View>

                <View style={styles.appointmentInfo}>
                  <Text style={styles.patientName}>{appointment.patient?.name}</Text>
                  <View style={styles.appointmentMeta}>
                    <MaterialCommunityIcons
                      name={
                        appointment.consultationType === 'video' ? 'video' :
                        appointment.consultationType === 'audio' ? 'phone' :
                        appointment.consultationType === 'chat' ? 'message' :
                        'hospital-building'
                      }
                      size={14}
                      color="#666"
                    />
                    <Text style={styles.metaText}>
                      {appointment.consultationType.charAt(0).toUpperCase() + 
                       appointment.consultationType.slice(1)}
                    </Text>
                  </View>
                  {appointment.reason && (
                    <Text style={styles.reasonText} numberOfLines={1}>
                      {appointment.reason}
                    </Text>
                  )}
                </View>

                <View style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(appointment.status) }
                ]}>
                  <Text style={styles.statusText}>
                    {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="calendar-blank" size={60} color="#ccc" />
              <Text style={styles.emptyStateText}>No appointments scheduled for today</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('DoctorAppointments')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="calendar-clock" size={32} color="#fff" />
                <Text style={styles.actionText}>View Appointments</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('DoctorPatients')}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="account-group" size={32} color="#fff" />
                <Text style={styles.actionText}>My Patients</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={['#f2994a', '#f2c94c']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="account-edit" size={32} color="#fff" />
                <Text style={styles.actionText}>Edit Profile</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Settings')}
            >
              <LinearGradient
                colors={['#56ab2f', '#a8e063']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="cog" size={32} color="#fff" />
                <Text style={styles.actionText}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  header: {
    paddingTop: 50,
    paddingBottom: 30,
    paddingHorizontal: 20
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  greeting: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 5
  },
  profileButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  profileImage: {
    width: '100%',
    height: '100%'
  },
  profilePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  profileInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#667eea'
  },
  content: {
    flex: 1
  },
  contentContainer: {
    padding: 20,
    paddingTop: 10
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 20,
    gap: 12
  },
  statCard: {
    width: (width - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center'
  },
  section: {
    marginBottom: 25
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
  },
  seeAll: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
  },
  appointmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  appointmentTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10
  },
  timeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#667eea'
  },
  appointmentInfo: {
    marginBottom: 10
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6
  },
  appointmentMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  metaText: {
    fontSize: 13,
    color: '#666'
  },
  reasonText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic'
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999',
    marginTop: 15
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  actionCard: {
    width: (width - 52) / 2,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  actionGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 8,
    textAlign: 'center'
  }
});

export default DoctorDashboardScreen;