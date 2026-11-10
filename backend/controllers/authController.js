const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authorities = require('../authorityRepository');

const sign = (username) =>
  jwt.sign({ username, role: 'authority' }, process.env.JWT_SECRET, { expiresIn: '8h' });

exports.login = async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Missing credentials' });

  // Built-in demo admin from .env
  if (username === process.env.AUTHORITY_USERNAME && password === process.env.AUTHORITY_PASSWORD)
    return res.json({ token: sign(username), username });

  // Registered authorities
  const user = authorities.findByUsername(username);
  if (user && await bcrypt.compare(password, user.passwordHash))
    return res.json({ token: sign(user.username), username: user.username });

  res.status(401).json({ error: 'Invalid username or password' });
};

exports.register = async (req, res) => {
  const { username, password, fullName, department, registrationCode } = req.body || {};
  if (registrationCode !== process.env.AUTHORITY_REGISTRATION_CODE)
    return res.status(403).json({ error: 'Invalid registration code' });
  if (!username || username.trim().length < 3)
    return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (!password || password.length < 8)
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  if (
    authorities.findByUsername(username.trim()) ||
    username.trim().toLowerCase() === (process.env.AUTHORITY_USERNAME || '').toLowerCase()
  )
    return res.status(409).json({ error: 'Username already taken' });

  const clean = username.trim();
  authorities.create({
    username: clean,
    fullName: (fullName || '').trim(),
    department: (department || '').trim(),
    passwordHash: await bcrypt.hash(password, 10),
    createdAt: new Date().toISOString(),
  });
  res.status(201).json({ token: sign(clean), username: clean });
};