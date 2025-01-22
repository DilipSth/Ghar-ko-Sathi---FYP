import axios from "axios";
import { useEffect, useState } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { useNavigate } from "react-router";

const Users = () => {
  const navigate = useNavigate();
  const [Users, setUsers] = useState([]);
  const [gharUserLoading, setGharUserLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const handleCreateUser = () => {
    navigate("/dashboard/menu/users/add-users");
  };

  useEffect(() => {
    const fetchUsers = async () => {
      setGharUserLoading(true);
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
            status: "Active", // Assuming status is not provided in API
            profileImage: user.profileImage
              ? `http://localhost:8000/public/registerImage/${user.profileImage}`
              : null,
          }));
          setUsers(data);
        }
      } catch (error) {
        alert(
          error.response?.data?.error || "Error occurred while fetching users."
        );
      } finally {
        setGharUserLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const filteredUsers = Users.filter((user) => {
    const matchesStatus = selectedStatus
      ? user.status === selectedStatus
      : true;
    const matchesType = selectedType ? user.type === selectedType : true;
    return matchesStatus && matchesType;
  });

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Ghar Users</h1>
          <button
            className="bg-[#3C50E0] text-white px-4 py-2 rounded"
            onClick={handleCreateUser}
          >
            Add New
          </button>
        </div>

        {/* Filters */}
        <div className="flex justify-evenly my-4">
          <div>
            <label className="mr-4 font-medium" htmlFor="statusFilter">
              Filter by Status:
            </label>
            <select
              id="statusFilter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-stroke py-2 px-3 text-black"
            >
              <option value="">All</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
          </div>

          <div>
            <label className="mr-4 font-medium" htmlFor="typeFilter">
              Filter by Type:
            </label>
            <select
              id="typeFilter"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-md border border-stroke py-2 px-3 text-black"
            >
              <option value="">All</option>
              <option value="Service Provider">Service Provider</option>
              <option value="User">User</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        {gharUserLoading ? (
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
                <th className="p-4">Status</th>
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
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center justify-center w-20 h-8 rounded ${
                        user.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {user.status}
                    </span>
                  </td>
                  <td className="p-4 flex">
                    <button
                      onClick={() =>
                        navigate(`/dashboard/menu/users/gharUser/${user._id}`)
                      }
                      className="mr-2 rounded-md border border-[#2e4f31] text-[#2e4f31] py-1 px-3 text-center font-medium hover:bg-[#2e4f31] hover:text-white duration-200"
                    >
                      <FaEye />
                    </button>

                    <button
                      onClick={() =>
                        navigate(`/dashboard/menu/users/edit-users/${user._id}`)
                      }
                      className="mr-2 rounded-md border border-[#3C50E0] text-[#3C50E0] py-1 px-3 text-center font-medium hover:bg-[#3C50E0] hover:text-white duration-200"
                    >
                      <FaEdit />
                    </button>
                    <button
                      className="mr-2 rounded-md border border-[#c13d3d] text-[#c13d3d] py-1 px-3 text-center font-medium hover:bg-[#c13d3d] hover:text-white duration-200"
                    >
                      <MdDeleteForever />
                    </button>
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
