import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSchedule } from '../../context/ScheduleContext';
import { getMedicineTypeColor, calculateStockDaysRemaining } from '../../utils/helpers';
import { colors } from '../../constants/theme';

const SchedulesScreen = ({ navigation }) => {
  const { schedules, loading, refreshing, refreshSchedules } = useSchedule();

  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredSchedules, setFilteredSchedules] = useState([]);

  useEffect(() => {
    filterSchedules();
  }, [schedules, searchQuery, activeFilter]);

  const filterSchedules = () => {
    let filtered = [...schedules];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(schedule =>
        schedule.medicineName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Active filter
    switch (activeFilter) {
      case 'active':
        filtered = filtered.filter(s => s.isActive && !s.isPaused);
        break;
      case 'paused':
        filtered = filtered.filter(s => s.isPaused);
        break;
      case 'lowStock':
        filtered = filtered.filter(s => s.isLowStock);
        break;
      case 'inactive':
        filtered = filtered.filter(s => !s.isActive);
        break;
    }

    setFilteredSchedules(filtered);
  };

  const renderScheduleCard = ({ item }) => {
    const daysRemaining = calculateStockDaysRemaining(
      item.stock.remainingQuantity,
      item.timings.length
    );

    return (
      <TouchableOpacity
        style={styles.scheduleCard}
        onPress={() => navigation.navigate('ScheduleDetail', { scheduleId: item._id })}
      >
        <View style={styles.cardHeader}>
          <View style={[
            styles.medicineTypeIndicator,
            { backgroundColor: getMedicineTypeColor(item.medicineType, colors) }
          ]} />
          <View style={styles.cardHeaderContent}>
            <Text style={styles.medicineName}>{item.medicineName}</Text>
            <Text style={styles.medicineType}>
              {item.medicineType.charAt(0).toUpperCase() + item.medicineType.slice(1)}
            </Text>
          </View>
          {item.isPaused && (
            <View style={styles.pausedBadge}>
              <MaterialCommunityIcons name="pause" size={14} color="#fff" />
              <Text style={styles.pausedText}>Paused</Text>
            </View>
          )}
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="pill" size={18} color="#666" />
            <Text style={styles.infoText}>
              {item.dosage.amount} {item.dosage.unit}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="clock-outline" size={18} color="#666" />
            <Text style={styles.infoText}>
              {item.timings.length} time{item.timings.length > 1 ? 's' : ''} daily
            </Text>
          </View>

          <View style={styles.infoRow}>
            <MaterialCommunityIcons name="package-variant" size={18} color="#666" />
            <Text style={[
              styles.infoText,
              item.isLowStock && styles.lowStockText
            ]}>
              {item.stock.remainingQuantity} left ({daysRemaining} days)
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.adherenceContainer}>
            <View style={styles.adherenceBar}>
              <View
                style={[
                  styles.adherenceFill,
                  {
                    width: `${item.adherenceScore}%`,
                    backgroundColor: item.adherenceScore >= 80 ? '#4caf50' : '#ff9800'
                  }
                ]}
              />
            </View>
            <Text style={styles.adherenceText}>{item.adherenceScore}% adherence</Text>
          </View>

          <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="pill" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Medicine Schedules</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'No schedules match your search' : 'Add your first medicine schedule to get started'}
      </Text>
      {!searchQuery && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => navigation.navigate('CreateSchedule')}
        >
          <Text style={styles.emptyStateButtonText}>Add Medicine</Text>
        </TouchableOpacity>
      )}
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
          <Text style={styles.modalTitle}>Filter Schedules</Text>

          {[
            { key: 'all', label: 'All Medicines', icon: 'pill' },
            { key: 'active', label: 'Active Only', icon: 'check-circle' },
            { key: 'paused', label: 'Paused', icon: 'pause-circle' },
            { key: 'lowStock', label: 'Low Stock', icon: 'package-variant' },
            { key: 'inactive', label: 'Inactive', icon: 'close-circle' }
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
      </TouchableOpacity>
    </Modal>
  );

  return (
    <View style={styles.container}>
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search medicines..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <MaterialCommunityIcons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          ) : null}
        </View>

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
              {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
              <MaterialCommunityIcons name="close" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Schedules List */}
      <FlatList
        data={filteredSchedules}
        renderItem={renderScheduleCard}
        keyExtractor={item => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refreshSchedules} />
        }
        showsVerticalScrollIndicator={false}
      />

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateSchedule')}
      >
        <MaterialCommunityIcons name="plus" size={28} color="#fff" />
      </TouchableOpacity>

      <FilterModal />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  searchContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#fff',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 15,
    gap: 10
  },
  searchInput: {
    flex: 1,
    height: 45,
    fontSize: 16,
    color: '#333'
  },
  filterButton: {
    width: 45,
    height: 45,
    borderRadius: 12,
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
  listContent: {
    padding: 15,
    paddingBottom: 80
  },
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12
  },
  medicineTypeIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2
  },
  cardHeaderContent: {
    flex: 1
  },
  medicineName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  medicineType: {
    fontSize: 13,
    color: '#666'
  },
  pausedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ff9800',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4
  },
  pausedText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  cardBody: {
    gap: 8,
    marginBottom: 12
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  infoText: {
    fontSize: 14,
    color: '#666'
  },
  lowStockText: {
    color: '#f44336',
    fontWeight: '600'
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  adherenceContainer: {
    flex: 1,
    marginRight: 10
  },
  adherenceBar: {
    height: 6,
    backgroundColor: '#f0f0f0',
    borderRadius: 3,
    marginBottom: 6
  },
  adherenceFill: {
    height: '100%',
    borderRadius: 3
  },
  adherenceText: {
    fontSize: 12,
    color: '#666'
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

export default SchedulesScreen;