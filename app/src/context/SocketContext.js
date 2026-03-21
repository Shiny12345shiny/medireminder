import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import { SOCKET_URL, SOCKET_EVENTS } from '../constants/config';
import { useAuth } from './AuthContext';
import { showInfoMessage } from '../utils/helpers';

const SocketContext = createContext({});

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (isAuthenticated && token) {
      connectSocket();
    } else {
      disconnectSocket();
    }

    return () => {
      disconnectSocket();
    };
  }, [isAuthenticated, token]);

  const connectSocket = () => {
    try {
      if (socketRef.current) {
        console.log('Socket already exists');
        return;
      }

      console.log('Connecting to socket:', SOCKET_URL);

      const newSocket = io(SOCKET_URL, {
        auth: {
          token: token
        },
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5
      });

      // Connection events
      newSocket.on('connect', () => {
        console.log('Socket connected:', newSocket.id);
        setConnected(true);
        setReconnecting(false);
      });

      newSocket.on('disconnect', (reason) => {
        console.log('Socket disconnected:', reason);
        setConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        setConnected(false);
      });

      newSocket.on('reconnect_attempt', () => {
        console.log('Attempting to reconnect...');
        setReconnecting(true);
      });

      newSocket.on('reconnect', (attemptNumber) => {
        console.log('Socket reconnected after', attemptNumber, 'attempts');
        setConnected(true);
        setReconnecting(false);
      });

      newSocket.on('reconnect_error', (error) => {
        console.error('Socket reconnection error:', error);
      });

      newSocket.on('reconnect_failed', () => {
        console.error('Socket reconnection failed');
        setReconnecting(false);
      });

      // Custom events
      newSocket.on(SOCKET_EVENTS.CONNECTED, (data) => {
        console.log('Socket connected event:', data);
      });

      socketRef.current = newSocket;
      setSocket(newSocket);
    } catch (error) {
      console.error('Error connecting socket:', error);
    }
  };

  const disconnectSocket = () => {
    if (socketRef.current) {
      console.log('Disconnecting socket');
      socketRef.current.disconnect();
      socketRef.current = null;
      setSocket(null);
      setConnected(false);
    }
  };

  const emit = (event, data) => {
    if (socketRef.current && connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn('Socket not connected. Cannot emit event:', event);
    }
  };

  const on = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  };

  // Reminder events
  const onReminderNew = (callback) => {
    on(SOCKET_EVENTS.REMINDER_NEW, callback);
  };

  const onReminderConfirmed = (callback) => {
    on(SOCKET_EVENTS.REMINDER_CONFIRMED, callback);
  };

  const onReminderMissed = (callback) => {
    on(SOCKET_EVENTS.REMINDER_MISSED, callback);
  };

  const onReminderEscalation = (callback) => {
    on(SOCKET_EVENTS.REMINDER_ESCALATION, callback);
  };

  const confirmReminder = (data) => {
    emit('reminder:confirm', data);
  };

  // Schedule events
  const onScheduleCreated = (callback) => {
    on(SOCKET_EVENTS.SCHEDULE_CREATED, callback);
  };

  const onScheduleUpdated = (callback) => {
    on(SOCKET_EVENTS.SCHEDULE_UPDATED, callback);
  };

  const onScheduleDeleted = (callback) => {
    on(SOCKET_EVENTS.SCHEDULE_DELETED, callback);
  };

  const onScheduleRefilled = (callback) => {
    on(SOCKET_EVENTS.SCHEDULE_REFILLED, callback);
  };

  const medicineTaken = (data) => {
    emit('medicine:taken', data);
  };

  // Appointment events
  const onAppointmentNew = (callback) => {
    on(SOCKET_EVENTS.APPOINTMENT_NEW, callback);
  };

  const onAppointmentConfirmed = (callback) => {
    on(SOCKET_EVENTS.APPOINTMENT_CONFIRMED, callback);
  };

  const onAppointmentStarted = (callback) => {
    on(SOCKET_EVENTS.APPOINTMENT_STARTED, callback);
  };

  const onAppointmentCompleted = (callback) => {
    on(SOCKET_EVENTS.APPOINTMENT_COMPLETED, callback);
  };

  const onAppointmentCancelled = (callback) => {
    on(SOCKET_EVENTS.APPOINTMENT_CANCELLED, callback);
  };

  const joinAppointment = (appointmentId) => {
    emit('appointment:join', { appointmentId });
  };

  const leaveAppointment = (appointmentId) => {
    emit('appointment:leave', { appointmentId });
  };

  // Refill alert events
  const onRefillAlert = (callback) => {
    on(SOCKET_EVENTS.REFILL_ALERT, callback);
  };

  // WebRTC signaling for video calls
  const sendCallOffer = (appointmentId, offer) => {
    emit('call:offer', { appointmentId, offer });
  };

  const sendCallAnswer = (appointmentId, answer) => {
    emit('call:answer', { appointmentId, answer });
  };

  const sendIceCandidate = (appointmentId, candidate) => {
    emit('call:ice-candidate', { appointmentId, candidate });
  };

  const endCall = (appointmentId) => {
    emit('call:end', { appointmentId });
  };

  const onCallOffer = (callback) => {
    on('call:offer', callback);
  };

  const onCallAnswer = (callback) => {
    on('call:answer', callback);
  };

  const onIceCandidate = (callback) => {
    on('call:ice-candidate', callback);
  };

  const onCallEnded = (callback) => {
    on('call:ended', callback);
  };

  // Chat events
  const sendChatMessage = (appointmentId, message) => {
    emit('chat:message', { appointmentId, message });
  };

  const onChatMessage = (callback) => {
    on('chat:message', callback);
  };

  const sendTyping = (appointmentId) => {
    emit('chat:typing', { appointmentId });
  };

  const sendStopTyping = (appointmentId) => {
    emit('chat:stop-typing', { appointmentId });
  };

  const onTyping = (callback) => {
    on('chat:typing', callback);
  };

  const onStopTyping = (callback) => {
    on('chat:stop-typing', callback);
  };

  const value = {
    socket,
    connected,
    reconnecting,
    emit,
    on,
    off,
    // Reminder methods
    onReminderNew,
    onReminderConfirmed,
    onReminderMissed,
    onReminderEscalation,
    confirmReminder,
    medicineTaken,
    // Schedule methods
    onScheduleCreated,
    onScheduleUpdated,
    onScheduleDeleted,
    onScheduleRefilled,
    // Appointment methods
    onAppointmentNew,
    onAppointmentConfirmed,
    onAppointmentStarted,
    onAppointmentCompleted,
    onAppointmentCancelled,
    joinAppointment,
    leaveAppointment,
    // Refill methods
    onRefillAlert,
    // WebRTC methods
    sendCallOffer,
    sendCallAnswer,
    sendIceCandidate,
    endCall,
    onCallOffer,
    onCallAnswer,
    onIceCandidate,
    onCallEnded,
    // Chat methods
    sendChatMessage,
    onChatMessage,
    sendTyping,
    sendStopTyping,
    onTyping,
    onStopTyping
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;