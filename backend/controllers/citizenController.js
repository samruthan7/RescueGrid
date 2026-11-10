const jwt = require('jsonwebtoken');
const repository = require('../repositories');
const { normalizeIndianPhone } = require('../utils/phone');
const { JWT_SECRET } = require('../middleware/citizenAuth');

/**
 * Citizen Login / Self-Registration via Name + Indian Mobile
 * Upserts citizen into data store and signs a 7-day Citizen JWT
 */
async function login(req, res, next) {
  try {
    const { name, phone } = req.body || {};

    // Validate Name (minimum 2 characters)
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({
        error: 'Please enter your full name (minimum 2 characters).'
      });
    }

    if (name.trim().length > 100) {
      return res.status(400).json({
        error: 'Name cannot exceed 100 characters.'
      });
    }

    // Validate and normalize Indian phone
    const phoneResult = normalizeIndianPhone(phone);
    if (!phoneResult.isValid) {
      return res.status(400).json({
        error: phoneResult.error
      });
    }

    const cleanName = name.trim();
    const normalizedPhone = phoneResult.normalized;

    // Upsert into repository
    const citizen = await repository.upsertCitizen({
      name: cleanName,
      phone: normalizedPhone
    });

    // Sign Citizen JWT (7-day validity)
    const token = jwt.sign(
      {
        id: citizen.id,
        name: citizen.name,
        phone: citizen.phone,
        role: 'citizen'
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: `Welcome, ${citizen.name}! Citizen authentication verified.`,
      token,
      citizen: {
        id: citizen.id,
        name: citizen.name,
        phone: citizen.phone
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get currently authenticated citizen profile
 */
async function getMe(req, res) {
  return res.json({
    citizen: {
      id: req.citizen.id,
      name: req.citizen.name,
      phone: req.citizen.phone,
      role: req.citizen.role
    }
  });
}

/**
 * Get all incidents reported by this citizen
 */
async function getMyIncidents(req, res, next) {
  try {
    const incidents = await repository.getByCitizenId(req.citizen.id);
    return res.json({
      total: incidents.length,
      incidents
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  login,
  getMe,
  getMyIncidents
};
