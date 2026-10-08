/**
 * Extracts and formats user-friendly error messages from API responses, Axios errors,
 * validation errors, or network issues.
 */
export function formatApiError(err: any, fallback = 'An unexpected error occurred'): string {
  if (!err) return fallback;

  // 1. Structured backend error responses (e.g. NestJS HttpException, ValidationPipe)
  if (err.response?.data) {
    const data = err.response.data;

    // NestJS ValidationPipe returning array of validation messages
    if (Array.isArray(data.message) && data.message.length > 0) {
      return data.message
        .map((m: any) => (typeof m === 'string' ? m : JSON.stringify(m)))
        .join(' · ');
    }

    // Direct string message from HttpException
    if (typeof data.message === 'string' && data.message.trim().length > 0) {
      return data.message.trim();
    }

    // Nested error string
    if (typeof data.error === 'string' && data.error.trim().length > 0) {
      return data.error.trim();
    }

    if (typeof data === 'string' && data.trim().length > 0) {
      return data.trim();
    }
  }

  // 2. Network connectivity / server down
  if (err.code === 'ERR_NETWORK' || err.message === 'Network Error') {
    return 'Unable to connect to server. Please check your network connection or verify the backend service is running.';
  }

  // 3. Request timeout
  if (err.code === 'ECONNABORTED' || (typeof err.message === 'string' && err.message.toLowerCase().includes('timeout'))) {
    return 'The server request timed out. Please try again.';
  }

  // 4. Axios generic HTTP status errors (e.g., "Request failed with status code 400")
  if (typeof err.message === 'string' && err.message.trim().length > 0) {
    if (err.message.includes('Request failed with status code')) {
      const status = err.response?.status;
      switch (status) {
        case 400:
          return 'Invalid request data. Please check form fields and required values.';
        case 401:
          return 'Authentication session expired. Please sign in again.';
        case 403:
          return 'Permission denied: you do not have authorization to perform this operation.';
        case 404:
          return 'The requested resource or record was not found.';
        case 409:
          return 'Conflict detected: this record, chassis number, code, or identifier already exists.';
        case 422:
          return 'Unprocessable entity: the submitted data violated business constraints.';
        case 500:
          return 'Internal server error occurred. Please contact system administration.';
        default:
          return `Server returned an error (${status}). Please try again.`;
      }
    }
    return err.message.trim();
  }

  if (typeof err === 'string' && err.trim().length > 0) {
    return err.trim();
  }

  return fallback;
}
