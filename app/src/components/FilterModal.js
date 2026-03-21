import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const FilterModal = ({
  visible,
  onClose,
  title = 'Filter',
  filters,
  selectedFilter,
  onSelectFilter
}) => {
  const handleSelect = (filter) => {
    onSelectFilter(filter);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={filter.key || index}
                style={styles.filterOption}
                onPress={() => handleSelect(filter.key || filter)}
                activeOpacity={0.7}
              >
                {filter.icon && (
                  <MaterialCommunityIcons
                    name={filter.icon}
                    size={24}
                    color={selectedFilter === (filter.key || filter) ? '#667eea' : '#666'}
                  />
                )}
                
                <Text
                  style={[
                    styles.filterText,
                    selectedFilter === (filter.key || filter) && styles.filterTextActive
                  ]}
                >
                  {filter.label || filter}
                </Text>

                {selectedFilter === (filter.key || filter) && (
                  <MaterialCommunityIcons name="check" size={20} color="#667eea" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  content: {
    padding: 20
  },
  filterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    gap: 15
  },
  filterText: {
    flex: 1,
    fontSize: 16,
    color: '#333'
  },
  filterTextActive: {
    color: '#667eea',
    fontWeight: '600'
  }
});

export default FilterModal;