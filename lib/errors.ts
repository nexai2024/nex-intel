/**
 * Custom error classes for better error handling
 */
export class IntelBoxError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string,
    public details?: any
  ) {
    super(message);
    this.name = 'IntelBoxError';
  }
}

export class AuthenticationError extends IntelBoxError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'AUTHENTICATION_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends IntelBoxError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'AUTHORIZATION_ERROR');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends IntelBoxError {
  constructor(message: string = 'Resource not found') {
    super(message, 404, 'NOT_FOUND_ERROR');
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends IntelBoxError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends IntelBoxError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class ExternalServiceError extends IntelBoxError {
  constructor(service: string, message: string, statusCode: number = 502) {
    super(`${service} error: ${message}`, statusCode, 'EXTERNAL_SERVICE_ERROR', { service });
    this.name = 'ExternalServiceError';
  }
}

/**
 * Error handler utility functions
 */
export function handleError(error: any): IntelBoxError {
  if (error instanceof IntelBoxError) {
    return error;
  }

  // Handle common error types
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        return new ValidationError('Resource already exists', {
          field: prismaError.meta?.target
        });
      case 'P2025':
        return new NotFoundError('Resource not found');
      case 'P2003':
        return new ValidationError('Invalid reference', {
          field: prismaError.meta?.field_name
        });
      default:
        return new IntelBoxError('Database error occurred', 500, 'DATABASE_ERROR');
    }
  }

  if (error.name === 'PrismaClientUnknownRequestError') {
    return new IntelBoxError('Database connection error', 503, 'DATABASE_CONNECTION_ERROR');
  }

  if (error.name === 'FetchError') {
    return new ExternalServiceError('Network', error.message);
  }

  // Default error
  return new IntelBoxError(
    error.message || 'An unexpected error occurred',
    error.statusCode || 500
  );
}

/**
 * Logging utility
 */
export function logError(error: IntelBoxError, context?: any) {
  const logData = {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      details: error.details,
      stack: error.stack
    },
    context,
    timestamp: new Date().toISOString()
  };

  console.error(JSON.stringify(logData, null, 2));

  // In production, you'd want to send this to a logging service
  // like Sentry, LogRocket, etc.
}

/**
 * API response helper for errors
 */
export function createErrorResponse(error: IntelBoxError) {
  return new Response(
    JSON.stringify({
      error: {
        message: error.message,
        code: error.code,
        details: error.details
      }
    }),
    {
      status: error.statusCode,
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
}