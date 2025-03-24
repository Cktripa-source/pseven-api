// Get the JWT token from localStorage
export const getAuthToken = () => {
    return localStorage.getItem('token');
  };
  
  // Check if user is logged in (simple check for token presence)
  export const isLoggedIn = () => {
    return !!getAuthToken();
  };
  
  // Logout function (clears token)
  export const logout = () => {
    localStorage.removeItem('token');
  };
  