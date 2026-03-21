import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNotification } from '../../context/NotificationContext';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';

const NotificationSettingsScreen = ({ navigation }) => {
  const {
    notificationPreferences,
    loadNotificationPreferences,
    updateNotificationPreferences
  } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [preferences, setPreferences] = useState({
    email: {
      enabled: true,
      reminders: true,
      appointments: true,
      refillAlerts: true,
      promotions: false
    },
    push: {
      enabled: true,
      reminders: true,
      appointments: true,
      refillAlerts: true,
      missedDose: true,
      promotions: false
    },
    sms: {
      enabled: false,
      reminders: false,
      appointments: false,
      refillAlerts: false
    },
    reminderSettings: {
      advanceTime: 15,
      escalation: {
        enabled: true,
        interval: 5,
        maxAttempts: 3
      }
    }
  });

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      await loadNotificationPreferences();
      if (notificationPreferences) {
        setPreferences(notificationPreferences);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (category, field) => {
    setPreferences(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateNotificationPreferences(preferences);
      Alert.alert('Success', 'Notification preferences updated successfully');
    } catch (error) {
      console.error('Error saving preferences:', error);
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setSaving(false);
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
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Email Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="email" size={24} color="#667eea" />
            <Text style={styles.sectionTitle}>Email Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Enable Email</Text>
              <Switch
                value={preferences.email.enabled}
                onValueChange={() => handleToggle('email', 'enabled')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            {preferences.email.enabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="pill" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Medicine Reminders</Text>
                  </View>
                  <Switch
                    value={preferences.email.reminders}
                    onValueChange={() => handleToggle('email', 'reminders')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Appointments</Text>
                  </View>
                  <Switch
                    value={preferences.email.appointments}
                    onValueChange={() => handleToggle('email', 'appointments')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Refill Alerts</Text>
                  </View>
                  <Switch
                    value={preferences.email.refillAlerts}
                    onValueChange={() => handleToggle('email', 'refillAlerts')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="tag" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Promotions</Text>
                  </View>
                  <Switch
                    value={preferences.email.promotions}
                    onValueChange={() => handleToggle('email', 'promotions')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Push Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="bell" size={24} color="#667eea" />
            <Text style={styles.sectionTitle}>Push Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Enable Push</Text>
              <Switch
                value={preferences.push.enabled}
                onValueChange={() => handleToggle('push', 'enabled')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            {preferences.push.enabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="pill" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Medicine Reminders</Text>
                  </View>
                  <Switch
                    value={preferences.push.reminders}
                    onValueChange={() => handleToggle('push', 'reminders')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Appointments</Text>
                  </View>
                  <Switch
                    value={preferences.push.appointments}
                    onValueChange={() => handleToggle('push', 'appointments')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Refill Alerts</Text>
                  </View>
                  <Switch
                    value={preferences.push.refillAlerts}
                    onValueChange={() => handleToggle('push', 'refillAlerts')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="alert" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Missed Dose Alerts</Text>
                  </View>
                  <Switch
                    value={preferences.push.missedDose}
                    onValueChange={() => handleToggle('push', 'missedDose')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="tag" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Promotions</Text>
                  </View>
                  <Switch
                    value={preferences.push.promotions}
                    onValueChange={() => handleToggle('push', 'promotions')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* SMS Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="message" size={24} color="#667eea" />
            <Text style={styles.sectionTitle}>SMS Notifications</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Enable SMS</Text>
              <Switch
                value={preferences.sms.enabled}
                onValueChange={() => handleToggle('sms', 'enabled')}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            {preferences.sms.enabled && (
              <>
                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="pill" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Medicine Reminders</Text>
                  </View>
                  <Switch
                    value={preferences.sms.reminders}
                    onValueChange={() => handleToggle('sms', 'reminders')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="calendar" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Appointments</Text>
                  </View>
                  <Switch
                    value={preferences.sms.appointments}
                    onValueChange={() => handleToggle('sms', 'appointments')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>

                <View style={styles.settingItem}>
                  <View style={styles.settingLeft}>
                    <MaterialCommunityIcons name="package-variant" size={20} color="#666" />
                    <Text style={styles.settingLabel}>Refill Alerts</Text>
                  </View>
                  <Switch
                    value={preferences.sms.refillAlerts}
                    onValueChange={() => handleToggle('sms', 'refillAlerts')}
                    trackColor={{ false: '#ccc', true: '#667eea' }}
                    thumbColor="#fff"
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Reminder Settings */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clock-alert" size={24} color="#667eea" />
            <Text style={styles.sectionTitle}>Reminder Settings</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Advance Reminder Time</Text>
              <Text style={styles.infoValue}>
                {preferences.reminderSettings?.advanceTime || 15} minutes
              </Text>
            </View>

            <View style={styles.settingItem}>
              <Text style={styles.settingTitle}>Enable Escalation</Text>
              <Switch
                value={preferences.reminderSettings?.escalation?.enabled}
                onValueChange={() => {
                  setPreferences(prev => ({
                    ...prev,
                    reminderSettings: {
                      ...prev.reminderSettings,
                      escalation: {
                        ...prev.reminderSettings.escalation,
                        enabled: !prev.reminderSettings.escalation.enabled
                      }
                    }
                  }));
                }}
                trackColor={{ false: '#ccc', true: '#667eea' }}
                thumbColor="#fff"
              />
            </View>

            {preferences.reminderSettings?.escalation?.enabled && (
              <>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Escalation Interval</Text>
                  <Text style={styles.infoValue}>
                    {preferences.reminderSettings.escalation.interval} minutes
                  </Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Max Attempts</Text>
                  <Text style={styles.infoValue}>
                    {preferences.reminderSettings.escalation.maxAttempts} times
                  </Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <MaterialCommunityIcons name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Preferences</Text>
            </>
          )}
        </TouchableOpacity>
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
  content: {
    flex: 1
  },
  section: {
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 10
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333'
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
    gap: 10,
    marginRight: 10
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  settingLabel: {
    fontSize: 14,
    color: '#666'
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
    fontSize: 14,
    color: '#666'
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333'
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 40,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8
  },
  saveButtonDisabled: {
    opacity: 0.6
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default NotificationSettingsScreen;