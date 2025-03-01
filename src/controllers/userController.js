import { auth } from '../utils/auth.js';
import { getPool } from '../utils/db.js';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    // Registrar usuario en Better Auth
    const authResponse = await auth.createUser({
      email,
      password
    });

    // Guardar usuario en PostgreSQL
    const pool = getPool();
    const dbResponse = await pool.query(
      'INSERT INTO users (email, auth_id) VALUES ($1, $2) RETURNING id, email',
      [email, authResponse.userId]
    );

    res.status(201).json({
      user: dbResponse.rows[0],
      token: authResponse.token
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
    // Autenticar usuario en Better Auth
    const authResponse = await auth.authenticateUser({
      email,
      password
    });

    // Obtener información del usuario de la base de datos
    const pool = getPool();
    const dbResponse = await pool.query(
      'SELECT id, email FROM users WHERE email = $1',
      [email]
    );

    if (dbResponse.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      user: dbResponse.rows[0],
      token: authResponse.token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ message: 'Invalid credentials' });
  }
};