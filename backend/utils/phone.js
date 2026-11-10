/**
 * Utility to normalize and validate Indian phone numbers into E.164 format (+91XXXXXXXXXX)
 */

function normalizeIndianPhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number is required.'
    };
  }

  // Remove spaces, hyphens, brackets, dots
  let clean = phone.replace(/[\s\-\(\)\.]/g, '').trim();

  // Strip leading + if any
  let hasPlus = false;
  if (clean.startsWith('+')) {
    hasPlus = true;
    clean = clean.slice(1);
  }

  let nationalNumber = '';

  if (clean.startsWith('91') && (clean.length === 12 || hasPlus)) {
    nationalNumber = clean.slice(2);
  } else if (clean.startsWith('0') && clean.length === 11) {
    nationalNumber = clean.slice(1);
  } else if (clean.length === 10) {
    nationalNumber = clean;
  } else {
    return {
      isValid: false,
      normalized: '',
      error: 'Please enter a valid 10-digit Indian phone number (e.g. 9849012345 or +919849012345).'
    };
  }

  // Ensure nationalNumber contains exactly 10 digits
  if (!/^\d{10}$/.test(nationalNumber)) {
    return {
      isValid: false,
      normalized: '',
      error: 'Phone number must contain exactly 10 numeric digits.'
    };
  }

  const normalized = `+91${nationalNumber}`;
  return {
    isValid: true,
    normalized,
    nationalNumber
  };
}

module.exports = {
  normalizeIndianPhone
};
