import axios from "axios";
import { useEffect, useState } from "react";
import { useParams } from "react-router";

const GharUser = () => {
  const { id } = useParams();
  const [gharUser, setGharUser] = useState(null);

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
        console.log("Datas", response.data.gharUser);
        if (response.data.success) {
          setGharUser(response.data.gharUser);
        }
      } catch (error) {
        alert(error.response?.data?.error || "Error loading user details.");
      }
    };

    fetchGharUser();
  }, [id]);

  return (
    <div className="flex justify-center items-center min-h-full bg-gray-100">
      {gharUser ? (
        <div className="max-w-lg bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="flex justify-center bg-gray-200 p-4">
            <img
              className="w-32 h-32 rounded-full border-4 border-white shadow-md"
              src={`http://localhost:8000/public/servicesPhotoUpload/${gharUser.userId.profileImage}`}
              alt={gharUser.userId.name}
              onError={(e) => {
                e.target.src =
                  "http://localhost:8000/public/default-placeholder.png"; // Fallback placeholder
              }}
            />
          </div>
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-800 text-center">
              {gharUser.userId.name}
            </h2>
            <p className="text-center text-gray-600 mt-2">
              Role:{" "}
              <span className="font-semibold">{gharUser.userId.role}</span>
            </p>
            <p className="text-center text-gray-600">
              Email:{" "}
              <span className="font-semibold">{gharUser.userId.email}</span>
            </p>
            <p className="text-center text-gray-600">
              Gender: <span className="font-semibold">{gharUser.gender}</span>
            </p>
            <p className="text-center text-gray-600">
              DOB:{" "}
              <span className="font-semibold">
                {new Date(gharUser.dob).toLocaleDateString()}
              </span>
            </p>
            <div className="mt-4">
              <h3 className="text-lg font-medium text-gray-800">Services:</h3>
              <ul className="list-disc list-inside text-gray-600 mt-2">
                {gharUser.services.map((serviceId, index) => (
                  <li key={index} className="text-sm">
                    Service ID: {serviceId}
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-center text-gray-600 mt-4">
              Account Created:{" "}
              <span className="font-semibold">
                {new Date(gharUser.createAt).toLocaleString()}
              </span>
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xl text-gray-700">Loading...</p>
      )}
    </div>
  );
};

export default GharUser;
