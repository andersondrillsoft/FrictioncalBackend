import { betterAuth } from 'better-auth';

const authConfig = {
  apiKey: process.env.BETTER_AUTH_SECRET,
  endpoint: process.env.BETTER_AUTH_URL,
};

export const auth = betterAuth(authConfig);

export const validateAuthConfig = () => {
  if (!process.env.BETTER_AUTH_SECRET || !process.env.BETTER_AUTH_URL) {
    throw new Error('Missing required Better Auth configuration');
  }
}; 