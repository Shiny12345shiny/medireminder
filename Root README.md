# Smart Medicine Reminder and Consultation System

A comprehensive mobile healthcare application built with React Native (Expo) and Node.js that helps patients manage medications, schedule consultations, and maintain health records.

## 🎯 Project Overview

This system is designed to help patients, especially elderly or cognitively challenged individuals, take medicines correctly and on time. It provides secure access for patients, doctors, and admins with features including:

- **User Management**: Role-based access (Patient, Doctor, Admin)
- **Medicine Scheduling**: Time, dosage, duration tracking
- **Automated Reminders**: Push notifications and email alerts with escalation
- **Missed Dose Tracking**: Comprehensive adherence reports
- **Refill Alerts**: Low stock notifications
- **Health Records**: Secure digital prescription storage
- **Online Consultations**: Appointment booking and nearby doctor search
- **Basic Health Guidance**: Suggestions for mild conditions

## 🏗️ Tech Stack

### Mobile App (Frontend)
- **Framework**: React Native with Expo (~51.0.0)
- **Navigation**: React Navigation
- **State Management**: React Context API
- **UI Library**: React Native Paper
- **Charts**: Victory Native
- **Real-time**: Socket.io Client
- **Notifications**: Expo Notifications
- **Location**: Expo Location
- **WebRTC**: react-native-webrtc (for video calls)

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Authentication**: JWT + bcrypt
- **Email**: Nodemailer
- **Real-time**: Socket.io
- **Task Scheduling**: node-schedule

## 📁 Project Structure
```
smart-medicine-reminder-system/
├── app/                    # Mobile App (React Native with Expo)
│   ├── assets/
│   ├── src/
│   │   ├── components/
│   │   ├── screens/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── utils/
│   │   ├── navigation/
│   │   └── constants/
│   ├── App.js
│   ├── app.json
│   └── package.json
├── server/                 # Backend (Node.js + Express)
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middlewares/
│   ├── services/
│   ├── utils/
│   ├── cron/
│   └── server.js
├── docs/                   # Documentation
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- MongoDB (local or Atlas)
- Expo CLI: `npm install -g expo-cli`
- Expo Go app on your iOS/Android device

### Installation

1. **Clone the repository**
```bash
git clone 
cd smart-medicine-reminder-system
```

2. **Setup Backend**
```bash
cd server
npm install
npm install node-cron
cp ../.env.example .env
# Edit .env with your MongoDB URI, JWT secret, etc.
```

3. **Setup Mobile App**
```bash
cd ../app
npm install
npx expo install expo-camera
npx expo install expo-asset
npx expo install expo-document-picker
npm install --global eas-cli
```

4. **Start MongoDB**
```bash
# If using local MongoDB
mongod

# Or use Docker
docker-compose up -d mongodb
```

5. **Start Backend Server**
```bash
cd server
npm run dev
# Server runs on http://localhost:5000
```

6. **Start Mobile App**
```bash
cd app
expo start
# Scan the QR code with Expo Go app on your phone
```

## 📱 Testing on Physical Device

1. Install **Expo Go** from App Store (iOS) or Play Store (Android)
2. Run `expo start` in the app directory
3. Scan the QR code displayed in terminal/browser with:
   - **iOS**: Camera app
   - **Android**: Expo Go app
4. App will load on your device

## 🔧 Environment Variables

Create a `.env` file in the `server/` directory:
```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://localhost:27017/medicine-reminder

# JWT
JWT_SECRET=your-secret-key-here
JWT_EXPIRE=7d

# Email (Nodemailer)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Expo Push Notifications
EXPO_ACCESS_TOKEN=your-expo-access-token

# Socket.io
SOCKET_PORT=5001
```

Create `app/src/constants/config.js`:
```javascript
export const API_BASE_URL = 'http://YOUR_LOCAL_IP:5000'; // Replace with your machine's IP
export const SOCKET_URL = 'http://YOUR_LOCAL_IP:5001';
```

## 📚 API Documentation

See `docs/API.md` for detailed API endpoints.

### Key Endpoints

**Authentication**
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - Login user
- `GET /api/users/profile` - Get user profile

**Medicine Schedules**
- `POST /api/schedules` - Create schedule
- `GET /api/schedules` - Get user schedules
- `PUT /api/schedules/:id` - Update schedule
- `DELETE /api/schedules/:id` - Delete schedule

**Reminders**
- `POST /api/reminders/confirm` - Confirm dose taken
- `GET /api/reminders/history` - Get reminder history

**Consultations**
- `POST /api/consultations/book` - Book appointment
- `GET /api/consultations` - Get appointments
- `GET /api/doctors/nearby` - Find nearby doctors

**Health Records**
- `POST /api/records/upload` - Upload health record
- `GET /api/records` - Get user records

## 🧪 Testing
```bash
# Backend tests
cd server
npm test

# Mobile app tests
cd app
npm test
```

## 🔐 Security Features

- JWT-based authentication
- Password hashing with bcrypt
- Secure token storage (Expo SecureStore)
- Role-based access control
- Input validation and sanitization
- HTTPS ready for production

## 📊 Features in Detail

### For Patients
- Set medicine schedules with custom reminders
- Receive push notifications before dose time
- Track medication adherence with reports
- Upload and view health records
- Book online consultations
- Find nearby doctors
- Get basic health guidance

### For Doctors
- Upload prescriptions for patients
- Manage consultation appointments
- View patient health records (with permission)
- Prescribe medications remotely

### For Admins
- User management and oversight
- System monitoring
- Generate aggregate reports

## 🐳 Docker Deployment (Optional)
```bash
docker-compose up -d
```

## 📦 Building for Production
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure build
eas build:configure

# Build for Android
eas build --platform android

# Build for iOS
eas build --platform ios
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License.

## 👥 Authors

- College Project Team

## 🙏 Acknowledgments

- Expo team for excellent mobile development framework
- React Native community
- MongoDB and Node.js communities

## 📞 Support

For issues and questions, please open an issue in the repository.

---

**Note**: This is a college project demonstrating healthcare application development. For production use, ensure compliance with healthcare regulations (HIPAA, GDPR, etc.) and conduct thorough security audits.