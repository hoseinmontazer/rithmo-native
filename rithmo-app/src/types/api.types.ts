/** Generic paginated list response */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/** Standard API error shape */
export interface ApiError {
  detail?: string;
  non_field_errors?: string[];
  [field: string]: string | string[] | undefined;
}

/** Axios error with typed response data */
export interface TypedAxiosError {
  response?: {
    status: number;
    data: ApiError;
    /** Axios lowercases header names on the response object. */
    headers?: Record<string, string>;
  };
  message: string;
}
