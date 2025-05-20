import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { fetchServices } from "../../../utils/servicesHelper";

const EditServiceProvider = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState({
    name: "",
    email: "",
    phoneNo: "",
    dob: "",
    role: "serviceProvider",
    gender: "",
    services: [],
    question: "",
  });
  const [loading, setLoading] = useState(true);
  const [allServices, setAllServices] = useState([]);

  useEffect(() => {
    const fetchProvider = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/users/serviceProvider/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        // Ensure services is an array of IDs
        let services = response.data.provider.services;
        if (Array.isArray(services)) {
          services = services.map(s => (typeof s === 'object' && s !== null ? s._id : s));
        } else if (typeof services === 'string') {
          services = [services];
        } else {
          services = [];
        }
        setProvider({ ...response.data.provider, services });
      } finally {
        setLoading(false);
      }
    };
    const fetchAllServices = async () => {
      const services = await fetchServices();
      setAllServices(services);
    };
    fetchProvider();
    fetchAllServices();
  }, [id]);

  const handleServiceChange = (e) => {
    const selected = Array.from(e.target.selectedOptions).map(option => option.value);
    setProvider(prev => ({ ...prev, services: selected }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(
        `http://localhost:8000/api/users/serviceProvider/${id}`,
        provider,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        }
      );
      toast.success("Provider updated successfully!");
      navigate("/dashboard/menu/serviceProvider");
    } catch {
      toast.error("Error updating provider.");
    }
  };

  if (loading)
    return <p className="text-center text-gray-700 text-lg">Loading...</p>;

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white p-6 shadow-md rounded-lg">
      <h2 className="text-2xl font-bold text-center mb-4 text-gray-800">
        Edit Service Provider
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700">Name</label>
          <input
            type="text"
            placeholder="Name"
            value={provider.name}
            onChange={(e) => setProvider({ ...provider, name: e.target.value })}
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Email</label>
          <input
            type="email"
            placeholder="Email"
            value={provider.email}
            onChange={(e) =>
              setProvider({ ...provider, email: e.target.value })
            }
            className="w-full p-2 border rounded"
          />
        </div>
        <div>
          <label className="block text-gray-700">Phone No</label>
          <input
            type="text"
            placeholder="Phone No"
            value={provider.phoneNo}
            onChange={(e) =>
              setProvider({ ...provider, phoneNo: e.target.value })
            }
            className="w-full p-2 border rounded"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            name="dob"
            value={provider.dob ? new Date(provider.dob).toISOString().split('T')[0] : ''}
            onChange={(e) =>
              setProvider({ ...provider, dob: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        <div>
          <label className="block text-gray-700">Role</label>
          <select
            value={provider.role}
            onChange={(e) => setProvider({ ...provider, role: e.target.value })}
            className="w-full p-2 border rounded"
          >
            <option value="admin">Admin</option>
            <option value="serviceProvider">Service Provider</option>
            <option value="user">User</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700">Gender</label>
          <select
            value={provider.gender}
            onChange={(e) =>
              setProvider({ ...provider, gender: e.target.value })
            }
            className="w-full p-2 border rounded"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-gray-700">Services</label>
          <div className="w-full p-2 border rounded bg-gray-50">
            {allServices
              .filter(service => provider.services.includes(service._id))
              .map(service => (
                <div key={service._id} className="py-1 px-2">
                  {service.ser_name}
                </div>
              ))}
            {provider.services.length === 0 && (
              <div className="text-gray-400">No services selected</div>
            )}
          </div>
        </div>
        <div>
          <label className="block text-gray-700">Security Question</label>
          <input
            type="text"
            placeholder="Security Question"
            value={provider.question}
            onChange={(e) =>
              setProvider({ ...provider, question: e.target.value })
            }
            className="w-full p-2 border rounded"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700"
        >
          Save Changes
        </button>
      </form>
    </div>
  );
};

export default EditServiceProvider;
