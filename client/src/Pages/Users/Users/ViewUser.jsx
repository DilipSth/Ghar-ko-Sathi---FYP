import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

const ViewUser = () => {
  const [user, setUser] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [modalImage, setModalImage] = useState("");

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
        alert(error.response?.data?.error || "Error occurred while fetching data.");
      }
    };
    fetchUser();
  }, [id]);

  const handleImageClick = (imgUrl) => {
    setModalImage(imgUrl);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalImage("");
  };

  if (!user)
    return <p className="text-center text-lg font-semibold">Loading...</p>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-center mb-6">User Details</h1>
      <div className="bg-white shadow-md rounded-lg p-6 space-y-4">
        <h2 className="text-2xl font-semibold mb-4">Personal Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><strong>Name:</strong> {user.name}</div>
          <div><strong>Email:</strong> {user.email}</div>
          <div><strong>Phone:</strong> {user.phoneNo}</div>
          <div><strong>Role:</strong> {user.role}</div>
          <div><strong>Gender:</strong> {user.gender}</div>
          <div><strong>DOB:</strong> {new Date(user.dob).toLocaleDateString()}</div>
        </div>

        <div className="flex flex-row gap-4 justify-around">
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mt-6 mb-4">Profile Image</h2>
            {user.profileImage && (
              <img
                src={`http://localhost:8000/public/registerImage/${user.profileImage}`}
                alt="Profile"
                className="w-32 h-32 object-cover rounded-md cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleImageClick(`http://localhost:8000/public/registerImage/${user.profileImage}`)}
              />
            )}
          </div>
          <div className="flex flex-col items-center justify-center">
            <h2 className="text-2xl font-semibold mt-6 mb-4">Citizenship</h2>
            {user.citizenshipImage && (
              <img
                src={`http://localhost:8000/public/registerImage/${user.citizenshipImage}`}
                alt="Citizenship"
                className="w-32 h-32 object-cover rounded-md cursor-pointer hover:scale-105 transition-transform"
                onClick={() => handleImageClick(`http://localhost:8000/public/registerImage/${user.citizenshipImage}`)}
              />
            )}
          </div>
        </div>

        <button
          onClick={() => navigate(`/dashboard/menu/users/edit/${user._id}`)}
          className="bg-blue-500 text-white px-6 py-2 rounded mt-6 block mx-auto"
        >
          Edit
        </button>
      </div>
      {/* Modal for image preview */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="relative">
            <img
              src={modalImage}
              alt="Preview"
              className="max-w-[90vw] max-h-[80vh] rounded-lg shadow-lg border-4 border-white"
            />
            <button
              onClick={closeModal}
              className="absolute top-2 right-2 bg-white rounded-full px-3 py-1 text-black text-lg font-bold shadow hover:bg-gray-200"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewUser;
