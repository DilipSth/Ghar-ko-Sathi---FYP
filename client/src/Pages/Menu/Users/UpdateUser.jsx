import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router";
import { fetchServices } from "../../../utils/GharUserHelper";

const UpdateUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [gharUser, setGharUser] = useState({
    name: "",
    gender: "",
    role: "", // Initialize as empty string
    services: [], // Initialize as an empty array
  });
  const [servicesList, setServicesList] = useState([]);

  useEffect(() => {
    const getServices = async () => {
      const fetchedServices = await fetchServices();
      setServicesList(fetchedServices || []);
    };

    getServices();
  }, []);

  useEffect(() => {
    const fetchGharUser = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/gharUsers/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          const gharUserData = response.data.gharUser;
          setGharUser({
            name: gharUserData.userId.name,
            gender: gharUserData.gender,
            role: gharUserData.userId.role,
            services: gharUserData.services.map(service => service._id), // Assuming services is an array of objects with _id
          });
        }
      } catch (error) {
        alert(error.response?.data?.message || "Error loading user details.");
      }
    };

    fetchGharUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    setGharUser((prevData) => ({ ...prevData, [name]: value }));
  };

  const handleServiceChange = (e) => {
    const options = e.target.options;
    const selectedServices = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedServices.push(options[i].value);
      }
    }

    setGharUser((prevData) => ({ ...prevData, services: selectedServices }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.put(
        `http://localhost:8000/api/gharUsers/${id}`,
        gharUser,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );

      if (response.data.success) {
        navigate("/dashboard/menu/users");
      } else {
        alert(response.data.message || "Failed to update user.");
      }
      
   } catch (error) {
     console.error("Error:", error);
     alert(error.response?.data?.message || "An unexpected error occurred.");
   }
 };

 return (
   <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4">
     {/* Name Input */}
     <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
         Name
       </label>
       <input
         type="text"
         name="name"
         value={gharUser.name}
         onChange={handleChange}
         placeholder="Type Your name"
         className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
         required
       />
     </div>

     {/* Gender Select */}
     <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
         Gender
       </label>
       <select
         name="gender"
         value={gharUser.gender}
         onChange={handleChange}
         className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
         required
       >
         <option value="">Select Gender</option>
         <option value="male">Male</option>
         <option value="female">Female</option>
         <option value="other">Other</option>
       </select>
     </div>

     {/* Role Select */}
     <div>
       <label className="block text-sm font-medium text-gray-700 mb-1">
         Role
       </label>
       <select
         name="role"
         value={gharUser.role}
         onChange={handleChange}
         className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
         required
       >
         <option value="">Select Role</option>
         <option value="admin">Admin</option>
         <option value="serviceProvider">Service Provider</option>
         <option value="user">User</option>
       </select>
     </div>

     {/* Conditionally Render Services Select */}
     {gharUser.role === "serviceProvider" && (
       <div>
         <label className="block text-sm font-medium text-gray-700 mb-1">
           Services
         </label>
         <select
           name="services"
           onChange={handleServiceChange}
           className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
           multiple={false}
           required
         >
           {servicesList.length > 0 ? (
             servicesList.map((ser) => (
               <option key={ser._id} value={ser._id} selected={gharUser.services.includes(ser._id)}>
                 {ser.ser_name}
               </option>
             ))
           ) : (
             <option value="" disabled>No services available</option>
           )}
         </select>
       </div>
     )}

     {/* Submit Button */}
     <button
       type="submit"
       className="w-full bg-blue-500 text-white font-semibold py-2 px-4 rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
     >
       Edit User
     </button>
   </form>
 );
};

export default UpdateUser;
