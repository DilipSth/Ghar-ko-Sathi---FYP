// Users.js

import axios from "axios";
import { useEffect, useState } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { useNavigate } from "react-router";

const Users = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/users/gharUsers",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        const data = response.data.users.map((user) => ({
          _id: user._id,
          name: user.name,
          mobile: user.phoneNo || "N/A",
          email: user.email || "N/A",
          type: user.role || "User",
          status: "Active", // Assuming all users are active
          profileImage: user.profileImage
            ? `http://localhost:8000/public/registerImage/${user.profileImage}`
            : null,
          gender: user.gender || "N/A",
        }));
        setUsers(data);
      }
    } catch (error) {
      alert(
        error.response?.data?.error || "Error occurred while fetching users."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await axios.delete(
          `http://localhost:8000/api/users/gharUsers/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          alert("User deleted successfully!");
          fetchUsers(); // Refresh the list
        }
      } catch (error) {
        alert(
          error.response?.data?.error ||
            "Error occurred while deleting the user."
        );
      }
    }
  };

  const filteredUsers = users.filter((user) => {
    // Filter out admin users
    const isNotAdmin = user.type !== "admin";
    return isNotAdmin;
  });

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Users</h1>
        </div>

        {/* Users Table */}
        {loading ? (
          <p>Loading...</p>
        ) : filteredUsers.length > 0 ? (
          <table className="w-full bg-white rounded-lg shadow mt-6">
            <thead>
              <tr className="bg-gray-200 text-center">
                <th className="p-4">Photo</th>
                <th className="p-4">Name</th>
                <th className="p-4">Mobile</th>
                <th className="p-4">Email</th>
                <th className="p-4">Type</th>
                <th className="p-4">Gender</th>
                <th className="p-4">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={index} className="border-t text-center">
                  <td className="p-4 flex justify-center items-center">
                    {user.profileImage ? (
                      <img
                        src={user.profileImage}
                        alt="Profile"
                        className="w-10 h-10 rounded-lg"
                      />
                    ) : (
                      <span>No Image</span>
                    )}
                  </td>
                  <td className="p-4">{user.name}</td>
                  <td className="p-4">{user.mobile}</td>
                  <td className="p-4">{user.email}</td>
                  <td className="p-4">{user.type}</td>
                  <td className="p-4">{user.gender}</td>
                  <td>
                    <button
                      onClick={() =>
                        navigate(`/dashboard/menu/users/view/${user._id}`)
                      }
                      className="mr-2 rounded-md border border-[#2e4f31] text-[#2e4f31] py-1 px-3 text-center font-medium hover:bg-[#2e4f31] hover:text-white duration-200"
                    >
                      <FaEye />
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/dashboard/menu/users/edit/${user._id}`)
                      }
                      className="mr-2 rounded-md border border-[#3C50E0] text-[#3C50E0] py-1 px-3 text-center font-medium hover:bg-[#3C50E0] hover:text-white duration-200"
                    >
                      <FaEdit />
                    </button>
                    {user.type !== "admin" && (
                    <button
                      onClick={() => handleDelete(user._id)}
                      className="mr-2 rounded-md border border-[#c13d3d] text-[#c13d3d] py-1 px-3 text-center font-medium hover:bg-[#c13d3d] hover:text-white duration-200"
                    >
                      <MdDeleteForever />
                    </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No users found.</p>
        )}
      </div>
    </div>
  );
};

export default Users;