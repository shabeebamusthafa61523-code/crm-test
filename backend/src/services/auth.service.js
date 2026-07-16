import crypto from 'crypto';
import redis from '../config/redis.js';
import User from '../models/user.model.js';
import { signToken } from '../utils/jwt.util.js';
import { comparePassword, hashPassword } from '../utils/bcrypt.util.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../utils/logger.util.js';

const LOCKOUT_ATTEMPTS = 5;
const LOCKOUT_TIME_SECONDS = 15 * 60; // 15 Minutes lockout

export const authService = {
  /**
   * Enforces brute-force lockout and performs credential verification
   */
  authenticateUser: async (email, password, ipAddress) => {
    // 1. Check Redis brute-force account lockout status
    const lockoutKey = `login_lockout:${email}`;
    const failedAttemptsKey = `login_failed_attempts:${email}`;
    
    const isLocked = await redis.get(lockoutKey);
    if (isLocked) {
      const ttl = await redis.ttl(lockoutKey);
      throw new AppError(`Account is temporarily locked. Please retry in ${Math.ceil(ttl / 60)} minutes.`, 423);
    }

    // 2. Query user records
    const user = await User.findOne({ email }).populate('departmentId');

    if (!user || !user.isActive) {
      // Increment failures in Redis even for non-existent users to prevent user-enumeration timing leaks
      await authService.incrementFailedAttempts(email);
      throw new AppError('Invalid email or password credentials supplied.', 401);
    }

    // 3. Verify bcrypt password hash
    const isMatch = await comparePassword(password, user.password || user.passwordHash);
    if (!isMatch) {
      await authService.incrementFailedAttempts(email);
      throw new AppError('Invalid email or password credentials supplied.', 401);
    }

    // 4. Successful Login: Clear login attempt counters
    await redis.del(failedAttemptsKey);
    await redis.del(lockoutKey);

    // 5. Update DB lastLogin audit stamp
    await User.findByIdAndUpdate(user.id || user._id, { lastLogin: new Date() });

    return user;
  },

  /**
   * Helper to increment login failure counters in Redis
   */
  incrementFailedAttempts: async (email) => {
    const failedAttemptsKey = `login_failed_attempts:${email}`;
    const lockoutKey = `login_lockout:${email}`;

    const attempts = await redis.incr(failedAttemptsKey);
    
    // Set TTL on attempt counter if new
    if (attempts === 1) {
      await redis.expire(failedAttemptsKey, 24 * 60 * 60); // 24 hours window
    }

    if (attempts >= LOCKOUT_ATTEMPTS) {
      await redis.set(lockoutKey, 'LOCKED', 'EX', LOCKOUT_TIME_SECONDS);
      await redis.del(failedAttemptsKey); // Reset attempts after locking
      logger.warn(`🔒 Brute-force lockout triggered: Email "${email}" has been locked for 15 minutes.`);
    }
  },

  /**
   * Generate highly secure Asymmetric Access Token (RS256) and Refresh Token (UUID)
   */
  issueTokens: async (user, ipAddress) => {
    const jti = crypto.randomUUID(); // Unique JWT identifier to track sessions
    const refreshToken = crypto.randomUUID();

    // 1. Sign access token (expires in 15 mins)
    const accessPayload = {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId || null,
      employeeId: user.employeeId
    };
    
    const accessToken = signToken(accessPayload, { jwtid: jti });

    // 2. Store Refresh Token in Redis with 7-day TTL
    // Maps: refresh_token:UUID -> { userId, role, departmentId, jti, ipAddress }
    const refreshSession = {
      userId: user.id,
      role: user.role,
      departmentId: user.departmentId || null,
      jti,
      ipAddress
    };

    await redis.set(
      `refresh_session:${refreshToken}`,
      JSON.stringify(refreshSession),
      'EX',
      7 * 24 * 60 * 60 // 7 days
    );

    return {
      accessToken,
      refreshToken
    };
  },

  /**
   * Rotates and validates active Refresh Tokens. Performs Session Reuse Hijack detection.
   */
  rotateSession: async (oldRefreshToken, requestIp) => {
    const sessionKey = `refresh_session:${oldRefreshToken}`;
    const sessionData = await redis.get(sessionKey);

    if (!sessionData) {
      // REUSE / HIJACK ATTACK DETECTION:
      // If a refresh token is requested but not found, it might have been rotated/reused already.
      // Search if this token was recorded in our revoked log to determine if it is a replay.
      const isReused = await redis.get(`revoked_refresh:${oldRefreshToken}`);
      if (isReused) {
        const victimUserId = isReused; // Contains the userId saved during revocation
        logger.error(`🚨 ALERT: Session Hijack Detected! Replay of revoked refresh token: ${oldRefreshToken} for user: ${victimUserId}`);
        
        // Revoke ALL active sessions for this compromised user
        await authService.revokeAllSessions(victimUserId);
        throw new AppError('Security Intrusion Blocked. Session compromised. All active devices logged out.', 401);
      }

      throw new AppError('Session Invalid or Expired. Please log in again.', 401);
    }

    const session = JSON.parse(sessionData);

    // Optional: IP binding check for access anomalies
    if (session.ipAddress && session.ipAddress !== requestIp) {
      logger.warn(`⚠️ Session Rotation IP Mismatch: Session bound to ${session.ipAddress} but rotated from ${requestIp}`);
    }

    // 1. Revoke the old refresh token immediately by deleting from active set
    await redis.del(sessionKey);
    // Mark as rotated/revoked in Redis for 48 hours to capture any future replays (intruder check)
    await redis.set(`revoked_refresh:${oldRefreshToken}`, session.userId, 'EX', 48 * 60 * 60);

    // 2. Load user to fetch latest permissions/active state
    const user = await User.findById(session.userId);

    if (!user || !user.isActive) {
      throw new AppError('User account associated with this session is inactive or deleted.', 401);
    }

    // 3. Issue fresh token pairs
    return authService.issueTokens(user, requestIp);
  },

  /**
   * Log out active session by deleting the refresh token from Redis
   */
  destroySession: async (refreshToken, accessTokenJti) => {
    // 1. Revoke refresh token session
    await redis.del(`refresh_session:${refreshToken}`);

    // 2. Add current Access Token JTI to session blacklist for remainder of its TTL (15 mins)
    if (accessTokenJti) {
      await redis.set(`revoked_session:${accessTokenJti}`, 'REVOKED', 'EX', 15 * 60);
    }
  },

  /**
   * Revoke all refresh sessions in Redis for a specific User ID
   */
  revokeAllSessions: async (userId) => {
    logger.info(`🧹 Revoking all active sessions for User: ${userId}`);
    
    try {
      // Scan Redis keys for sessions matching this user
      let cursor = '0';
      do {
        const [newCursor, keys] = await redis.scan(cursor, 'MATCH', 'refresh_session:*', 'COUNT', 100);
        cursor = newCursor;
        
        for (const key of keys) {
          const data = await redis.get(key);
          if (data) {
            const session = JSON.parse(data);
            if (session.userId === userId) {
              await redis.del(key);
              // Blacklist the corresponding access JTI
              if (session.jti) {
                await redis.set(`revoked_session:${session.jti}`, 'REVOKED', 'EX', 15 * 60);
              }
            }
          }
        }
      } while (cursor !== '0');
    } catch (redisError) {
      logger.warn(`⚠️ Redis sessions revocation failed or Redis is offline: ${redisError.message}`);
    }
  }
};
