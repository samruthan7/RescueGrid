const VALID_CATEGORIES = [
  'Fire Emergency',
  'Road Accident',
  'Medical Emergency',
  'Flood',
  'Building Collapse',
  'Other Emergencies'
];

const VALID_YES_NO_UNKNOWN = ['Yes', 'No', 'Unknown'];
const VALID_INJURIES = ['None', 'Minor', 'Serious', 'Unknown'];

// Simple sanitizer stripping HTML tags and control chars
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[\x00-\x1F\x7F]/g, '') // remove control characters
    .trim();
}

function validateIncidentInput(body) {
  const errors = {};

  const title = sanitizeString(body.title);
  const description = sanitizeString(body.description);
  const category = sanitizeString(body.category);
  const location = sanitizeString(body.location);
  const contactName = sanitizeString(body.contactName);
  const contactPhone = sanitizeString(body.contactPhone);
  const contactEmail = sanitizeString(body.contactEmail);

  // Validate Title
  if (!title || title.length < 5) {
    errors.title = 'Incident title must be at least 5 characters long.';
  } else if (title.length > 150) {
    errors.title = 'Incident title must not exceed 150 characters.';
  }

  // Validate Description
  if (!description || description.length < 20) {
    errors.description = 'Incident description must be at least 20 characters long.';
  } else if (description.length > 2500) {
    errors.description = 'Incident description must not exceed 2500 characters.';
  }

  // Validate Category
  if (!category || !VALID_CATEGORIES.includes(category)) {
    errors.category = `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}`;
  }

  // Validate Location
  if (!location || location.length < 3) {
    errors.location = 'Location description or address is required (at least 3 characters).';
  } else if (location.length > 250) {
    errors.location = 'Location must not exceed 250 characters.';
  }

  // Validate People Affected
  const peopleAffectedNum = Number(body.peopleAffected);
  if (
    body.peopleAffected === undefined ||
    body.peopleAffected === null ||
    body.peopleAffected === '' ||
    isNaN(peopleAffectedNum) ||
    !Number.isInteger(peopleAffectedNum) ||
    peopleAffectedNum < 0 ||
    peopleAffectedNum > 10000
  ) {
    errors.peopleAffected = 'Number of people affected must be an integer between 0 and 10,000.';
  }

  // Validate optional contact info if provided
  if (contactEmail) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactEmail)) {
      errors.contactEmail = 'Please provide a valid email address.';
    }
  }

  if (contactPhone) {
    const phoneRegex = /^[0-9+\-()#\s.]{7,20}$/;
    if (!phoneRegex.test(contactPhone)) {
      errors.contactPhone = 'Please provide a valid phone number (min 7 digits).';
    }
  }

  // Validate optional risk questions (defaulting to Unknown if empty or invalid)
  let peopleTrapped = body.peopleTrapped;
  if (!peopleTrapped || !VALID_YES_NO_UNKNOWN.includes(peopleTrapped)) {
    peopleTrapped = 'Unknown';
  }

  let immediateDanger = body.immediateDanger;
  if (!immediateDanger || !VALID_YES_NO_UNKNOWN.includes(immediateDanger)) {
    immediateDanger = 'Unknown';
  }

  let injuries = body.injuries;
  if (!injuries || !VALID_INJURIES.includes(injuries)) {
    injuries = 'Unknown';
  }

  // Validate optional coordinates
  let latitude = null;
  let longitude = null;
  if (body.latitude !== undefined && body.latitude !== null && body.latitude !== '') {
    const lat = Number(body.latitude);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      latitude = lat;
    }
  }
  if (body.longitude !== undefined && body.longitude !== null && body.longitude !== '') {
    const lon = Number(body.longitude);
    if (!isNaN(lon) && lon >= -180 && lon <= 180) {
      longitude = lon;
    }
  }

  const isValid = Object.keys(errors).length === 0;

  return {
    isValid,
    errors,
    sanitized: {
      title,
      description,
      category,
      location,
      latitude,
      longitude,
      peopleAffected: peopleAffectedNum,
      contactName,
      contactPhone,
      contactEmail,
      peopleTrapped,
      immediateDanger,
      injuries
    }
  };
}

module.exports = {
  validateIncidentInput,
  VALID_CATEGORIES
};
