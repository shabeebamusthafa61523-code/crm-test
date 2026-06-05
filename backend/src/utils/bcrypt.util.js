import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const saltRounds = parseInt(process.env.BCRYPT_ROUNDS || '12');

/**
 * Hash plain text password using bcrypt salt
 * @param {string} password Raw text password
 * @returns {Promise<string>} Encrypted hash
 */
export const hashPassword = async (password) => {
  return bcrypt.hash(password, saltRounds);
};

/**
 * Compare plain text password with hashed value
 * @param {string} password Raw text password
 * @param {string} hash Hashed string from database
 * @returns {Promise<boolean>} Match boolean
 */
export const comparePassword = async (password, hash) => {
  return bcrypt.compare(password, hash);
};
