import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Dimensions, 
  Image
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useSchedule } from '../../context/ScheduleContext';
import { apiClient, isLogoutCancel } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatTime, getInitials } from '../../utils/helpers';

const { width } = Dimensions.get('window');

const DashboardScreen = ({ navigation }) => {
  const { user, isAuthenticated } = useAuth();
  const isAuthenticatedRef = useRef(isAuthenticated);

  // Keep ref in sync with state — ref updates synchronously, state update is async
  useEffect(() => {
    isAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated]);
  const { todaySchedules, lowStockSchedules, refreshSchedules, refreshing } = useSchedule();

  const [stats, setStats] = useState({
    todayReminders: 0,
    upcomingAppointments: 0,
    adherenceRate: 0,
    lowStockMedicines: 0
  });

  const [upcomingReminders, setUpcomingReminders] = useState([]);
  const [loading, setLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticatedRef.current) {
        loadDashboardData();
      }
    }, [isAuthenticated])
  );

  // Update lowStockMedicines whenever lowStockSchedules changes
  useEffect(() => {
    setStats((prev) => ({
      ...prev,
      lowStockMedicines: lowStockSchedules?.length ?? 0,
    }));
  }, [lowStockSchedules]);

  const loadDashboardData = async () => {
    if (!isAuthenticatedRef.current) return;
    setLoading(true);
    await Promise.all([
      loadUpcomingReminders(),
      loadStats()
    ]);
    setLoading(false);
  };

  const loadUpcomingReminders = async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const response = await apiClient.get(API_ENDPOINTS.UPCOMING_REMINDERS, {
        params: { hours: 24 }
      });
      setUpcomingReminders((response.data || response || []).slice(0, 3));
    } catch (error) {
      if (isLogoutCancel(error)) return;
      console.error('Error loading upcoming reminders:', error);
    }
  };

  const loadStats = async () => {
    if (!isAuthenticatedRef.current) return;
    try {
      const [remindersResponse, appointmentsResponse, adherenceResponse, lowStockResponse] = await Promise.all([
        apiClient.get(API_ENDPOINTS.TODAY_REMINDERS),
        apiClient.get(API_ENDPOINTS.UPCOMING_APPOINTMENTS),
        apiClient.get(API_ENDPOINTS.ADHERENCE_STATS, { params: { days: 30 } }),
        apiClient.get(API_ENDPOINTS.LOW_STOCK_SCHEDULES)
      ]);

      setStats({
        todayReminders: remindersResponse?.count ?? remindersResponse?.data?.count ?? 0,
        upcomingAppointments: appointmentsResponse?.count ?? appointmentsResponse?.data?.count ?? 0,
        adherenceRate: remindersResponse?.data?.overall?.adherenceRate
          ?? adherenceResponse?.data?.overall?.adherenceRate
          ?? adherenceResponse?.overall?.adherenceRate
          ?? 0,
        lowStockMedicines: lowStockResponse?.data?.length 
          ?? lowStockResponse?.length 
          ?? lowStockSchedules?.length 
          ?? 0
      });
    } catch (error) {
      if (isLogoutCancel(error)) return;
      console.error('Error loading stats:', error);
    }
  };

  const handleRefresh = async () => {
    await refreshSchedules();
    await loadDashboardData();
  };

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
            <Text style={styles.greeting}>Hello,</Text>
            <Text style={styles.userName}>{user?.name || 'User'}</Text>
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
          <RefreshControl refreshing={refreshing || loading} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Reminders')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
              <MaterialCommunityIcons name="bell" size={24} color="#2196f3" />
            </View>
            <Text style={styles.statValue}>{stats.todayReminders}</Text>
            <Text style={styles.statLabel}>Today's Reminders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Appointments')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#f3e5f5' }]}>
              <MaterialCommunityIcons name="calendar-clock" size={24} color="#9c27b0" />
            </View>
            <Text style={styles.statValue}>{stats.upcomingAppointments}</Text>
            <Text style={styles.statLabel}>Appointments</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
              <MaterialCommunityIcons name="chart-line" size={24} color="#4caf50" />
            </View>
            <Text style={styles.statValue}>{stats.adherenceRate}%</Text>
            <Text style={styles.statLabel}>Adherence</Text>
          </View>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() => navigation.navigate('Schedules')}
          >
            <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
              <MaterialCommunityIcons name="package-variant" size={24} color="#ff9800" />
            </View>
            <Text style={styles.statValue}>{stats.lowStockMedicines}</Text>
            <Text style={styles.statLabel}>Low Stock</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming Reminders */}
        {upcomingReminders.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Upcoming Reminders</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Reminders')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {upcomingReminders.map((reminder) => (
              <TouchableOpacity
                key={reminder._id}
                style={styles.reminderCard}
                onPress={() => navigation.navigate('ReminderDetail', { reminderId: reminder._id })}
              >
                <View style={styles.reminderIcon}>
                  <MaterialCommunityIcons name="pill" size={24} color="#667eea" />
                </View>
                <View style={styles.reminderInfo}>
                  <Text style={styles.reminderMedicine}>{reminder.medicineName}</Text>
                  <Text style={styles.reminderTime}>
                    {formatTime(reminder.scheduledTime)} • {reminder.dosage?.amount} {reminder.dosage?.unit}
                  </Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateSchedule')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="plus-circle" size={32} color="#fff" />
                <Text style={styles.actionText}>Add Medicine</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Doctors')}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="doctor" size={32} color="#fff" />
                <Text style={styles.actionText}>Find Doctors</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('BookAppointment')}
            >
              <LinearGradient
                colors={['#f2994a', '#f2c94c']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="calendar-plus" size={32} color="#fff" />
                <Text style={styles.actionText}>Book Appointment</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('CreateHealthRecord')}
            >
              <LinearGradient
                colors={['#56ab2f', '#a8e063']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="file-plus" size={32} color="#fff" />
                <Text style={styles.actionText}>Add Record</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Today's Medicines */}
        {todaySchedules.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Medicines</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Schedules')}>
                <Text style={styles.seeAll}>See All</Text>
              </TouchableOpacity>
            </View>

            {todaySchedules.slice(0, 3).map((schedule) => (
              <TouchableOpacity
                key={schedule._id}
                style={styles.medicineCard}
                onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: schedule._id })}
              >
                <View style={styles.medicineInfo}>
                  <Text style={styles.medicineName}>{schedule.medicineName}</Text>
                  <Text style={styles.medicineDosage}>
                    {schedule.dosage.amount} {schedule.dosage?.unit} • {schedule.timings?.length || 0} times/day
                  </Text>
                </View>
                <View style={styles.medicineStock}>
                  <Text style={[
                    styles.stockText,
                    schedule.isLowStock && styles.stockTextLow
                  ]}>
                    {schedule.stock?.remainingQuantity ?? 0} left
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
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
  reminderCard: {
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
    elevation: 2
  },
  reminderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15
  },
  reminderInfo: {
    flex: 1
  },
  reminderMedicine: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  reminderTime: {
    fontSize: 14,
    color: '#666'
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
  },
  medicineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  medicineInfo: {
    flex: 1
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  medicineDosage: {
    fontSize: 14,
    color: '#666'
  },
  medicineStock: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#e8f5e9'
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4caf50'
  },
  stockTextLow: {
    color: '#f44336',
    backgroundColor: '#ffebee'
  }
});

export default DashboardScreen;