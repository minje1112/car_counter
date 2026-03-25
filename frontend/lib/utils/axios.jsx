import axios from 'axios';
import { API_BASE_URL } from '../config';

// Create axios instance with base configuration
const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    // Add auth token to requests if available
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // Handle errors globally with specific messages
    let errorMessage = 'An error occurred';
    
    if (error.response) {
      const status = error.response.status;
      
      switch (status) {
        case 400:
          errorMessage = error.response.data?.message || 'Bad Request - Invalid data submitted';
          break;
        case 401:
          errorMessage = error.response.data?.message || 'Session expired. Please login again.';
          // Handle 401 by logging out and redirecting to login smoothly
          if (typeof window !== 'undefined') {
            // Clear user data
            localStorage.removeItem('user');
            
            // Smooth redirect with a small delay
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
          break;
        case 403:
          errorMessage = error.response.data?.message || 'Forbidden - You don\'t have permission to access this resource';
          break;
        case 404:
          errorMessage = error.response.data?.message || 'Not Found - The requested resource was not found';
          break;
        case 500:
          errorMessage = error.response.data?.message || 'Internal Server Error - Something went wrong on the server';
          break;
        case 502:
          errorMessage = 'Bad Gateway - Server is temporarily unavailable';
          break;
        case 503:
          errorMessage = 'Service Unavailable - Server is currently unable to handle the request';
          break;
        default:
          errorMessage = error.response.data?.message || `Error ${status} - ${error.message}`;
      }
      
      // console.error(`API Error [${status}]:`, errorMessage);
    } else if (error.request) {
      // Request was made but no response received
      errorMessage = 'Network Error - No response from server. Please check your internet connection.';
      // console.error('Network Error:', error.request);
    } else {
      // Something else happened
      errorMessage = error.message || 'An unexpected error occurred';
      // console.error('Error:', error.message);
    }
    
    // Attach formatted message to error object
    error.message = errorMessage;
    
    return Promise.reject(error);
  }
);

export default axiosInstance;
