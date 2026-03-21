import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Modal,
  ActivityIndicator
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { formatDate } from '../../utils/helpers';

const HealthRecordsScreen = ({ navigation }) => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredRecords, setFilteredRecords] = useState([]);

  useEffect(() => {
    loadRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [records, searchQuery, activeFilter]);

  const loadRecords = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.HEALTH_RECORDS);
      setRecords(response.data || []);
    } catch (error) {
      console.error('Error loading health records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadRecords();
    setRefreshing(false);
  };

  const filterRecords = () => {
    let filtered = [...records];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(record =>
        record.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.recordType?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Type filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(r => r.recordType === activeFilter);
    }

    setFilteredRecords(filtered);
  };

  const getRecordTypeIcon = (type) => {
    switch (type) {
      case 'prescription':
        return 'pill';
      case 'lab-report':
        return 'test-tube';
      case 'imaging':
        return 'image-filter-hdr';
      case 'vaccination':
        return 'needle';
      case 'surgery':
        return 'hospital-box';
      case 'vital-signs':
        return 'heart-pulse';
      case 'insurance':
        return 'shield-check';
      default:
        return 'file-document';
    }
  };

  const getRecordTypeColor = (type) => {
    switch (type) {
      case 'prescription':
        return '#667eea';
      case 'lab-report':
        return '#4caf50';
      case 'imaging':
        return '#2196f3';
      case 'vaccination':
        return '#ff9800';
      case 'surgery':
        return '#f44336';
      case 'vital-signs':
        return '#e91e63';
      case 'insurance':
        return '#9c27b0';
      default:
        return '#666';
    }
  };

  const renderRecordCard = ({ item }) => {
    const typeColor = getRecordTypeColor(item.recordType);

    return (
      <TouchableOpacity
        style={styles.recordCard}
        onPress={() => navigation.navigate('HealthRecordDetail', { recordId: item._id })}
      >
        <View style={[styles.typeIndicator, { backgroundColor: typeColor }]}>
          <MaterialCommunityIcons
            name={getRecordTypeIcon(item.recordType)}
            size={24}
            color="#fff"
          />
        </View>

        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <View style={styles.recordInfo}>
              <Text style={styles.recordTitle}>{item.title}</Text>
              <View style={styles.typeLabel}>
                <Text style={[styles.typeLabelText, { color: typeColor }]}>
                  {item.recordType.replace('-', ' ').toUpperCase()}
                </Text>
              </View>
            </View>

            {item.isFavorite && (
              <MaterialCommunityIcons name="star" size={20} color="#ffc107" />
            )}
          </View>

          <View style={styles.recordDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="calendar" size={16} color="#666" />
              <Text style={styles.detailText}>{formatDate(item.date)}</Text>
            </View>

            {item.doctor && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="doctor" size={16} color="#666" />
                <Text style={styles.detailText}>Dr. {item.doctor.name}</Text>
              </View>
            )}

            {item.files && item.files.length > 0 && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons name="paperclip" size={16} color="#666" />
                <Text style={styles.detailText}>
                  {item.files.length} file{item.files.length > 1 ? 's' : ''}
                </Text>
              </View>
            )}
          </View>

          {item.tags && item.tags.length > 0 && (
            <View style={styles.tagsContainer}>
              {item.tags.slice(0, 3).map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
              {item.tags.length > 3 && (
                <Text style={styles.moreTagsText}>+{item.tags.length - 3}</Text>
              )}
            </View>
          )}
        </View>

        <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="file-document-outline" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Health Records</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || activeFilter !== 'all'
          ? 'No records match your search'
          : 'Add your first health record to get started'}
      </Text>
      {!searchQuery && activeFilter === 'all' && (
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={() => navigation.navigate('CreateHealthRecord')}
        >
          <Text style={styles.emptyStateButtonText}>Add Record</Text>
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
          <Text style={styles.modalTitle}>Filter by Type</Text>

          {[
            { key: 'all', label: 'All Records', icon: 'file-document' },
            { key: 'prescription', label: 'Prescriptions', icon: 'pill' },
            { key: 'lab-report', label: 'Lab Reports', icon: 'test-tube' },
            { key: 'imaging', label: 'Imaging', icon: 'image-filter-hdr' },
            { key: 'vaccination', label: 'Vaccinations', icon: 'needle' },
            { key: 'surgery', label: 'Surgery', icon: 'hospital-box' },
            { key: 'vital-signs', label: 'Vital Signs', icon: 'heart-pulse' },
            { key: 'insurance', label: 'Insurance', icon: 'shield-check' }
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
            placeholder="Search records..."
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
              {activeFilter.replace('-', ' ').toUpperCase()}
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
              <MaterialCommunityIcons name="close" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Records List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredRecords}
          renderItem={renderRecordCard}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateHealthRecord')}
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
    fontSize: 12,
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
    paddingBottom: 80
  },
  recordCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    gap: 12
  },
  typeIndicator: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center'
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
  recordInfo: {
    flex: 1,
    marginRight: 10
  },
  recordTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6
  },
  typeLabel: {
    alignSelf: 'flex-start',
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  typeLabelText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  recordDetails: {
    gap: 6,
    marginBottom: 10
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  detailText: {
    fontSize: 13,
    color: '#666'
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    alignItems: 'center'
  },
  tag: {
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  tagText: {
    fontSize: 11,
    color: '#667eea'
  },
  moreTagsText: {
    fontSize: 11,
    color: '#999'
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

export default HealthRecordsScreen;