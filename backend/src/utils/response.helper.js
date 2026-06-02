// src/utils/response.helper.js

/**
 * Standard Success Response Wrapper
 * @param {Object} res - Express response object
 * @param {String} message - Custom message
 * @param {Object|Array|null} data - Response payload
 * @param {Number} statusCode - HTTP status code (default: 200)
 */
export const sendSuccess = (res, message = 'Success', data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data
  });
};

/**
 * Standard Error Response Wrapper
 * @param {Object} res - Express response object
 * @param {String} message - Error details or message
 * @param {Number} statusCode - HTTP status code (default: 500)
 * @param {Object|Array|null} data - Optional extra info
 */
export const sendError = (res, message = 'Internal server error occurred', statusCode = 500, data = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    data
  });
};
