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
  Alert,
  ActivityIndicator,
  Image
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials, formatDate } from '../../utils/helpers';

const AdminUsersScreen = ({ navigation }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState('all');
  const [filteredUsers, setFilteredUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, activeFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.USERS);
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadUsers();
    setRefreshing(false);
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(user =>
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Role filter
    if (activeFilter !== 'all') {
      filtered = filtered.filter(u => u.role === activeFilter);
    }

    setFilteredUsers(filtered);
  };

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    
    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${newStatus === 'active' ? 'activate' : 'suspend'} this user?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await apiClient.put(`${API_ENDPOINTS.USERS}/${userId}/status`, {
                status: newStatus
              });
              await loadUsers();
              Alert.alert('Success', `User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
            } catch (error) {
              Alert.alert('Error', 'Failed to update user status');
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (userId, userName) => {
    Alert.alert(
      'Delete User',
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await apiClient.delete(`${API_ENDPOINTS.USERS}/${userId}`);
              await loadUsers();
              Alert.alert('Success', 'User deleted successfully');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete user');
            }
          }
        }
      ]
    );
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return '#4caf50';
      case 'suspended':
        return '#f44336';
      case 'pending':
        return '#ff9800';
      default:
        return '#666';
    }
  };

  const renderUserCard = ({ item }) => (
    <View style={styles.userCard}>
      <View style={styles.userHeader}>
        <View style={styles.userLeft}>
          <View style={styles.avatarContainer}>
            {item.profilePicture ? (
              <Image source={{ uri: item.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={styles.userEmail}>{item.email}</Text>
            {item.phone && (
              <Text style={styles.userPhone}>{item.phone}</Text>
            )}
          </View>
        </View>

        <View style={styles.userBadges}>
          <View style={[styles.roleBadge, { backgroundColor: getRoleColor(item.role) }]}>
            <Text style={styles.badgeText}>
              {item.role.charAt(0).toUpperCase() + item.role.slice(1)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
            <Text style={styles.badgeText}>
              {item.status?.charAt(0).toUpperCase() + item.status?.slice(1) || 'Active'}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.userMeta}>
        <View style={styles.metaItem}>
          <MaterialCommunityIcons name="calendar" size={14} color="#666" />
          <Text style={styles.metaText}>
            Joined {formatDate(item.createdAt)}
          </Text>
        </View>

        {item.lastLogin && (
          <View style={styles.metaItem}>
            <MaterialCommunityIcons name="login" size={14} color="#666" />
            <Text style={styles.metaText}>
              Last login {formatDate(item.lastLogin)}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.userActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.navigate('UserDetail', { userId: item._id })}
        >
          <MaterialCommunityIcons name="eye" size={18} color="#667eea" />
          <Text style={styles.actionButtonText}>View</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleToggleStatus(item._id, item.status || 'active')}
        >
          <MaterialCommunityIcons
            name={item.status === 'active' ? 'pause' : 'play'}
            size={18}
            color={item.status === 'active' ? '#ff9800' : '#4caf50'}
          />
          <Text style={styles.actionButtonText}>
            {item.status === 'active' ? 'Suspend' : 'Activate'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleDeleteUser(item._id, item.name)}
        >
          <MaterialCommunityIcons name="delete" size={18} color="#f44336" />
          <Text style={[styles.actionButtonText, { color: '#f44336' }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons name="account-group-outline" size={80} color="#ccc" />
      <Text style={styles.emptyStateTitle}>No Users Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery || activeFilter !== 'all'
          ? 'No users match your search criteria'
          : 'No users in the system'}
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
          <Text style={styles.modalTitle}>Filter by Role</Text>

          {[
            { key: 'all', label: 'All Users', icon: 'account-group' },
            { key: 'patient', label: 'Patients', icon: 'account' },
            { key: 'doctor', label: 'Doctors', icon: 'doctor' },
            { key: 'admin', label: 'Admins', icon: 'shield-account' }
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
            placeholder="Search users..."
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
              {activeFilter.charAt(0).toUpperCase() + activeFilter.slice(1)}s
            </Text>
            <TouchableOpacity onPress={() => setActiveFilter('all')}>
              <MaterialCommunityIcons name="close" size={16} color="#667eea" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Users Count */}
      {!loading && filteredUsers.length > 0 && (
        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {filteredUsers.length} user{filteredUsers.length > 1 ? 's' : ''}
          </Text>
        </View>
      )}

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#667eea" />
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserCard}
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
  countContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
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
  userCard: {
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
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12
  },
  userLeft: {
    flexDirection: 'row',
    flex: 1,
    gap: 12
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden'
  },
  avatar: {
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
    color: '#666',
    marginBottom: 2
  },
  userPhone: {
    fontSize: 13,
    color: '#999'
  },
  userBadges: {
    gap: 6,
    alignItems: 'flex-end'
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  badgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600'
  },
  userMeta: {
    gap: 6,
    marginBottom: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontSize: 12,
    color: '#666'
  },
  userActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0'
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 4
  },
  actionButtonText: {
    fontSize: 13,
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

export default AdminUsersScreen;