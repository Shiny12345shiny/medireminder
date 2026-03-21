import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
//import { apiClient } from '../../utils/api';

import { apiClient } from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

import { API_ENDPOINTS } from '../../constants/config';
import { formatTime, formatDate, getStatusColor } from '../../utils/helpers';
import { colors } from '../../constants/theme';

const RemindersScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState('today');

  useEffect(() => {
    if (!isAuthenticated) return;
    loadReminders();
  }, [selectedDate, activeFilter, isAuthenticated]);

  const loadReminders = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      let endpoint = API_ENDPOINTS.REMINDERS;
      const params = {};

      if (selectedDate === 'today') {
        endpoint = API_ENDPOINTS.TODAY_REMINDERS;
      } else if (selectedDate === 'upcoming') {
        endpoint = API_ENDPOINTS.UPCOMING_REMINDERS;
        params.hours = 48;
      }

      if (activeFilter !== 'all') {
        params.status = activeFilter;
      }

      const response = await apiClient.get(endpoint, { params });
      // api.js interceptor already unwraps response.data, so response is the payload directly
      const payload = response?.data || response;

      if (selectedDate === 'today' && payload) {
        // Today reminders come grouped
        const allReminders = [
          ...(payload.taken || []),
          ...(payload.missed || []),
          ...(payload.pending || []),
          ...(payload.upcoming || [])
        ];
        setReminders(allReminders);
      } else {
        setReminders(Array.isArray(payload) ? payload : (payload?.data || payload || []));
      }
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadReminders();
    setRefreshing(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'taken':
        return 'check-circle';
      case 'missed':
        return 'close-circle';
      case 'pending':
        return 'clock-alert';
      case 'scheduled':
        return 'clock-outline';
      case 'snoozed':
        return 'sleep';
      case 'skipped':
        return 'skip-next';
      default:
        return 'clock-outline';
    }
  };

  const renderReminderCard = ({ item }) => {
    const statusColor = getStatusColor(item.status, colors);

    return (
      <TouchableOpacity
        style={styles.reminderCard}
        onPress={() => navigation.navigate('ReminderDetail', { reminderId: item._id })}
      >
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.medicineInfo}>
              <Text style={styles.medicineName}>{item.medicineName || item.schedule?.medicineName}</Text>
              <Text style={styles.dosage}>
                {item.dosage?.amount || item.schedule?.dosage?.amount} {item.dosage?.unit || item.schedule?.dosage?.unit}
              </Text>
            </View>
            
            <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
              <MaterialCommunityIcons 
                name={getStatusIcon(item.status)} 
                size={16} 
                color="#fff" 
              />
              <Text style={styles.statusText}>
                {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
              </Text>
            </View>
          </View>

          <View style={styles.cardFooter}>
            <View style={styles.timeInfo}>
              <MaterialCommunityIcons name="clock-outline" size={16} color="#666" />
              <Text style={styles.timeText}>{formatTime(item.scheduledTime)}</Text>
            </View>

            {item.takenAt && (
              <View style={styles.takenInfo}>
                <MaterialCommunityIcons name="check" size={16} color="#4caf50" />
                <Text style={styles.takenText}>
                  Taken at {formatTime(item.takenAt)}
                </Text>
              </View>
            )}

            {item.status === 'snoozed' && item.snoozedUntil && (
              <View style={styles.snoozeInfo}>
                <MaterialCommunityIcons name="sleep" size={16} color="#ff9800" />
                <Text style={styles.snoozeText}>
                  Until {formatTime(item.snoozedUntil)}
                </Text>
              </View>
            )}
          </View>

          {item.notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesText} numberOfLines={2}>
                {item.notes}
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
      <MaterialCommunityIcons name="bell-off" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Reminders</Text>
      <Text style={styles.emptyStateText}>
        {selectedDate === 'today' 
          ? "You don't have any reminders for today" 
          : "No reminders found"}
      </Text>
    </View>
  );

  const FilterModal = () => (
    <Modal
      visible={filterVisible}
      transparent
      animationType="fade"
      onRequestClose={() => setFilterVisible(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setFilterVisible(false)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Filter Reminders</Text>

          <View style={styles.filterSection}>
            <Text style={styles.filterSectionTitle}>Status</Text>
            {[
              { key: 'all', label: 'All Reminders', icon: 'format-list-bulleted' },
              { key: 'taken', label: 'Taken', icon: 'check-circle' },
              { key: 'pending', label: 'Pending', icon: 'clock-alert' },
              { key: 'missed', label: 'Missed', icon: 'close-circle' },
              { key: 'snoozed', label: 'Snoozed', icon: 'sleep' }
            ].map(filter => (
              <TouchableOpacity
                key={filter.key}
                style={styles.filterOption}
                onPress={() => {
                  setActiveFilter(filter.key);
                  setFilterVisible(false);
                }}
              >
                <MaterialCommunityIcons
                  name={filter.icon}
                  size={24}
                  color={activeFilter === filter.key ? '#667eea' : '#666'}
                />
                <Text style={[
                  styles.filterOptionText,
                  activeFilter === filter.key && styles.filterOptionTextActive
                ]}>
                  {filter.label}
                </Text>
                {activeFilter === filter.key && (
                  <MaterialCommunityIcons name="check" size={20} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Date Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedDate === 'today' && styles.tabActive]}
          onPress={() => setSelectedDate('today')}
        >
          <Text style={[styles.tabText, selectedDate === 'today' && styles.tabTextActive]}>
            Today
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedDate === 'upcoming' && styles.tabActive]}
          onPress={() => setSelectedDate('upcoming')}
        >
          <Text style={[styles.tabText, selectedDate === 'upcoming' && styles.tabTextActive]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedDate === 'all' && styles.tabActive]}
          onPress={() => setSelectedDate('all')}
        >
          <Text style={[styles.tabText, selectedDate === 'all' && styles.tabTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterVisible(true)}
        >
          <MaterialCommunityIcons
            name="filter-variant"
            size={24}
            color={activeFilter !== 'all' ? '#667eea' : '#666'}
          />
        </TouchableOpacity>
      </View>

      {/* Active Filter Badge */}
      {activeFilter !== 'all' && (
        <View style={styles.activeFilterContainer}>
          <View style={styles.activeFilterBadge}>
            <Text style={styles.activeFilterText}>
              Status: {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
              <MaterialCommunityIcons name="close" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Reminders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={reminders}
          renderItem={renderReminderCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <FilterModal />
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
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center'
  },
  activeFilterContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  activeFilterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 8
  },
  activeFilterText: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600'
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
  reminderCard: {
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
    marginBottom: 10
  },
  medicineInfo: {
    flex: 1,
    marginRight: 10
  },
  medicineName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  dosage: {
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
    fontSize: 12,
    color: '#fff',
    fontWeight: '600'
  },
  cardFooter: {
    gap: 8
  },
  timeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  timeText: {
    fontSize: 14,
    color: '#666'
  },
  takenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  takenText: {
    fontSize: 13,
    color: '#4caf50',
    fontWeight: '500'
  },
  snoozeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  snoozeText: {
    fontSize: 13,
    color: '#ff9800',
    fontWeight: '500'
  },
  notesContainer: {
    backgroundColor: '#f9f9f9',
    padding: 10,
    borderRadius: 8,
    marginTop: 10
  },
  notesText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20
  },
  filterSection: {
    marginBottom: 10
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15
  },
  filterOptionText: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  filterOptionTextActive: {
    color: '#667eea',
    fontWeight: '600'
  }
});

export default RemindersScreen;