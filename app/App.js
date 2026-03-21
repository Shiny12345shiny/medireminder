import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { SocketProvider } from './src/context/SocketContext';
import { ScheduleProvider } from './src/context/ScheduleContext';
import { NotificationProvider } from './src/context/NotificationContext';
import AppNavigator from './src/navigation/AppNavigator';
import FlashMessage from 'react-native-flash-message';

// Suppress Expo Go internal "Unable to activate keep awake" warning
// This is triggered by Expo Go's dev tooling, not app code, and does not affect production
if (typeof global !== 'undefined') {
  const originalHandler = global.ErrorUtils?.getGlobalHandler?.();
  global.ErrorUtils?.setGlobalHandler?.((error, isFatal) => {
    if (error?.message?.includes('keep awake')) return;
    originalHandler?.(error, isFatal);
  });
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ScheduleProvider>
          <NotificationProvider>
            <AppNavigator />
            <FlashMessage position="top" />
          </NotificationProvider>
        </ScheduleProvider>
      </SocketProvider>
    </AuthProvider>
  );
}