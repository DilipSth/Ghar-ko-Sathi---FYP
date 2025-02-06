import axios from "axios";
import { useEffect, useState } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { useNavigate } from "react-router";

const ServiceProviderUsers = () => {
  const navigate = useNavigate();
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");

  const fetchServiceProviders = async () => {
    setLoading(true);
    try {
      const response = await axios.get(
        "http://localhost:8000/api/users/serviceProvider",
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        const data = response.data.serviceProviders.map((provider) => ({
          _id: provider._id,
          name: provider.name,
          mobile: provider.phoneNo || "N/A",
          email: provider.email || "N/A",
          type: provider.role || "Service Provider",
          status: "Active", // Assuming all users are active
          profileImage: provider.profileImage
            ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
            : null,
        }));
        setServiceProviders(data);
      }
    } catch (error) {
      alert(
        error.response?.data?.error ||
          "Error occurred while fetching service providers."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceProviders();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        const response = await axios.delete(
          `http://localhost:8000/api/users/serviceProvider/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          alert("User deleted successfully!");
          fetchServiceProviders(); // Refresh the list
        }
      } catch (error) {
        alert(
          error.response?.data?.error ||
            "Error occurred while deleting the user."
        );
      }
    }
  };

  const filteredServiceProviders = serviceProviders.filter((provider) => {
    const matchesStatus = selectedStatus
      ? provider.status === selectedStatus
      : true;
    const matchesType = selectedType ? provider.type === selectedType : true;
    return matchesStatus && matchesType;
  });

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Service Provider Users</h1>
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

        {/* Service Provider Table */}
        {loading ? (
          <p>Loading...</p>
        ) : filteredServiceProviders.length > 0 ? (
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
              {filteredServiceProviders.map((provider, index) => (
                <tr key={index} className="border-t text-center">
                  <td className="p-4 flex justify-center items-center">
                    {provider.profileImage ? (
                      <img
                        src={provider.profileImage}
                        alt="Profile"
                        className="w-10 h-10 rounded-lg"
                      />
                    ) : (
                      <span>No Image</span>
                    )}
                  </td>
                  <td className="p-4">{provider.name}</td>
                  <td className="p-4">{provider.mobile}</td>
                  <td className="p-4">{provider.email}</td>
                  <td className="p-4">{provider.type}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center justify-center w-20 h-8 rounded ${
                        provider.status === "Active"
                          ? "bg-green-100 text-green-600"
                          : "bg-red-100 text-red-600"
                      }`}
                    >
                      {provider.status}
                    </span>
                  </td>
                  <td>
                    <button
                      onClick={() =>
                        navigate(
                          `/dashboard/menu/serviceProvider/view/${provider._id}`
                        )
                      }
                      className="mr-2 rounded-md border border-[#2e4f31] text-[#2e4f31] py-1 px-3 text-center font-medium hover:bg-[#2e4f31] hover:text-white duration-200"
                    >
                      <FaEye />
                    </button>

                    <button
                      onClick={() =>
                        navigate(
                          `/dashboard/menu/serviceProvider/edit/${provider._id}`
                        )
                      }
                      className="mr-2 rounded-md border border-[#3C50E0] text-[#3C50E0] py-1 px-3 text-center font-medium hover:bg-[#3C50E0] hover:text-white duration-200"
                    >
                      <FaEdit />
                    </button>
                    <button
                      onClick={() => handleDelete(provider._id)}
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
          <p>No service providers found.</p>
        )}
      </div>
    </div>
  );
};

export default ServiceProviderUsers;
