const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const User = require('../models/User');

let io;
const connectedUsers = new Map(); // userId -> socketId mapping
const userSockets = new Map(); // socketId -> userId mapping

// Initialize Socket.IO
const initializeSocketIO = (server) => {
  io = socketIO(server, {
    cors: {
      origin: process.env.CORS_ORIGIN || '*',
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      socket.userName = user.name;

      next();
    } catch (error) {
      logger.error('Socket authentication error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.userName})`);

    // Store connection
    connectedUsers.set(socket.userId, socket.id);
    userSockets.set(socket.id, socket.userId);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join role-based room
    socket.join(`role:${socket.userRole}`);

    // Emit connection success
    socket.emit('connected', {
      message: 'Connected to real-time service',
      userId: socket.userId,
      socketId: socket.id
    });

    // Notify other users (if needed for presence)
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      userName: socket.userName
    });

    // Handle reminder confirmation
    socket.on('reminder:confirm', async (data) => {
      try {
        logger.info(`Reminder confirmed by ${socket.userName}`, data);
        
        // Emit confirmation to user
        socket.emit('reminder:confirmed', {
          reminderId: data.reminderId,
          confirmedAt: new Date()
        });

        // Broadcast to admins/doctors if needed
        io.to(`role:doctor`).emit('reminder:patient-confirmed', {
          userId: socket.userId,
          userName: socket.userName,
          reminderId: data.reminderId
        });
      } catch (error) {
        logger.error('Error handling reminder confirmation:', error);
        socket.emit('error', { message: 'Failed to confirm reminder' });
      }
    });

    // Handle medicine taken event
    socket.on('medicine:taken', async (data) => {
      try {
        logger.info(`Medicine taken by ${socket.userName}`, data);
        
        socket.emit('medicine:taken-success', {
          scheduleId: data.scheduleId,
          takenAt: new Date()
        });

        // Notify caregivers/doctors if configured
        if (data.notifyCaregiver) {
          io.to(`role:doctor`).emit('medicine:patient-took', {
            userId: socket.userId,
            userName: socket.userName,
            medicineName: data.medicineName,
            takenAt: new Date()
          });
        }
      } catch (error) {
        logger.error('Error handling medicine taken event:', error);
        socket.emit('error', { message: 'Failed to record medicine taken' });
      }
    });

    // Handle appointment events
    socket.on('appointment:join', async (data) => {
      try {
        const appointmentRoom = `appointment:${data.appointmentId}`;
        socket.join(appointmentRoom);
        
        logger.info(`${socket.userName} joined appointment ${data.appointmentId}`);
        
        // Notify other participant
        socket.to(appointmentRoom).emit('appointment:participant-joined', {
          userId: socket.userId,
          userName: socket.userName,
          role: socket.userRole
        });

        socket.emit('appointment:joined', {
          appointmentId: data.appointmentId,
          room: appointmentRoom
        });
      } catch (error) {
        logger.error('Error joining appointment:', error);
        socket.emit('error', { message: 'Failed to join appointment' });
      }
    });

    socket.on('appointment:leave', async (data) => {
      try {
        const appointmentRoom = `appointment:${data.appointmentId}`;
        socket.leave(appointmentRoom);
        
        logger.info(`${socket.userName} left appointment ${data.appointmentId}`);
        
        // Notify other participant
        socket.to(appointmentRoom).emit('appointment:participant-left', {
          userId: socket.userId,
          userName: socket.userName
        });
      } catch (error) {
        logger.error('Error leaving appointment:', error);
      }
    });

    // Handle WebRTC signaling for video calls
    socket.on('call:offer', (data) => {
      const { appointmentId, offer } = data;
      socket.to(`appointment:${appointmentId}`).emit('call:offer', {
        userId: socket.userId,
        offer
      });
    });

    socket.on('call:answer', (data) => {
      const { appointmentId, answer } = data;
      socket.to(`appointment:${appointmentId}`).emit('call:answer', {
        userId: socket.userId,
        answer
      });
    });

    socket.on('call:ice-candidate', (data) => {
      const { appointmentId, candidate } = data;
      socket.to(`appointment:${appointmentId}`).emit('call:ice-candidate', {
        userId: socket.userId,
        candidate
      });
    });

    socket.on('call:end', (data) => {
      const { appointmentId } = data;
      socket.to(`appointment:${appointmentId}`).emit('call:ended', {
        userId: socket.userId
      });
    });

    // Handle chat messages
    socket.on('chat:message', async (data) => {
      try {
        const { appointmentId, message } = data;
        
        // Broadcast to appointment room
        io.to(`appointment:${appointmentId}`).emit('chat:message', {
          userId: socket.userId,
          userName: socket.userName,
          message,
          timestamp: new Date()
        });

        logger.info(`Chat message in appointment ${appointmentId} from ${socket.userName}`);
      } catch (error) {
        logger.error('Error sending chat message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicator
    socket.on('chat:typing', (data) => {
      const { appointmentId } = data;
      socket.to(`appointment:${appointmentId}`).emit('chat:typing', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    socket.on('chat:stop-typing', (data) => {
      const { appointmentId } = data;
      socket.to(`appointment:${appointmentId}`).emit('chat:stop-typing', {
        userId: socket.userId
      });
    });

    // Handle presence updates
    socket.on('presence:update', (data) => {
      socket.broadcast.emit('presence:user-update', {
        userId: socket.userId,
        status: data.status
      });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info(`Socket disconnected: ${socket.id} (User: ${socket.userName}), Reason: ${reason}`);

      // Remove from mappings
      connectedUsers.delete(socket.userId);
      userSockets.delete(socket.id);

      // Notify other users
      socket.broadcast.emit('user:offline', {
        userId: socket.userId,
        userName: socket.userName
      });
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error);
    });
  });

  logger.info('Socket.IO initialized successfully');
  return io;
};

// Get Socket.IO instance
const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit event to specific user
const emitToUser = (userId, event, data) => {
  try {
    const socketId = connectedUsers.get(userId.toString());
    if (socketId) {
      io.to(socketId).emit(event, data);
      logger.info(`Emitted ${event} to user ${userId}`);
      return true;
    }
    logger.warn(`User ${userId} not connected`);
    return false;
  } catch (error) {
    logger.error('Error emitting to user:', error);
    return false;
  }
};

// Emit event to user's room
const emitToUserRoom = (userId, event, data) => {
  try {
    io.to(`user:${userId}`).emit(event, data);
    logger.info(`Emitted ${event} to user room ${userId}`);
    return true;
  } catch (error) {
    logger.error('Error emitting to user room:', error);
    return false;
  }
};

// Emit event to role
const emitToRole = (role, event, data) => {
  try {
    io.to(`role:${role}`).emit(event, data);
    logger.info(`Emitted ${event} to role ${role}`);
    return true;
  } catch (error) {
    logger.error('Error emitting to role:', error);
    return false;
  }
};

// Emit event to appointment room
const emitToAppointment = (appointmentId, event, data) => {
  try {
    io.to(`appointment:${appointmentId}`).emit(event, data);
    logger.info(`Emitted ${event} to appointment ${appointmentId}`);
    return true;
  } catch (error) {
    logger.error('Error emitting to appointment:', error);
    return false;
  }
};

// Broadcast event to all connected clients
const broadcastEvent = (event, data) => {
  try {
    io.emit(event, data);
    logger.info(`Broadcasted ${event} to all clients`);
    return true;
  } catch (error) {
    logger.error('Error broadcasting event:', error);
    return false;
  }
};

// Check if user is online
const isUserOnline = (userId) => {
  return connectedUsers.has(userId.toString());
};

// Get all online users
const getOnlineUsers = () => {
  return Array.from(connectedUsers.keys());
};

// Get online user count
const getOnlineUserCount = () => {
  return connectedUsers.size;
};

module.exports = {
  initializeSocketIO,
  getIO,
  emitToUser,
  emitToUserRoom,
  emitToRole,
  emitToAppointment,
  broadcastEvent,
  isUserOnline,
  getOnlineUsers,
  getOnlineUserCount
};