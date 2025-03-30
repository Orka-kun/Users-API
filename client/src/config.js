export const API_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.MODE === 'production' 
    ? 'https://users-api-odh2.onrender.com' 
    : 'http://localhost:5000');
