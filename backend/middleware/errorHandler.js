function errorHandler(err, req, res, next) {
  console.error('[RescueGrid API Error]', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Emergency Server Error';

  res.status(status).json({
    error: message,
    timestamp: new Date().toISOString()
  });
}

module.exports = errorHandler;
