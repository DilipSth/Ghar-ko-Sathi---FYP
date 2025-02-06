import { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const EditUser = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [user, setUser] = useState({
    name: "",
    email: "",
    phoneNo: "",
    role: "",
    dob: "",
    gender: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/users/gharUsers/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUser({ ...user, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(
        `http://localhost:8000/api/users/gharUsers/${id}`,
        user,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        alert("User updated successfully!");
        navigate("/dashboard/menu/users");
      }
    } catch (error) {
      console.error("Error updating user:", error);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Edit User</h1>
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Name</label>
          <input
            type="text"
            name="name"
            value={user.name}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            name="email"
            value={user.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Phone Number</label>
          <input
            type="text"
            name="phoneNo"
            value={user.phoneNo}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Role</label>
          <select
            name="role"
            value={user.role}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          >
            <option value="admin">Admin</option>
            <option value="serviceProvider">Service Provider</option>
            <option value="user">User</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            name="dob"
            value={user.dob ? new Date(user.dob).toISOString().split('T')[0] : ''}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Gender</label>
          <select
            name="gender"
            value={user.gender}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
      
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md"
        >
          Update User
        </button>
      </form>
    </div>
  );
};

export default EditUser;