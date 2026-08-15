import type { ApiError, TypedAxiosError } from '@types/api.types';

/**
 * Extracts a human-readable error message from an Axios error response.
 */
export function extractErrorMessage(error: unknown): string {
  const axiosError = error as TypedAxiosError;

  if (axiosError?.response?.data) {
    const data = axiosError.response.data as ApiError;

    if (data.detail) {return data.detail;}
    if (data.non_field_errors?.length) {return data.non_field_errors[0];}

    // Collect first field-level error
    const firstField = Object.keys(data).find(k => k !== 'detail' && k !== 'non_field_errors');
    if (firstField) {
      const fieldError = data[firstField];
      if (Array.isArray(fieldError)) {return `${firstField}: ${fieldError[0]}`;}
      if (typeof fieldError === 'string') {return `${firstField}: ${fieldError}`;}
    }
  }

  if (axiosError?.message) {return axiosError.message;}
  return 'An unexpected error occurred. Please try again.';
}

export function isUnauthorizedError(error: unknown): boolean {
  return (error as TypedAxiosError)?.response?.status === 401;
}

export function isNetworkError(error: unknown): boolean {
  const axiosError = error as TypedAxiosError;
  return !axiosError?.response && !!axiosError?.message;
}
