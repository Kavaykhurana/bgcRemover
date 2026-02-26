export class AppError extends Error {
  constructor(message, statusCode, errorCode) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message, errorCode = 'VALIDATION_ERROR') {
    super(message, 400, errorCode);
  }
}

export class FileTooLargeError extends AppError {
  constructor(message = 'Maximum file size is 5MB.') {
    super(message, 413, 'FILE_TOO_LARGE');
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Only JPEG, PNG, and WebP are supported.') {
    super(message, 415, 'INVALID_FILE_TYPE');
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many requests. Try again later.', retryAfter = 60) {
    super(message, 429, 'RATE_LIMITED');
    this.retryAfter = retryAfter;
  }
}

export class ProcessingError extends AppError {
  constructor(message = 'Background removal failed. Please try a different image.') {
    super(message, 500, 'PROCESSING_FAILED');
  }
}
