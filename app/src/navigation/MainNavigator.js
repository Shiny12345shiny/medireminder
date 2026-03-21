import React from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from 'react-native-paper';

// Patient Screens
import PatientDashboardScreen from '../screens/Patient/DashboardScreen';
import SchedulesScreen from '../screens/Patient/SchedulesScreen';
import ScheduleDetailScreen from '../screens/Patient/ScheduleDetailScreen';
import CreateScheduleScreen from '../screens/Patient/CreateScheduleScreen';
import EditScheduleScreen from '../screens/Patient/EditScheduleScreen';
import RemindersScreen from '../screens/Patient/RemindersScreen';
import ReminderDetailScreen from '../screens/Patient/ReminderDetailScreen';
import AppointmentsScreen from '../screens/Patient/AppointmentsScreen';
import AppointmentDetailScreen from '../screens/Patient/AppointmentDetailScreen';
import BookAppointmentScreen from '../screens/Patient/BookAppointmentScreen';
import DoctorsScreen from '../screens/Patient/DoctorsScreen';
import DoctorDetailScreen from '../screens/Patient/DoctorDetailScreen';
import HealthRecordsScreen from '../screens/Patient/HealthRecordsScreen';
import HealthRecordDetailScreen from '../screens/Patient/HealthRecordDetailScreen';
import CreateHealthRecordScreen from '../screens/Patient/CreateHealthRecordScreen';
import ProfileScreen from '../screens/Common/ProfileScreen';
import EditProfileScreen from '../screens/Common/EditProfileScreen';
import SettingsScreen from '../screens/Common/SettingsScreen';
import NotificationSettingsScreen from '../screens/Common/NotificationSettingsScreen';

// Doctor Screens
import DoctorDashboardScreen from '../screens/Doctor/DashboardScreen';
import DoctorAppointmentsScreen from '../screens/Doctor/AppointmentsScreen';
import DoctorPatientsScreen from '../screens/Doctor/PatientsScreen';
import PatientDetailScreen from '../screens/Doctor/PatientDetailScreen';

// Admin Screens
import AdminDashboardScreen from '../screens/Admin/DashboardScreen';
import AdminUsersScreen from '../screens/Admin/UsersScreen';

import { useAuth } from '../context/AuthContext';

import FloatingChatButton from '../components/ChatBot/FloatingChatButton';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

// Patient Stack Navigator
const PatientStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="PatientDashboard" 
        component={PatientDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="Schedules" 
        component={SchedulesScreen}
        options={{ title: 'Medicine Schedules' }}
      />
      <Stack.Screen 
        name="ScheduleDetail" 
        component={ScheduleDetailScreen}
        options={{ title: 'Schedule Details' }}
      />
      <Stack.Screen 
        name="CreateSchedule" 
        component={CreateScheduleScreen}
        options={{ title: 'Add Medicine' }}
      />
      <Stack.Screen 
        name="EditSchedule" 
        component={EditScheduleScreen}
        options={{ title: 'Edit Schedule' }}
      />
      <Stack.Screen 
        name="Reminders" 
        component={RemindersScreen}
        options={{ title: 'Reminders' }}
      />
      <Stack.Screen 
        name="ReminderDetail" 
        component={ReminderDetailScreen}
        options={{ title: 'Reminder Details' }}
      />
      <Stack.Screen 
        name="Appointments" 
        component={AppointmentsScreen}
        options={{ title: 'My Appointments' }}
      />
      <Stack.Screen 
        name="AppointmentDetail" 
        component={AppointmentDetailScreen}
        options={{ title: 'Appointment Details' }}
      />
      <Stack.Screen 
        name="BookAppointment" 
        component={BookAppointmentScreen}
        options={{ title: 'Book Appointment' }}
      />
      <Stack.Screen 
        name="Doctors" 
        component={DoctorsScreen}
        options={{ title: 'Find Doctors' }}
      />
      <Stack.Screen 
        name="DoctorDetail" 
        component={DoctorDetailScreen}
        options={{ title: 'Doctor Profile' }}
      />
      <Stack.Screen 
        name="HealthRecords" 
        component={HealthRecordsScreen}
        options={{ title: 'Health Records' }}
      />
      <Stack.Screen 
        name="HealthRecordDetail" 
        component={HealthRecordDetailScreen}
        options={{ title: 'Record Details' }}
      />
      <Stack.Screen 
        name="CreateHealthRecord" 
        component={CreateHealthRecordScreen}
        options={{ title: 'Add Health Record' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
      <Stack.Screen 
        name="NotificationSettings" 
        component={NotificationSettingsScreen}
        options={{ title: 'Notification Settings' }}
      />
    </Stack.Navigator>
  );
};

// Doctor Stack Navigator
const DoctorStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="DoctorDashboard" 
        component={DoctorDashboardScreen}
        options={{ title: 'Dashboard' }}
      />
      <Stack.Screen 
        name="DoctorAppointments" 
        component={DoctorAppointmentsScreen}
        options={{ title: 'Appointments' }}
      />
      <Stack.Screen 
        name="AppointmentDetail" 
        component={AppointmentDetailScreen}
        options={{ title: 'Appointment Details' }}
      />
      <Stack.Screen 
        name="DoctorPatients" 
        component={DoctorPatientsScreen}
        options={{ title: 'My Patients' }}
      />
      <Stack.Screen 
        name="PatientDetail" 
        component={PatientDetailScreen}
        options={{ title: 'Patient Details' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen 
        name="EditProfile" 
        component={EditProfileScreen}
        options={{ title: 'Edit Profile' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

// Admin Stack Navigator
const AdminStackNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#667eea',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen 
        name="AdminDashboard" 
        component={AdminDashboardScreen}
        options={{ title: 'Admin Dashboard' }}
      />
      <Stack.Screen 
        name="AdminUsers" 
        component={AdminUsersScreen}
        options={{ title: 'Manage Users' }}
      />
      <Stack.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{ title: 'My Profile' }}
      />
      <Stack.Screen 
        name="Settings" 
        component={SettingsScreen}
        options={{ title: 'Settings' }}
      />
    </Stack.Navigator>
  );
};

// Patient Tab Navigator
const PatientTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={PatientStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Medicines"
        component={SchedulesScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="pill" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="RemindersTab"
        component={RemindersScreen}
        options={{
          title: 'Reminders',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="bell" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Records"
        component={HealthRecordsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="file-document" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Doctor Tab Navigator
const DoctorTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={DoctorStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="AppointmentsTab"
        component={DoctorAppointmentsScreen}
        options={{
          title: 'Appointments',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="calendar-clock" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Patients"
        component={DoctorPatientsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-group" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Admin Tab Navigator
const AdminTabNavigator = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textSecondary,
        tabBarStyle: {
          paddingBottom: 5,
          height: 60,
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={AdminStackNavigator}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="view-dashboard" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Users"
        component={AdminUsersScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="account-multiple" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <MaterialCommunityIcons name="cog" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

// Main Navigator - Routes based on user role
const MainNavigator = () => {
  const { user } = useAuth();

  if (user?.role === 'doctor') {
    return <DoctorTabNavigator />;
  } else if (user?.role === 'admin') {
    return <AdminTabNavigator />;
  } else {
    return (
      <View style={{ flex: 1 }}>
        <PatientTabNavigator />
        <FloatingChatButton />
      </View>
    );
  }
};

export default MainNavigator;