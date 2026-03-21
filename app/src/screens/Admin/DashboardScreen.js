import React, { useState, useEffect } from 'react';
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
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials } from '../../utils/helpers';

const { width } = Dimensions.get('window');

const AdminDashboardScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    totalUsers: 0,
    totalPatients: 0,
    totalDoctors: 0,
    totalAppointments: 0,
    todayAppointments: 0,
    activeSchedules: 0,
    pendingReminders: 0,
    completedToday: 0
  });

  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    await Promise.all([
      loadStats(),
      loadRecentUsers()
    ]);
    setLoading(false);
  };

  const loadStats = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ADMIN_STATS);
      setStats(response.data || {
        totalUsers: 0,
        totalPatients: 0,
        totalDoctors: 0,
        totalAppointments: 0,
        todayAppointments: 0,
        activeSchedules: 0,
        pendingReminders: 0,
        completedToday: 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const loadRecentUsers = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS, {
        params: { limit: 5, sort: '-createdAt' }
      });
      setRecentUsers(response.data || []);
    } catch (error) {
      console.error('Error loading recent users:', error);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return '#f44336';
      case 'doctor':
        return '#9c27b0';
      case 'patient':
        return '#4caf50';
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
            <Text style={styles.greeting}>Admin Dashboard</Text>
            <Text style={styles.userName}>Welcome, {user?.name}</Text>
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
        {/* User Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>User Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#e3f2fd' }]}>
                <MaterialCommunityIcons name="account-group" size={28} color="#2196f3" />
              </View>
              <Text style={styles.statValue}>{stats.totalUsers}</Text>
              <Text style={styles.statLabel}>Total Users</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#e8f5e9' }]}>
                <MaterialCommunityIcons name="account" size={28} color="#4caf50" />
              </View>
              <Text style={styles.statValue}>{stats.totalPatients}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#f3e5f5' }]}>
                <MaterialCommunityIcons name="doctor" size={28} color="#9c27b0" />
              </View>
              <Text style={styles.statValue}>{stats.totalDoctors}</Text>
              <Text style={styles.statLabel}>Doctors</Text>
            </View>

            <View style={styles.statCard}>
              <View style={[styles.statIconContainer, { backgroundColor: '#fff3e0' }]}>
                <MaterialCommunityIcons name="calendar-check" size={28} color="#ff9800" />
              </View>
              <Text style={styles.statValue}>{stats.totalAppointments}</Text>
              <Text style={styles.statLabel}>Appointments</Text>
            </View>
          </View>
        </View>

        {/* Activity Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Activity</Text>
          <View style={styles.activityGrid}>
            <View style={styles.activityCard}>
              <MaterialCommunityIcons name="calendar-today" size={24} color="#667eea" />
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>{stats.todayAppointments}</Text>
                <Text style={styles.activityLabel}>Appointments</Text>
              </View>
            </View>

            <View style={styles.activityCard}>
              <MaterialCommunityIcons name="pill" size={24} color="#4caf50" />
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>{stats.activeSchedules}</Text>
                <Text style={styles.activityLabel}>Active Schedules</Text>
              </View>
            </View>

            <View style={styles.activityCard}>
              <MaterialCommunityIcons name="bell" size={24} color="#ff9800" />
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>{stats.pendingReminders}</Text>
                <Text style={styles.activityLabel}>Pending Reminders</Text>
              </View>
            </View>

            <View style={styles.activityCard}>
              <MaterialCommunityIcons name="check-circle" size={24} color="#2196f3" />
              <View style={styles.activityInfo}>
                <Text style={styles.activityValue}>{stats.completedToday}</Text>
                <Text style={styles.activityLabel}>Completed</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Users */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Users</Text>
            <TouchableOpacity onPress={() => navigation.navigate('AdminUsers')}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          {recentUsers.length > 0 ? (
            recentUsers.map((userItem) => (
              <View key={userItem._id} style={styles.userCard}>
                <View style={styles.userAvatar}>
                  {userItem.profilePicture ? (
                    <Image source={{ uri: userItem.profilePicture }} style={styles.avatarImage} />
                  ) : (
                    <View style={styles.avatarPlaceholder}>
                      <Text style={styles.avatarText}>{getInitials(userItem.name)}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{userItem.name}</Text>
                  <Text style={styles.userEmail}>{userItem.email}</Text>
                </View>

                <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userItem.role) }]}>
                  <Text style={styles.roleText}>
                    {userItem.role.charAt(0).toUpperCase() + userItem.role.slice(1)}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No recent users</Text>
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <View style={styles.quickActionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AdminUsers')}
            >
              <LinearGradient
                colors={['#667eea', '#764ba2']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="account-group" size={32} color="#fff" />
                <Text style={styles.actionText}>Manage Users</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={['#4facfe', '#00f2fe']}
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
                colors={['#f2994a', '#f2c94c']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="cog" size={32} color="#fff" />
                <Text style={styles.actionText}>Settings</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => {}}
            >
              <LinearGradient
                colors={['#56ab2f', '#a8e063']}
                style={styles.actionGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="chart-bar" size={32} color="#fff" />
                <Text style={styles.actionText}>Analytics</Text>
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
    paddingTop: 10,
    paddingBottom: 40
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
    color: '#333',
    marginBottom: 15
  },
  seeAll: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center'
  },
  activityGrid: {
    gap: 12
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    gap: 15
  },
  activityInfo: {
    flex: 1
  },
  activityValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2
  },
  activityLabel: {
    fontSize: 14,
    color: '#666'
  },
  userCard: {
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
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  avatarImage: {
    width: '100%',
    height: '100%'
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  userInfo: {
    flex: 1
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  userEmail: {
    fontSize: 13,
    color: '#666'
  },
  roleBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12
  },
  roleText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderRadius: 12
  },
  emptyStateText: {
    fontSize: 15,
    color: '#999'
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

export default AdminDashboardScreen;