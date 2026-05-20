import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import fs from 'fs';
import dotenv from 'dotenv';
import logger from './logger.util.js';

dotenv.config();

let privateKey = null;
let publicKey = null;

/**
 * Initializes and retrieves the RSA Key Pair.
 * If private/public keys exist in file system or .env, loads them.
 * Otherwise, programmatically generates a temporary key pair for runtime.
 */
const initializeKeys = () => {
  if (privateKey && publicKey) return;

  try {
    // 1. Check file system paths
    const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH || 'private.key';
    const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH || 'public.key';

    if (fs.existsSync(privateKeyPath) && fs.existsSync(publicKeyPath)) {
      privateKey = fs.readFileSync(privateKeyPath, 'utf8');
      publicKey = fs.readFileSync(publicKeyPath, 'utf8');
      logger.info('🔑 JWT RS256 Key Pair loaded successfully from local files.');
      return;
    }

    // 2. Check direct environment variables
    if (process.env.JWT_PRIVATE_KEY && process.env.JWT_PUBLIC_KEY) {
      privateKey = process.env.JWT_PRIVATE_KEY.replace(/\\n/g, '\n');
      publicKey = process.env.JWT_PUBLIC_KEY.replace(/\\n/g, '\n');
      logger.info('🔑 JWT RS256 Key Pair loaded successfully from environment variables.');
      return;
    }

    // 3. Fallback: Programmatic on-the-fly RSA key pair generation
    logger.warn('⚠️ No JWT asymmetric keys found. Programmatically generating temporary 2048-bit RSA Key Pair...');
    const { privateKey: genPrivate, publicKey: genPublic } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    privateKey = genPrivate;
    publicKey = genPublic;
    
    // Save to disk in development for persistence across restarts
    if (process.env.NODE_ENV !== 'production') {
      fs.writeFileSync(privateKeyPath, privateKey);
      fs.writeFileSync(publicKeyPath, publicKey);
      logger.info('🔑 Persisted auto-generated developer RSA keys on-disk (private.key / public.key).');
    }
  } catch (error) {
    logger.error('❌ Failed to initialize JWT RS256 keys:', error);
    // Dev fallback to prevent server boot blocking
    privateKey = 'dev-fallback-private-key-secret';
    publicKey = 'dev-fallback-public-key-secret';
  }
};

initializeKeys();

export const signToken = (payload, options = {}) => {
  initializeKeys();
  const algorithm = (privateKey.includes('RSA') || privateKey.includes('PRIVATE KEY')) ? 'RS256' : 'HS256';
  
  const signOptions = {
    algorithm,
    expiresIn: process.env.JWT_ACCESS_TTL || '15m',
    ...options
  };

  return jwt.sign(payload, privateKey, signOptions);
};

export const verifyToken = (token, options = {}) => {
  initializeKeys();
  const algorithm = (publicKey.includes('RSA') || publicKey.includes('PUBLIC KEY')) ? 'RS256' : 'HS256';
  
  return jwt.verify(token, publicKey, {
    algorithms: [algorithm],
    ...options
  });
};
