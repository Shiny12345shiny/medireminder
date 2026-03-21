import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { apiClient } from '../../utils/api';
import { API_ENDPOINTS } from '../../constants/config';
import { getInitials, formatDate } from '../../utils/helpers';

const DoctorDetailScreen = ({ route, navigation }) => {
  const { doctorId } = route.params;

  const [doctor, setDoctor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('about');

  useEffect(() => {
    loadDoctorDetails();
    loadReviews();
  }, [doctorId]);

  const loadDoctorDetails = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_DETAIL(doctorId));
      setDoctor(response.data);
    } catch (error) {
      console.error('Error loading doctor details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReviews = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.DOCTOR_REVIEWS(doctorId), {
        params: { limit: 10 }
      });
      setReviews(response.data || []);
    } catch (error) {
      console.error('Error loading reviews:', error);
    }
  };

  const handleCall = () => {
    if (doctor?.phone) {
      Linking.openURL(`tel:${doctor.phone}`);
    }
  };

  const handleEmail = () => {
    if (doctor?.email) {
      Linking.openURL(`mailto:${doctor.email}`);
    }
  };

  const handleBookAppointment = () => {
    navigation.navigate('BookAppointment', { doctorId: doctor._id });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#667eea" />
      </View>
    );
  }

  if (!doctor) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons name="alert-circle" size={60} color="#f44336" />
        <Text style={styles.errorText}>Doctor not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => navigation.goBack()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderAboutTab = () => (
    <View style={styles.tabContent}>
      {/* Specialization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Specialization</Text>
        <View style={styles.card}>
          <Text style={styles.specializationText}>{doctor.specialization}</Text>
        </View>
      </View>

      {/* Qualifications */}
      {doctor.qualifications && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Qualifications</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="school" size={20} color="#667eea" />
              <Text style={styles.infoText}>{doctor.qualifications}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Experience */}
      {doctor.experience && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Experience</Text>
          <View style={styles.card}>
            <View style={styles.infoRow}>
              <MaterialCommunityIcons name="briefcase" size={20} color="#667eea" />
              <Text style={styles.infoText}>{doctor.experience} years</Text>
            </View>
          </View>
        </View>
      )}

      {/* Clinic Address */}
      {doctor.clinicAddress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Clinic Address</Text>
          <View style={styles.card}>
            <View style={styles.addressRow}>
              <MaterialCommunityIcons name="map-marker" size={20} color="#667eea" />
              <View style={styles.addressContent}>
                {doctor.clinicAddress.street && (
                  <Text style={styles.addressText}>{doctor.clinicAddress.street}</Text>
                )}
                <Text style={styles.addressText}>
                  {doctor.clinicAddress.city}, {doctor.clinicAddress.state}
                </Text>
                {doctor.clinicAddress.zipCode && (
                  <Text style={styles.addressText}>{doctor.clinicAddress.zipCode}</Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Contact Information */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <View style={styles.card}>
          {doctor.phone && (
            <TouchableOpacity style={styles.contactRow} onPress={handleCall}>
              <MaterialCommunityIcons name="phone" size={20} color="#667eea" />
              <Text style={styles.contactText}>{doctor.phone}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          )}

          {doctor.email && (
            <TouchableOpacity style={styles.contactRow} onPress={handleEmail}>
              <MaterialCommunityIcons name="email" size={20} color="#667eea" />
              <Text style={styles.contactText}>{doctor.email}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Available Hours */}
      {doctor.availableHours && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Hours</Text>
          <View style={styles.card}>
            {Object.entries(doctor.availableHours).map(([day, hours]) => (
              hours.available && (
                <View key={day} style={styles.availabilityRow}>
                  <Text style={styles.dayText}>
                    {day.charAt(0).toUpperCase() + day.slice(1)}
                  </Text>
                  <Text style={styles.hoursText}>
                    {hours.start} - {hours.end}
                  </Text>
                </View>
              )
            ))}
          </View>
        </View>
      )}
    </View>
  );

  const renderReviewsTab = () => (
    <View style={styles.tabContent}>
      {/* Overall Rating */}
      <View style={styles.section}>
        <View style={styles.ratingOverview}>
          <View style={styles.ratingScoreContainer}>
            <Text style={styles.ratingScore}>
              {doctor.rating ? doctor.rating.toFixed(1) : 'N/A'}
            </Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((star) => (
                <MaterialCommunityIcons
                  key={star}
                  name={star <= Math.round(doctor.rating || 0) ? 'star' : 'star-outline'}
                  size={24}
                  color="#ffc107"
                />
              ))}
            </View>
            <Text style={styles.reviewCount}>
              Based on {doctor.totalReviews || 0} reviews
            </Text>
          </View>
        </View>
      </View>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Patient Reviews</Text>
          {reviews.map((review, index) => (
            <View key={index} style={styles.reviewCard}>
              <View style={styles.reviewHeader}>
                <View style={styles.reviewerInfo}>
                  <View style={styles.reviewerAvatar}>
                    {review.patient?.profilePicture ? (
                      <Image
                        source={{ uri: review.patient.profilePicture }}
                        style={styles.reviewerImage}
                      />
                    ) : (
                      <View style={styles.reviewerPlaceholder}>
                        <Text style={styles.reviewerInitials}>
                          {getInitials(review.patient?.name || 'Anonymous')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.reviewerDetails}>
                    <Text style={styles.reviewerName}>
                      {review.patient?.name || 'Anonymous'}
                    </Text>
                    <View style={styles.reviewStars}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <MaterialCommunityIcons
                          key={star}
                          name={star <= review.rating ? 'star' : 'star-outline'}
                          size={14}
                          color="#ffc107"
                        />
                      ))}
                    </View>
                  </View>
                </View>
                <Text style={styles.reviewDate}>{formatDate(review.date)}</Text>
              </View>

              {review.review && (
                <Text style={styles.reviewText}>{review.review}</Text>
              )}
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.noReviews}>
          <MaterialCommunityIcons name="comment-off" size={60} color="#ccc" />
          <Text style={styles.noReviewsText}>No reviews yet</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarContainer}>
            {doctor.profilePicture ? (
              <Image source={{ uri: doctor.profilePicture }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>{getInitials(doctor.name)}</Text>
              </View>
            )}
            {doctor.isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialCommunityIcons name="check-decagram" size={24} color="#4caf50" />
              </View>
            )}
          </View>

          <Text style={styles.doctorName}>Dr. {doctor.name}</Text>
          <Text style={styles.specialization}>{doctor.specialization}</Text>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="star" size={20} color="#fff" />
              <Text style={styles.statText}>
                {doctor.rating ? doctor.rating.toFixed(1) : 'New'}
              </Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="briefcase" size={20} color="#fff" />
              <Text style={styles.statText}>{doctor.experience || 0} yrs</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="account-group" size={20} color="#fff" />
              <Text style={styles.statText}>{doctor.totalReviews || 0}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, selectedTab === 'about' && styles.tabActive]}
          onPress={() => setSelectedTab('about')}
        >
          <Text style={[styles.tabText, selectedTab === 'about' && styles.tabTextActive]}>
            About
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, selectedTab === 'reviews' && styles.tabActive]}
          onPress={() => setSelectedTab('reviews')}
        >
          <Text style={[styles.tabText, selectedTab === 'reviews' && styles.tabTextActive]}>
            Reviews
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {selectedTab === 'about' ? renderAboutTab() : renderReviewsTab()}
      </ScrollView>

      {/* Book Appointment Button */}
      <View style={styles.footer}>
        {doctor.consultationFee && (
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Consultation Fee</Text>
            <Text style={styles.feeAmount}>₹{doctor.consultationFee}</Text>
          </View>
        )}
        <TouchableOpacity style={styles.bookButton} onPress={handleBookAppointment}>
          <MaterialCommunityIcons name="calendar-plus" size={20} color="#fff" />
          <Text style={styles.bookButtonText}>Book Appointment</Text>
        </TouchableOpacity>
      </View>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 18,
    color: '#666',
    marginTop: 15,
    marginBottom: 20
  },
  errorButton: {
    backgroundColor: '#667eea',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25
  },
  errorButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold'
  },
  header: {
    paddingTop: 20,
    paddingBottom: 30,
    paddingHorizontal: 20
  },
  headerContent: {
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
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 15,
    padding: 3
  },
  doctorName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5
  },
  specialization: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 20
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  statText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff'
  },
  statDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 15
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  tab: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent'
  },
  tabActive: {
    borderBottomColor: '#667eea'
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666'
  },
  tabTextActive: {
    color: '#667eea'
  },
  content: {
    flex: 1
  },
  tabContent: {
    paddingBottom: 100
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  specializationText: {
    fontSize: 16,
    color: '#667eea',
    fontWeight: '600'
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  infoText: {
    fontSize: 15,
    color: '#666',
    flex: 1
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12
  },
  addressContent: {
    flex: 1
  },
  addressText: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  contactText: {
    flex: 1,
    fontSize: 15,
    color: '#666'
  },
  availabilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  dayText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333'
  },
  hoursText: {
    fontSize: 14,
    color: '#666'
  },
  ratingOverview: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  ratingScoreContainer: {
    alignItems: 'center'
  },
  ratingScore: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#ffc107',
    marginBottom: 10
  },
  stars: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 10
  },
  reviewCount: {
    fontSize: 14,
    color: '#666'
  },
  reviewCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10
  },
  reviewerInfo: {
    flexDirection: 'row',
    flex: 1,
    gap: 10
  },
  reviewerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden'
  },
  reviewerImage: {
    width: '100%',
    height: '100%'
  },
  reviewerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center'
  },
  reviewerInitials: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  },
  reviewerDetails: {
    flex: 1
  },
  reviewerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4
  },
  reviewStars: {
    flexDirection: 'row',
    gap: 2
  },
  reviewDate: {
    fontSize: 12,
    color: '#999'
  },
  reviewText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20
  },
  noReviews: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  noReviewsText: {
    fontSize: 16,
    color: '#999',
    marginTop: 15
  },
  footer: {
    backgroundColor: '#fff',
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8
  },
  feeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  feeLabel: {
    fontSize: 14,
    color: '#666'
  },
  feeAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4caf50'
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#667eea',
    paddingVertical: 15,
    borderRadius: 12,
    gap: 8
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff'
  }
});

export default DoctorDetailScreen;