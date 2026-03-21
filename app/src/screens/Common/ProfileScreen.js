import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials, formatDate } from '../../utils/helpers';

const ProfileScreen = ({ navigation }) => {
  const { user, logout, updateProfile } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8
      });

      if (!result.canceled && result.assets[0]) {
        await uploadProfilePicture(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadProfilePicture = async (uri) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', {
        uri,
        type: 'image/jpeg',
        name: 'profile.jpg'
      });

      const response = await apiClient.post(
        API_ENDPOINTS.UPLOAD_PROFILE_PICTURE,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      await updateProfile({ profilePicture: response.data.profilePicture });
      Alert.alert('Success', 'Profile picture updated successfully');
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      Alert.alert('Error', 'Failed to upload profile picture');
    } finally {
      setUploading(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          }
        }
      ]
    );
  };

  const menuItems = {
    patient: [
      {
        icon: 'pill',
        title: 'My Schedules',
        subtitle: 'View medicine schedules',
        onPress: () => navigation.navigate('Schedules'),
        color: '#667eea'
      },
      {
        icon: 'bell',
        title: 'Reminders',
        subtitle: 'View all reminders',
        onPress: () => navigation.navigate('Reminders'),
        color: '#2196f3'
      },
      {
        icon: 'calendar-clock',
        title: 'Appointments',
        subtitle: 'View appointments',
        onPress: () => navigation.navigate('Appointments'),
        color: '#9c27b0'
      },
      {
        icon: 'file-document',
        title: 'Health Records',
        subtitle: 'Manage health records',
        onPress: () => navigation.navigate('HealthRecords'),
        color: '#4caf50'
      }
    ],
    doctor: [
      {
        icon: 'calendar-clock',
        title: 'My Appointments',
        subtitle: 'View appointments',
        onPress: () => navigation.navigate('DoctorAppointments'),
        color: '#9c27b0'
      },
      {
        icon: 'account-group',
        title: 'My Patients',
        subtitle: 'View patient list',
        onPress: () => navigation.navigate('DoctorPatients'),
        color: '#4caf50'
      }
    ],
    admin: [
      {
        icon: 'view-dashboard',
        title: 'Dashboard',
        subtitle: 'View statistics',
        onPress: () => navigation.navigate('AdminDashboard'),
        color: '#667eea'
      },
      {
        icon: 'account-multiple',
        title: 'Manage Users',
        subtitle: 'View all users',
        onPress: () => navigation.navigate('AdminUsers'),
        color: '#4caf50'
      }
    ]
  };

  const settingsItems = [
    {
      icon: 'account-edit',
      title: 'Edit Profile',
      onPress: () => navigation.navigate('EditProfile'),
      color: '#667eea'
    },
    {
      icon: 'bell-outline',
      title: 'Notification Settings',
      onPress: () => navigation.navigate('NotificationSettings'),
      color: '#ff9800'
    },
    {
      icon: 'cog',
      title: 'Settings',
      onPress: () => navigation.navigate('Settings'),
      color: '#666'
    },
    {
      icon: 'help-circle',
      title: 'Help & Support',
      onPress: () => Alert.alert('Help', 'Contact support@medicinereminder.com'),
      color: '#2196f3'
    },
    {
      icon: 'information',
      title: 'About',
      onPress: () => Alert.alert('About', 'Smart Medicine Reminder v1.0.0'),
      color: '#9c27b0'
    }
  ];

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.header}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.profileSection}>
            <TouchableOpacity
              style={styles.avatarContainer}
              onPress={handleImagePick}
              disabled={uploading}
            >
              {user?.profilePicture ? (
                <Image source={{ uri: user.profilePicture }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
                </View>
              )}
              <View style={styles.editBadge}>
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <MaterialCommunityIcons name="camera" size={16} color="#fff" />
                )}
              </View>
            </TouchableOpacity>

            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>
                {user?.role?.charAt(0).toUpperCase() + user?.role?.slice(1)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {/* User Info */}
        <View style={styles.section}>
          <View style={styles.infoCard}>
            {user?.phone && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="phone" size={20} color="#666" />
                <Text style={styles.infoText}>{user.phone}</Text>
              </View>
            )}

            {user?.gender && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="gender-male-female" size={20} color="#666" />
                <Text style={styles.infoText}>
                  {user.gender.charAt(0).toUpperCase() + user.gender.slice(1)}
                </Text>
              </View>
            )}

            {user?.dateOfBirth && (
              <View style={styles.infoRow}>
                <MaterialCommunityIcons name="cake" size={20} color="#666" />
                <Text style={styles.infoText}>{formatDate(user.dateOfBirth)}</Text>
              </View>
            )}

            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="calendar" size={20} color="#666" />
              <Text style={styles.infoText}>
                Joined {formatDate(user?.createdAt)}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Access Menu */}
        {menuItems[user?.role] && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <View style={styles.menuGrid}>
              {menuItems[user.role].map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.menuCard}
                  onPress={item.onPress}
                >
                  <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={28}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.menuTitle}>{item.title}</Text>
                  <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Settings Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings & Support</Text>
          <View style={styles.settingsList}>
            {settingsItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.settingsItem}
                onPress={item.onPress}
              >
                <View style={styles.settingsItemLeft}>
                  <View style={[styles.settingsIcon, { backgroundColor: item.color + '20' }]}>
                    <MaterialCommunityIcons
                      name={item.icon}
                      size={24}
                      color={item.color}
                    />
                  </View>
                  <Text style={styles.settingsTitle}>{item.title}</Text>
                </View>
                <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <MaterialCommunityIcons name="logout" size={20} color="#f44336" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0</Text>
      </ScrollView>
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
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20
  },
  profileSection: {
    alignItems: 'center'
  },
  avatarContainer: {
    position: 'relative',
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
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff'
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  userEmail: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 10
  },
  roleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16
  },
  roleText: {
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
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
  infoCard: {
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
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  infoText: {
    fontSize: 15,
    color: '#666'
  },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  menuCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  menuIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 4
  },
  menuSubtitle: {
    fontSize: 11,
    color: '#999',
    textAlign: 'center'
  },
  settingsList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  settingsIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f44336',
    gap: 8
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f44336'
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#999',
    marginTop: 10,
    marginBottom: 30
  }
});

export default ProfileScreen;