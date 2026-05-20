/**
 * Custom Operational Error Class
 */
export class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    // Check if status code starts with 4 (client error) or 5 (server error)
    this.status = String(statusCode).startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Global Express Error Handling Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  console.error(`[Error Log] 🔥 ${err.message}`);
  
  res.status(statusCode).json({
    status: err.status || 'error',
    message: err.message || 'Internal Server Error'
  });
};

export default errorHandler;