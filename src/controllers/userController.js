import { auth } from '../utils/auth.js';
import { getPool } from '../utils/db.js';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Hash the password
    const hashedPassword = await auth.hashPassword(password);

    // Save user in PostgreSQL
    const pool = getPool();
    const dbResponse = await pool.query(
      'INSERT INTO users (email, auth_id) VALUES ($1, $2) RETURNING id, email',
      [email, hashedPassword]
    );

    // Generate tokens
    const tokens = await auth.generateToken(dbResponse.rows[0].id);

    res.status(201).json({
      user: dbResponse.rows[0],
      ...tokens
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === '23505') { // PostgreSQL unique violation
      return res.status(409).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Error registering user' });
  }
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Get user from database
    const pool = getPool();
    const dbResponse = await pool.query(
      'SELECT id, email, auth_id FROM users WHERE email = $1',
      [email]
    );

    if (dbResponse.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = dbResponse.rows[0];

    // Verify password
    const isValidPassword = await auth.comparePasswords(password, user.auth_id);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate tokens
    const tokens = await auth.generateToken(user.id);

    res.status(200).json({
      user: {
        id: user.id,
        email: user.email
      },
      ...tokens
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Error during login' });
  }
};

export const refreshToken = async (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token is required' });
  }

  try {
    const tokens = await auth.refreshAccessToken(refreshToken);
    res.json(tokens);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(401).json({ message: 'Invalid refresh token' });
  }
};