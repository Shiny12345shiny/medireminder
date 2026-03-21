# Smart Medicine Reminder

## Prerequisites
- Node.js v16+
- MongoDB Atlas account (or local MongoDB)
- Expo Go app on your Android/iOS device
- Expo account at [expo.dev](https://expo.dev)
- EAS CLI: `npm install -g eas-cli`

---

## One-Time Setup

### 1. Install dependencies
```bash
# From root folder
npm install
```

### 2. Install additional app packages
```bash
cd app
npx expo install expo-camera
npx expo install expo-asset
npx expo install expo-document-picker
npm install --global eas-cli
```
```bash
cd server
npm install nodemailer --legacy-peer-deps
```

### 3. Setup Expo Project ID
```bash
cd app
eas login         # login with your expo.dev account
eas init --id YOUR_PROJECT_ID
```
Then manually add to `app/app.json` if not added automatically:
```json
"extra": {
  "eas": {
    "projectId": "YOUR_PROJECT_ID"
  }
},
"owner": "YOUR_EXPO_USERNAME"
```
Also update `app/src/context/NotificationContext.js`:
```js
const token = (await Notifications.getExpoPushTokenAsync({
  projectId: 'YOUR_PROJECT_ID'
})).data;
```

### 4. Configure server environment
`server/.env` is already present. Update only if needed:
- `MONGO_URI` — your MongoDB connection string
- `EMAIL_USER` / `EMAIL_PASS` — Gmail credentials for email alerts

### 5. Fix Mongoose compatibility
In `server/models/Reminder.js`, make sure it uses:
```js
user: new mongoose.Types.ObjectId(userId)  // NOT mongoose.Types.ObjectId(userId)
```

---

## Running the App

### Every time you run:

**Step 1 — Find your PC's local IP:**
```bash
ipconfig   # Windows
# Look for WiFi adapter → IPv4 Address (e.g. 192.168.1.4)
```

**Step 2 — Update IP in `app/src/constants/config.js`:**
```js
export const API_BASE_URL = 'http://YOUR_IP:5000';
export const SOCKET_URL = 'http://YOUR_IP:5001';
```

**Step 3 — Start backend (in one terminal):**
```bash
cd server
npm run dev
```

**Step 4 — Start app (in another terminal):**
```bash
cd app
npx expo start --clear
```

**Step 5 — Open on device:**
- Make sure phone and PC are on the **same WiFi**
- Scan the QR code with Expo Go

---

## Windows Firewall (one-time, run as Administrator)
```bash
netsh advfirewall firewall add rule name="Expo Metro" dir=in action=allow protocol=TCP localport=8081
netsh advfirewall firewall add rule name="App Server" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="App Socket" dir=in action=allow protocol=TCP localport=5001
```

---

## Notes
- Your PC's IP changes every session — always check with `ipconfig` and update `config.js`
- To avoid this, assign a static IP to your PC in your router settings
- Push notifications only work on physical devices, not emulators
- Server runs on port `5000`, Socket on port `5001`, Metro on port `8081`

---

## Default Admin Credentials
```
Email: admin@medicinereminder.com
Password: Admin@123456
```