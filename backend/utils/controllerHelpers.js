function buildValidationError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizeText(value, { empty = null } = {}) {
  if (value == null) {
    return empty;
  }

  const trimmedValue = String(value).trim();
  return trimmedValue ? trimmedValue : empty;
}

function parseIntegerId(value, invalidMessage = 'Invalid id') {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue)) {
    throw buildValidationError(invalidMessage);
  }

  return parsedValue;
}

function sendErrorResponse(res, error, fallbackMessage = 'Request failed') {
  const statusCode = error?.statusCode || 500;

  if (!error?.statusCode || statusCode >= 500) {
    console.error(error);
  }

  return res.status(statusCode).json({
    error: error?.message || fallbackMessage
  });
}

module.exports = {
  buildValidationError,
  normalizeText,
  parseIntegerId,
  sendErrorResponse
};
