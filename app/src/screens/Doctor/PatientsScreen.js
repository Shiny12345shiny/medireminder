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

const DoctorPatientsScreen = ({ navigation }) => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPatients, setFilteredPatients] = useState([]);

  useEffect(() => {
    loadPatients();
  }, []);

  useEffect(() => {
    filterPatients();
  }, [patients, searchQuery]);

  const loadPatients = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.MY_PATIENTS);
      setPatients(response.data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPatients();
    setRefreshing(false);
  };

  const filterPatients = () => {
    if (searchQuery.trim()) {
      const filtered = patients.filter(patient =>
        patient.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        patient.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredPatients(filtered);
    } else {
      setFilteredPatients(patients);
    }
  };

  const renderPatientCard = ({ item }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientDetail', { patientId: item._id })}
    >
      <View style={styles.avatarContainer}>
        {item.profilePicture ? (
          <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
          </View>
        )}
      </View>

      <View style={styles.patientInfo}>
        <Text style={styles.patientName}>{item.name}</Text>
        
        <View style={styles.patientMeta}>
          {item.email && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="email" size={14} color="#666" />
              <Text style={styles.metaText} numberOfLines={1}>{item.email}</Text>
            </View>
          )}

          {item.phone && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="phone" size={14} color="#666" />
              <Text style={styles.metaText}>{item.phone}</Text>
            </View>
          )}

          {item.age && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="cake" size={14} color="#666" />
              <Text style={styles.metaText}>{item.age} years</Text>
            </View>
          )}

          {item.gender && (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="gender-male-female" size={14} color="#666" />
              <Text style={styles.metaText}>
                {item.gender.charAt(0).toUpperCase() + item.gender.slice(1)}
              </Text>
            </View>
          )}
        </View>

        {item.lastVisit && (
          <View style={styles.lastVisit}>
            <MaterialCommunityIcons name="clock-outline" size={14} color="#999" />
            <Text style={styles.lastVisitText}>
              Last visit: {new Date(item.lastVisit).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.appointmentCount > 0 && (
          <View style={styles.appointmentCount}>
            <MaterialCommunityIcons name="calendar-check" size={14} color="#667eea" />
            <Text style={styles.appointmentCountText}>
              {item.appointmentCount} appointment{item.appointmentCount > 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </View>

      <MaterialCommunityIcons name="chevron-right" size={24} color="#999" />
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group-outline" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Patients</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery 
          ? 'No patients match your search' 
          : "You don't have any patients yet"}
      </Text>
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
            placeholder="Search patients..."
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

      {/* Patients Count */}
      {!loading && filteredPatients.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredPatients.length} patient{filteredPatients.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Patients List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredPatients}
          renderItem={renderPatientCard}
          keyExtractor={item => item._id}
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
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff'
  },
  countText: {
    fontSize: 14,
    color: '#666',
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
  patientCard: {
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
  avatarContainer: {
    alignSelf: 'flex-start'
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff'
  },
  patientInfo: {
    flex: 1
  },
  patientName: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8
  },
  patientMeta: {
    gap: 6,
    marginBottom: 8
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontSize: 13,
    color: '#666',
    flex: 1
  },
  lastVisit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4
  },
  lastVisitText: {
    fontSize: 12,
    color: '#999'
  },
  appointmentCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#e8eaf6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  appointmentCountText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600'
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

export default DoctorPatientsScreen;