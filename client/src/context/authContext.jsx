// /* eslint-disable react/prop-types */

// import axios from "axios";
// import { createContext, useState, useContext, useEffect } from "react";


// const userContext = createContext();

// const AuthContext = ({ children }) => {

//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const verifyUser = async () => {
//       try {
//         const token = localStorage.getItem('token');
//         if (token) {
//           const response = await axios.get('http://localhost:8000/api/auth/verify',
//             {
//               headers: {
//                 "Authorization": `Bearer ${token}`,
//               },
//             }
//           );
//           if (response.data.success) {
//             setUser(response.data.user);
//           }
//         } else {
//           setUser(null)
//           setLoading(false)
//         }
//       } catch (error) {
//         if (error.response && !error.response.data.error) {
//           setUser(null)
//         }
//       } finally {
//         setLoading(false)
//       }
//     };

//     verifyUser();
//   }, []);

//   const login = (user) => {
//     setUser(user);
//   };

//   const logout = () => {
//     setUser(null);
//     localStorage.removeItem("token");
//   };
//   return (
//     <userContext.Provider value={{ user, login, logout, loading }}>
//       {children}
//     </userContext.Provider>
//   );
// };

// export const useAuth = () => useContext(userContext);
// export default AuthContext;








/* eslint-disable react/prop-types */
import axios from "axios";
import { createContext, useState, useContext, useEffect } from "react";

// Create a context
const userContext = createContext();

// AuthContext component
const AuthContext = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Verify user function
  useEffect(() => {
    let isMounted = true; // Track if the component is still mounted

    const verifyUser = async () => {
      try {
        const token = localStorage.getItem("token");

        if (token) {
          const response = await axios.get("http://localhost:8000/api/auth/verify", {
            headers: {
              Authorization: `Bearer ${token}`, // Set Authorization header
            },
          });

          if (response.data?.success && isMounted) {
            setUser(response.data.user); // Update user state
          } else if (isMounted) {
            setUser(null); // Reset user state if verification fails
          }
        } else if (isMounted) {
          setUser(null); // Reset user state if no token is found
        }
      } catch (error) {
        console.error("Error verifying user:", error);
        if (isMounted) setUser(null); // Reset user state on error
      } finally {
        if (isMounted) setLoading(false); // Ensure loading is set to false
      }
    };

    verifyUser();

    // Cleanup function to prevent state updates on unmounted components
    return () => {
      isMounted = false;
    };
  }, []);

  // Login function
  const login = (user) => {
    setUser(user);
    setLoading(false);
  };

  // Logout function
  const logout = () => {
    setUser(null);
    localStorage.removeItem("token");
  };

  return (
    <userContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </userContext.Provider>
  );
};

// Hook to use the authentication context
export const useAuth = () => useContext(userContext);

// Export AuthContext
export default AuthContext;
