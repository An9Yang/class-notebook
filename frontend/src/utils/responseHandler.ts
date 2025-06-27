/**
 * Utility functions to handle various API response formats consistently
 */

/**
 * Extract data from various response formats
 * @param response - The API response
 * @param dataKey - The key to look for in the response (e.g., 'class', 'classes', 'user')
 * @returns The extracted data or null if not found
 */
export function extractResponseData(response: any, dataKey: string): any {
  // Direct access
  if (response && response[dataKey]) {
    return response[dataKey];
  }
  
  // Nested in data object
  if (response && response.data && response.data[dataKey]) {
    return response.data[dataKey];
  }
  
  // Direct object (for single items)
  if (response && (response._id || response.id)) {
    return response;
  }
  
  // Array response
  if (Array.isArray(response)) {
    return response;
  }
  
  return null;
}

/**
 * Extract error message from various error formats
 * @param error - The error object
 * @returns A user-friendly error message
 */
export function extractErrorMessage(error: any): string {
  // Check for custom error message
  if (error.message) {
    return error.message;
  }
  
  // Check for API response error
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  // Check for API response error in different format
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  
  // Network errors
  if (error.code === 'ECONNREFUSED') {
    return '无法连接到服务器，请检查服务器是否正在运行';
  }
  
  if (error.code === 'ETIMEDOUT') {
    return '请求超时，请检查网络连接';
  }
  
  // Default message
  return '操作失败，请稍后重试';
}

/**
 * Safe data access with fallback
 * @param obj - The object to access
 * @param path - The path to access (e.g., 'data.user.name')
 * @param defaultValue - The default value if path doesn't exist
 * @returns The value at the path or the default value
 */
export function safeAccess(obj: any, path: string, defaultValue: any = null): any {
  return path.split('.').reduce((acc, part) => {
    return acc && acc[part] !== undefined ? acc[part] : defaultValue;
  }, obj);
}