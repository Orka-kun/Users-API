const express = require('express');
const { Pool } = require('pg'); // Changed from mysql2 to pg
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// PostgreSQL connection pool
const pool = new Pool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT),
  ssl: {  // Always use SSL in production
    rejectUnauthorized: false,
    require: true
  },
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('PostgreSQL connection error:', err);
    process.exit(1);
  }
  console.log('PostgreSQL Connected at:', res.rows[0].now);
});

// Add table creation
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    last_login TIMESTAMP DEFAULT NULL
  )
`).catch(err => {
  console.error('Error creating table:', err);
  process.exit(1);
});

const verifyUser = async (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);

    if (!rows.length) {
      return res.status(403).json({ error: 'User not found' });
    }

    const user = rows[0];

    // Check if the user is blocked
    if (user.status === 'blocked') {
      console.log('Blocked user attempted access:', user.id); // Debugging log
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('Token verification error:', err);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Serve static files from client/public
app.use(express.static(path.join(__dirname, '../client/public')));
// Handle SPA routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

app.post('/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields required' });

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log('Hashed password:', hashedPassword); // Debugging log

    const { rows } = await pool.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING *',
      [name, email, hashedPassword]
    );
    console.log('User inserted successfully:', rows[0].id); // Debugging log
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Registration error details:', {
      code: err.code,
      message: err.message,
      stack: err.stack,
    });
    if (err.code === '23505') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    console.log('Login attempt for email:', email); // Debugging log

    // Fetch user by email
    const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

    if (!rows.length) {
      console.log('No user found with email:', email); // Debugging log
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];
    console.log('User found:', user); // Debugging log

    // Check if user is blocked
    if (user.status === 'blocked') {
      console.log('Blocked user attempted login:', email); // Debugging log
      return res.status(403).json({ error: 'Your account has been blocked' });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch for email:', email); // Debugging log
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Update last login time
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    // Generate JWT token
    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('Login successful for email:', email); // Debugging log

    // Send response
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        status: user.status,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});
//temporary debug route
app.get('/debug-db', async (req, res) => {
  try {
    const users = await pool.query('SELECT * FROM users');
    res.json({
      status: 'success',
      db_connection: 'active',
      user_count: users.rowCount,
      sample_user: users.rows[0] || null
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

app.get('/users', verifyUser, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT id, name, email, status,
             TO_CHAR(last_login, 'YYYY-MM-DD HH24:MI:SS') as last_login
      FROM users
      ORDER BY last_login DESC
    `);
    
    // Return as plain array
    res.json(result.rows);
    
  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({ error: 'Database query failed' });
  }
});

// This should be LAST in your route definitions
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/public/index.html'));
});

app.post('/block', verifyUser, async (req, res) => {
  const { userIds } = req.body;
  try {
    // Check if trying to block self
    if (userIds.includes(req.user.id)) {
      console.log('User attempted to block themselves:', req.user.id); // Debugging log
      return res.status(403).json({ error: 'You cannot block yourself' });
    }

    // Proceed with blocking other users
    await pool.query('UPDATE users SET status = $1 WHERE id = ANY($2)', ['blocked', userIds]);
    res.json({ message: 'Users blocked successfully!' });
  } catch (err) {
    console.error('Block error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/unblock', verifyUser, async (req, res) => {
  const { userIds } = req.body;
  try {
    await pool.query('UPDATE users SET status = $1 WHERE id = ANY($2)', ['active', userIds]);
    res.json({ message: 'User unblocked successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/delete', verifyUser, async (req, res) => {
  const { userIds } = req.body;
  try {
    if (userIds.includes(req.user.id)) {
      return res.status(403).json({ error: 'Cannot delete yourself' });
    }
    await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    res.json({ message: 'User deleted successfully!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a root route for testing
const port = process.env.PORT || 5000;
// Add these before app.listen()
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log('Press Ctrl+C to stop');
});
// Add a root route with error handling
app.get('/', (req, res) => {
  try {
    res.send('Welcome to the User Management API');
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});
// const clientPublicPath = path.join(__dirname, '../client/public');
// app.use(express.static(clientPublicPath));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(clientPublicPath, 'index.html'));
// });

// const publicPath = path.join(__dirname, 'public');
// app.use(express.static(publicPath));
// app.get('*', (req, res) => {
//   res.sendFile(path.join(publicPath, 'index.html'));
// });
