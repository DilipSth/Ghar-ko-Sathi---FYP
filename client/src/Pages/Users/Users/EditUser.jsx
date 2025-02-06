import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const EditUser = () => {
  const [user, setUser] = useState({
    name: "",
    email: "",
    phoneNo: "",
    role: "",
    gender: "",
    dob: "",
  });
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/users/gharUsers/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        alert(error.response?.data?.error || "Error fetching user data.");
      }
    };
    fetchUser();
  }, [id]);

  const handleChange = (e) => {
    setUser({ ...user, [e.target.name]: e.target.value });
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
        navigate(`/dashboard/menu/users/view/${id}`);
      }
    } catch (error) {
      alert(error.response?.data?.error || "Error updating user.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">Edit User</h1>
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-lg p-6 space-y-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium">Name</label>
            <input
              type="text"
              name="name"
              value={user.name}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-medium">Email</label>
            <input
              type="email"
              name="email"
              value={user.email}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-medium">Phone</label>
            <input
              type="text"
              name="phoneNo"
              value={user.phoneNo}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-medium">Role</label>
            <input
              type="text"
              name="role"
              value={user.role}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block font-medium">Gender</label>
            <select
              name="gender"
              value={user.gender}
              onChange={handleChange}
              className="w-full p-2 border rounded"
            >
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
          <input
            type="date"
            name="dob"
            value={user.dob ? new Date(user.dob).toISOString().split('T')[0] : ''}
            onChange={(e) =>
                setUser({ ...user, dob: e.target.value })
            }
            className="mt-1 block w-full rounded-md border border-gray-300 p-2"
          />
        </div>
        </div>
        <div className="flex justify-center gap-4">
          <button
            type="submit"
            className="bg-blue-500 text-white px-6 py-2 rounded"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => navigate(`/dashboard/menu/users/view/${id}`)}
            className="bg-gray-500 text-white px-6 py-2 rounded"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditUser;
