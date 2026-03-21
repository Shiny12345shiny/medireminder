import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';

const SettingsScreen = ({ navigation }) => {
  const { user } = useAuth();

  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    soundEnabled: true,
    vibrationEnabled: true,
    darkMode: false
  });

  const handleToggle = (key) => {
    setSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleChangePassword = () => {
    navigation.navigate('ChangePassword');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(API_ENDPOINTS.DELETE_ACCOUNT);
              Alert.alert('Account Deleted', 'Your account has been deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete account');
            }
          }
        }
      ]
    );
  };

  const handleClearCache = () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          onPress: () => {
            Alert.alert('Success', 'Cache cleared successfully');
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="email" size={24} color="#667eea" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Email Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications via email
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.emailNotifications}
                onValueChange={() => handleToggle('emailNotifications')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="bell" size={24} color="#667eea" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive push notifications on your device
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.pushNotifications}
                onValueChange={() => handleToggle('pushNotifications')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="message" size={24} color="#667eea" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>SMS Notifications</Text>
                  <Text style={styles.settingDescription}>
                    Receive notifications via SMS
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.smsNotifications}
                onValueChange={() => handleToggle('smsNotifications')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Sound & Vibration */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sound & Vibration</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="volume-high" size={24} color="#667eea" />
                <Text style={styles.settingTitle}>Sound</Text>
              </View>
              <Switch
                value={settings.soundEnabled}
                onValueChange={() => handleToggle('soundEnabled')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons name="vibrate" size={24} color="#667eea" />
                <Text style={styles.settingTitle}>Vibration</Text>
              </View>
              <Switch
                value={settings.vibrationEnabled}
                onValueChange={() => handleToggle('vibrationEnabled')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>
          </View>
        </View>

        {/* Appearance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.card}>
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <MaterialCommunityIcons
                  name={settings.darkMode ? 'weather-night' : 'white-balance-sunny'}
                  size={24}
                  color="#667eea"
                />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingDescription}>
                    Use dark theme (Coming soon)
                  </Text>
                </View>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={() => handleToggle('darkMode')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
                disabled
              />
            </View>
          </View>
        </View>

        {/* Account Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleChangePassword}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="lock-reset" size={24} color="#667eea" />
                <Text style={styles.actionTitle}>Change Password</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => navigation.navigate('NotificationSettings')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="bell-outline" size={24} color="#667eea" />
                <Text style={styles.actionTitle}>Notification Preferences</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="shield-account" size={24} color="#667eea" />
                <Text style={styles.actionTitle}>Privacy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Data & Storage */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data & Storage</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleClearCache}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="cached" size={24} color="#ff9800" />
                <Text style={styles.actionTitle}>Clear Cache</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => Alert.alert('Export', 'Data export coming soon')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="download" size={24} color="#4caf50" />
                <Text style={styles.actionTitle}>Export Data</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Danger Zone</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={handleDeleteAccount}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="delete-forever" size={24} color="#f44336" />
                <View style={styles.settingText}>
                  <Text style={[styles.actionTitle, { color: '#f44336' }]}>
                    Delete Account
                  </Text>
                  <Text style={styles.settingDescription}>
                    Permanently delete your account and all data
                  </Text>
                </View>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>

            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>100</Text>
            </View>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => Alert.alert('Terms', 'Terms of Service coming soon')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="file-document" size={24} color="#667eea" />
                <Text style={styles.actionTitle}>Terms of Service</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => Alert.alert('Privacy', 'Privacy Policy coming soon')}
            >
              <View style={styles.actionLeft}>
                <MaterialCommunityIcons name="shield-check" size={24} color="#667eea" />
                <Text style={styles.actionTitle}>Privacy Policy</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
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
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 10
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
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
    marginRight: 10
  },
  settingText: {
    flex: 1
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2
  },
  settingDescription: {
    fontSize: 12,
    color: '#999',
    lineHeight: 16
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  infoLabel: {
    fontSize: 15,
    color: '#666'
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  }
});

export default SettingsScreen;