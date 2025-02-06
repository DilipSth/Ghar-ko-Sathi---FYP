import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";

const EditServiceProvider = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [provider, setProvider] = useState({
    name: "",
    email: "",
    phoneNo: "",
    role: "serviceProvider",
    gender: "",
    services: "",
    question: "",
  });
  const [loading, setLoading] = useState(true);

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
        setProvider(response.data.provider);
      } finally {
        setLoading(false);
      }
    };
    fetchProvider();
  }, [id]);

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
          <input
            type="text"
            placeholder="Services"
            value={provider.services}
            onChange={(e) =>
              setProvider({ ...provider, services: e.target.value })
            }
            className="w-full p-2 border rounded"
          />
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
