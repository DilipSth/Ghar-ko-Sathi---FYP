import axios from "axios";
import { useEffect, useState } from "react";
import { FaEdit, FaEye } from "react-icons/fa";
import { MdDeleteForever } from "react-icons/md";
import { useNavigate } from "react-router";
import { toast } from "react-hot-toast";

const ServiceProviderUsers = () => {
  const navigate = useNavigate();
  const [serviceProviders, setServiceProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedApproval, setSelectedApproval] = useState("");

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
          approved: provider.approved !== undefined ? provider.approved : false,
          profileImage: provider.profileImage
            ? `http://localhost:8000/public/registerImage/${provider.profileImage}`
            : null,
        }));
        setServiceProviders(data);
      }
    } catch (error) {
      toast.error(
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
          toast.success("User deleted successfully!");
          fetchServiceProviders(); // Refresh the list
        }
      } catch (error) {
        toast.error(
          error.response?.data?.error ||
            "Error occurred while deleting the user."
        );
      }
    }
  };

  const handleApproval = async (id, approve) => {
    try {
      const response = await axios.put(
        `http://localhost:8000/api/users/serviceProvider/approve/${id}`,
        { approved: approve },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      if (response.data.success) {
        toast.success(`Provider ${approve ? 'approved' : 'rejected'} successfully!`);
        fetchServiceProviders(); // Refresh the list
      }
    } catch (error) {
      toast.error(
        error.response?.data?.error ||
          `Error ${approve ? 'approving' : 'rejecting'} provider.`
      );
    }
  };

  const filteredServiceProviders = serviceProviders.filter((provider) => {
    // Convert approved status to "Approved" or "Pending" for status filtering
    const providerStatus = provider.approved ? "Approved" : "Pending";
    
    const matchesStatus = selectedStatus
      ? providerStatus === selectedStatus
      : true;
    const matchesType = selectedType ? provider.type === selectedType : true;
    const matchesApproval = selectedApproval !== "" 
      ? (selectedApproval === "approved" ? provider.approved : !provider.approved)
      : true;
    return matchesStatus && matchesType && matchesApproval;
  });

  // Function to handle approval filter button clicks
  const handleApprovalFilterClick = (value) => {
    setSelectedApproval(selectedApproval === value ? "" : value);
  };

  return (
    <div className="p-4 h-full">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Service Provider Users</h1>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-6 my-4">
          <div>
            <label className="block mb-2 font-medium" htmlFor="statusFilter">
              Filter by Status:
            </label>
            <select
              id="statusFilter"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-md border border-stroke py-2 px-3 text-black"
            >
              <option value="">All</option>
              <option value="Approved">Approved</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-medium" htmlFor="typeFilter">
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

          <div>
            <label className="block mb-2 font-medium">
              Filter by Approval:
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => handleApprovalFilterClick("approved")}
                className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  selectedApproval === "approved"
                    ? "bg-green-600 text-white"
                    : "bg-white text-green-600 border border-green-600 hover:bg-green-50"
                }`}
              >
                Approved
              </button>
              <button
                onClick={() => handleApprovalFilterClick("pending")}
                className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  selectedApproval === "pending"
                    ? "bg-yellow-600 text-white"
                    : "bg-white text-yellow-600 border border-yellow-600 hover:bg-yellow-50"
                }`}
              >
                Pending
              </button>
              <button
                onClick={() => setSelectedApproval("")}
                className={`px-4 py-2 rounded-md font-medium transition-colors duration-200 ${
                  selectedApproval === ""
                    ? "bg-gray-600 text-white"
                    : "bg-white text-gray-600 border border-gray-600 hover:bg-gray-50"
                }`}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {/* Service Provider Table */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl">Loading...</p>
          </div>
        ) : filteredServiceProviders.length > 0 ? (
          <div className="overflow-x-auto">
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
                  <th className="p-4">Approval</th>
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
                          className="w-10 h-10 rounded-lg object-cover"
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
                          provider.approved
                            ? "bg-green-100 text-green-600"
                            : "bg-yellow-100 text-yellow-600"
                        }`}
                      >
                        {provider.approved ? "Approved" : "Pending"}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() =>
                          navigate(
                            `/dashboard/menu/serviceProvider/view/${provider._id}`
                          )
                        }
                        className="mr-2 rounded-md border border-[#2e4f31] text-[#2e4f31] py-1 px-3 text-center font-medium hover:bg-[#2e4f31] hover:text-white duration-200"
                        title="View Details"
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
                        title="Edit Provider"
                      >
                        <FaEdit />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(provider._id)}
                        className="mr-2 rounded-md border border-[#c13d3d] text-[#c13d3d] py-1 px-3 text-center font-medium hover:bg-[#c13d3d] hover:text-white duration-200"
                        title="Delete Provider"
                      >
                        <MdDeleteForever />
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center">
                        <label className="inline-flex items-center cursor-pointer">
                          <div className="relative">
                            <input 
                              type="checkbox" 
                              className="sr-only peer"
                              checked={provider.approved}
                              onChange={() => handleApproval(provider._id, !provider.approved)}
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                          </div>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex justify-center items-center h-64">
            <p className="text-xl">No service providers found.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ServiceProviderUsers;