import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const ViewServiceProvider = () => {
  const [provider, setProvider] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchServiceProvider = async () => {
      try {
        const response = await axios.get(
          `http://localhost:8000/api/users/serviceProvider/${id}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          setProvider(response.data.provider);
        }
      } catch (error) {
        alert(
          error.response?.data?.error || "Error occurred while fetching data."
        );
      }
    };
    fetchServiceProvider();
  }, [id]);

  if (!provider)
    return <p className="text-center text-lg font-semibold">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">
        Service Provider Details
      </h1>
      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        {/* Level above all fields */}
        <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Name:</strong> {provider.name}
          </div>
          <div>
            <strong>Email:</strong> {provider.email}
          </div>
          <div>
            <strong>Phone:</strong> {provider.phoneNo}
          </div>
          <div>
            <strong>Role:</strong> {provider.role}
          </div>
          <div>
            <strong>Gender:</strong> {provider.gender}
          </div>
          <div>
            <strong>DOB:</strong> {new Date(provider.dob).toLocaleDateString()}
          </div>
        </div>

        {/* Services and Question */}
        <h2 className="text-2xl font-semibold mt-6 mb-4">
          Services Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <strong>Services:</strong> {provider.services}
          </div>
          <div>
            <strong>Question:</strong> {provider.question}
          </div>
        </div>

        {/* Image section */}
        <div className="flex flex-row gap-4 justify-around">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mt-6 mb-4">Profile Image</h2>
            {provider.profileImage && (
              <div>
                <img
                  src={`http://localhost:8000/public/registerImage/${provider.profileImage}`}
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mt-6 mb-4">Citizenship</h2>
            {provider.citizenshipImage && (
              <div>
                <img
                  src={`http://localhost:8000/public/registerImage/${provider.citizenshipImage}`}
                  alt="Citizenship"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mt-6 mb-4">Service Certification</h2>
            {provider.certificationImage && (
              <div>
                <img
                  src={`http://localhost:8000/public/registerImage/${provider.certificationImage}`}
                  alt="Certification"
                  className="w-32 h-32 object-cover rounded-md"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() =>
            navigate(`/dashboard/menu/serviceProvider/edit/${provider._id}`)
          }
          className="bg-blue-500 text-white px-6 py-2 rounded mt-6 block mx-auto"
        >
          Edit
        </button>
      </div>
    </div>
  );
};

export default ViewServiceProvider;
