/**
 * Common API response types used across the application.
 * The axios interceptor unwraps response.data, so api.get() returns
 * the inner object directly (i.e. ApiResponse<T>, not AxiosResponse<ApiResponse<T>>).
 */

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

/** Raw API plugin shape (before mapping to store Plugin) */
export interface ApiPlugin {
  id: string;
  name: string;
  description?: string;
  category: string;
  installCount?: number;
  scripts?: unknown[];
  scenarios?: unknown[];
  updatedAt?: string;
  version?: string;
  rating?: number;
}
