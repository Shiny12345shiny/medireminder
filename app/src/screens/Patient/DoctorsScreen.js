import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  ActivityIndicator,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials } from '../../utils/helpers';

const DoctorsScreen = ({ navigation }) => {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [specializations, setSpecializations] = useState([]);

  useEffect(() => {
    loadSpecializations();
    loadDoctors();
  }, []);

  useEffect(() => {
    const delaySearch = setTimeout(() => {
      loadDoctors();
    }, 500);

    return () => clearTimeout(delaySearch);
  }, [searchQuery, selectedSpecialization]);

  const loadSpecializations = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SPECIALIZATIONS);
      setSpecializations(response.data || []);
    } catch (error) {
      console.error('Error loading specializations:', error);
    }
  };

  const loadDoctors = async () => {
    setLoading(true);
    try {
      const params = {};
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }
      if (selectedSpecialization) {
        params.specialization = selectedSpecialization;
      }

      const response = await apiClient.get(API_ENDPOINTS.DOCTORS, { params });
      setDoctors(response.data || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDoctors();
    setRefreshing(false);
  };

  const renderDoctorCard = ({ item }) => (
    <TouchableOpacity
      style={styles.doctorCard}
      onPress={() => navigation.navigate('DoctorDetail', { doctorId: item._id })}
    >
      <View style={styles.cardContent}>
        <View style={styles.doctorHeader}>
          <View style={styles.avatarContainer}>
            {item.profilePicture ? (
              <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
            )}
            {item.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={16} color="#4caf50" />
              </View>
            )}
          </View>

          <View style={styles.doctorInfo}>
            <Text style={styles.doctorName}>Dr. {item.name}</Text>
            <Text style={styles.specialization}>{item.specialization}</Text>
            
            {item.qualifications && (
              <View style={styles.qualificationRow}>
                <MaterialCommunityIcons name="school" size={14} color="#666" />
                <Text style={styles.qualification}>{item.qualifications}</Text>
              </View>
            )}

            {item.experience && (
              <View style={styles.experienceRow}>
                <MaterialCommunityIcons name="briefcase" size={14} color="#666" />
                <Text style={styles.experience}>{item.experience} years exp.</Text>
              </View>
            )}
          </View>
        </View>

        {item.clinicAddress && (
          <View style={styles.locationRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#666" />
            <Text style={styles.locationText} numberOfLines={1}>
              {item.clinicAddress.city}, {item.clinicAddress.state}
            </Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={16} color="#ffc107" />
            <Text style={styles.rating}>
              {item.rating ? item.rating.toFixed(1) : 'New'}
            </Text>
            {item.totalReviews > 0 && (
              <Text style={styles.reviewCount}>({item.totalReviews})</Text>
            )}
          </View>

          {item.consultationFee && (
            <View style={styles.feeContainer}>
              <Text style={styles.feeLabel}>Fee:</Text>
              <Text style={styles.feeAmount}>₹{item.consultationFee}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.bookButton}
          onPress={() => navigation.navigate('BookAppointment', { doctorId: item._id })}
        >
          <MaterialCommunityIcons name="calendar-plus" size={18} color="#fff" />
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="doctor" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Doctors Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || selectedSpecialization
          ? 'Try adjusting your search or filters'
          : 'No doctors available at the moment'}
      </Text>
    </View>
  );

  const renderSpecializationFilter = () => (
    <View style={styles.filterContainer}>
      <FlatList
        horizontal
        data={['All', ...specializations]}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterChip,
              (item === 'All' && !selectedSpecialization) ||
              item === selectedSpecialization
                ? styles.filterChipActive
                : null
            ]}
            onPress={() => setSelectedSpecialization(item === 'All' ? '' : item)}
          >
            <Text
              style={[
                styles.filterChipText,
                (item === 'All' && !selectedSpecialization) ||
                item === selectedSpecialization
                  ? styles.filterChipTextActive
                  : null
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterList}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <MaterialCommunityIcons name="magnify" size={24} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search doctors..."
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
      </View>

      {/* Specialization Filter */}
      {renderSpecializationFilter()}

      {/* Doctors List */}
      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={doctors}
          renderItem={renderDoctorCard}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5'
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  searchInputContainer: {
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
  filterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  filterList: {
    paddingHorizontal: 15,
    gap: 10
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    marginRight: 8
  },
  filterChipActive: {
    backgroundColor: '#667eea'
  },
  filterChipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600'
  },
  filterChipTextActive: {
    color: '#fff'
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
  doctorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  cardContent: {
    padding: 15
  },
  doctorHeader: {
    flexDirection: 'row',
    marginBottom: 12
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff'
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 2
  },
  doctorInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  doctorName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4
  },
  specialization: {
    fontSize: 14,
    color: '#667eea',
    fontWeight: '600',
    marginBottom: 6
  },
  qualificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  qualification: {
    fontSize: 13,
    color: '#666'
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  experience: {
    fontSize: 13,
    color: '#666'
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    flex: 1
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  rating: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  reviewCount: {
    fontSize: 13,
    color: '#999'
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  feeLabel: {
    fontSize: 13,
    color: '#666'
  },
  feeAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4caf50'
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6
  },
  bookButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
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
  }
});

export default DoctorsScreen;