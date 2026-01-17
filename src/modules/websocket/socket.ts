import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { redis, redisHelpers } from '../../config/redis';
import { CACHE_KEYS, VENDOR_LIVE_TTL } from '../../utils/constants';
import { JWTPayload } from '../../middleware/auth';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  vendorId?: string;
  userType?: 'user' | 'vendor';
}

interface VendorLocation {
  vendorId: string;
  lat: number;
  lng: number;
  timestamp: number;
  isOpen: boolean;
}

let io: Server | null = null;

export function initializeWebSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGINS?.split(',') || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = jwt.verify(token, env.JWT_SECRET) as JWTPayload;
      
      if (payload.type === 'user') {
        socket.userId = payload.uuid;
        socket.userType = 'user';
      } else if (payload.type === 'vendor') {
        socket.vendorId = payload.uuid;
        socket.userType = 'vendor';
      }

      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Socket connected: ${socket.id} (${socket.userType})`);

    // ==================== User Events ====================
    if (socket.userType === 'user' && socket.userId) {
      // User joins their own room for notifications
      socket.join(`user:${socket.userId}`);

      // User subscribes to nearby vendors
      socket.on('subscribe:nearby', async (data: { lat: number; lng: number; radiusKm: number }) => {
        const { lat, lng, radiusKm } = data;
        const radiusM = radiusKm * 1000;

        try {
          // Get nearby live vendors from Redis GeoSet
          const nearbyVendors = await redisHelpers.geoRadius(
            CACHE_KEYS.VENDOR_LOCATION,
            lng,
            lat,
            radiusM,
            'm'
          );

          // Join rooms for each nearby vendor
          for (const vendorId of nearbyVendors) {
            socket.join(`vendor:${vendorId}`);
          }

          // Send initial vendor locations
          const locations = await getVendorLocations(nearbyVendors);
          socket.emit('vendors:nearby', locations);
        } catch (error) {
          console.error('Error subscribing to nearby vendors:', error);
          socket.emit('error', { message: 'Failed to get nearby vendors' });
        }
      });

      // User unsubscribes from vendor updates
      socket.on('unsubscribe:vendors', () => {
        // Leave all vendor rooms
        const rooms = Array.from(socket.rooms);
        rooms.forEach((room) => {
          if (room.startsWith('vendor:')) {
            socket.leave(room);
          }
        });
      });

      // User subscribes to expedition updates
      socket.on('subscribe:expedition', (expeditionId: string) => {
        socket.join(`expedition:${expeditionId}`);
      });

      socket.on('unsubscribe:expedition', (expeditionId: string) => {
        socket.leave(`expedition:${expeditionId}`);
      });
    }

    // ==================== Vendor Events ====================
    if (socket.userType === 'vendor' && socket.vendorId) {
      // Vendor joins their own room
      socket.join(`vendor:${socket.vendorId}`);

      // Vendor updates their location
      socket.on('vendor:location', async (data: { lat: number; lng: number; isOpen: boolean }) => {
        const { lat, lng, isOpen } = data;
        const vendorId = socket.vendorId!;

        try {
          // Update location in Redis GeoSet
          await redisHelpers.geoAdd(CACHE_KEYS.VENDOR_LOCATION, lng, lat, vendorId);

          // Set TTL for live status
          await redis.set(
            `${CACHE_KEYS.VENDOR_SUMMARY(vendorId)}:live`,
            JSON.stringify({ lat, lng, isOpen, timestamp: Date.now() }),
          );
          await redis.expire(`${CACHE_KEYS.VENDOR_SUMMARY(vendorId)}:live`, VENDOR_LIVE_TTL);

          // Broadcast to all users watching this vendor
          const locationUpdate: VendorLocation = {
            vendorId,
            lat,
            lng,
            timestamp: Date.now(),
            isOpen,
          };

          io?.to(`vendor:${vendorId}`).emit('vendor:location:update', locationUpdate);
        } catch (error) {
          console.error('Error updating vendor location:', error);
          socket.emit('error', { message: 'Failed to update location' });
        }
      });

      // Vendor goes offline
      socket.on('vendor:offline', async () => {
        const vendorId = socket.vendorId!;
        
        try {
          // Remove from live locations
          await redis.zrem(CACHE_KEYS.VENDOR_LOCATION, vendorId);
          await redis.del(`${CACHE_KEYS.VENDOR_SUMMARY(vendorId)}:live`);

          // Broadcast offline status
          io?.to(`vendor:${vendorId}`).emit('vendor:offline', { vendorId });
        } catch (error) {
          console.error('Error setting vendor offline:', error);
        }
      });
    }

    // ==================== Common Events ====================
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    socket.on('disconnect', async (reason) => {
      console.log(`Socket disconnected: ${socket.id} (${reason})`);

      // If vendor disconnects, mark them as potentially offline
      if (socket.userType === 'vendor' && socket.vendorId) {
        // Don't immediately remove - they might reconnect
        // The TTL on their live status will handle cleanup
      }
    });
  });

  console.log('WebSocket server initialized');
  return io;
}

// ==================== Helper Functions ====================
async function getVendorLocations(vendorIds: string[]): Promise<VendorLocation[]> {
  const locations: VendorLocation[] = [];

  for (const vendorId of vendorIds) {
    const cached = await redis.get(`${CACHE_KEYS.VENDOR_SUMMARY(vendorId)}:live`);
    if (cached) {
      const data = JSON.parse(cached);
      locations.push({
        vendorId,
        lat: data.lat,
        lng: data.lng,
        timestamp: data.timestamp,
        isOpen: data.isOpen,
      });
    }
  }

  return locations;
}

// ==================== Export Functions for Other Modules ====================
export function getIO(): Server | null {
  return io;
}

export function emitToUser(userId: string, event: string, data: any): void {
  io?.to(`user:${userId}`).emit(event, data);
}

export function emitToVendor(vendorId: string, event: string, data: any): void {
  io?.to(`vendor:${vendorId}`).emit(event, data);
}

export function emitToExpedition(expeditionId: string, event: string, data: any): void {
  io?.to(`expedition:${expeditionId}`).emit(event, data);
}

export function broadcastVendorLocation(location: VendorLocation): void {
  io?.to(`vendor:${location.vendorId}`).emit('vendor:location:update', location);
}
