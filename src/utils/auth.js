import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRES_IN = '7d'; // 7 days
const REFRESH_TOKEN_EXPIRES_IN = '30d'; // 30 days

export const auth = {
  async hashPassword(password) {
    return bcrypt.hash(password, SALT_ROUNDS);
  },

  async comparePasswords(password, hash) {
    return bcrypt.compare(password, hash);
  },

  async generateToken(userId) {
    // Generate access token
    const accessToken = jwt.sign({ userId }, process.env.JWT_SECRET, {
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    });

    // Generate refresh token
    const refreshToken = jwt.sign({ userId, type: 'refresh' }, process.env.JWT_SECRET, {
      expiresIn: REFRESH_TOKEN_EXPIRES_IN
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: ACCESS_TOKEN_EXPIRES_IN
    };
  },

  async verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  },

  async refreshAccessToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);
      
      // Verify it's a refresh token
      if (!decoded.type || decoded.type !== 'refresh') {
        throw new Error('Invalid refresh token');
      }

      // Generate new access token
      const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
      });

      return {
        accessToken,
        expiresIn: ACCESS_TOKEN_EXPIRES_IN
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }
};

export const validateAuthConfig = () => {
  if (!process.env.JWT_SECRET) {
    throw new Error('Missing required JWT_SECRET configuration');
  }
}; 