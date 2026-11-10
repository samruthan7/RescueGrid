const assistantService = require('../services/assistantService');

/**
 * Citizen Safety Assistant endpoint (protected by citizenAuth)
 */
async function chatCitizen(req, res, next) {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const response = await assistantService.chatCitizen({
      citizenId: req.citizen.id,
      citizenName: req.citizen.name,
      message,
      history: Array.isArray(history) ? history : []
    });

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

/**
 * Authority Tactical Operations Assistant endpoint (protected by authenticateAuthority)
 */
async function chatAuthority(req, res, next) {
  try {
    const { message, history } = req.body || {};
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required.' });
    }

    const response = await assistantService.chatAuthority({
      username: req.user?.username || 'Commander',
      message,
      history: Array.isArray(history) ? history : []
    });

    return res.json(response);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  chatCitizen,
  chatAuthority
};
