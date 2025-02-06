import { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

const ViewUser = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`http://localhost:8000/api/users/gharUsers/${id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    fetchUser();
  }, [id]);

  if (!user) {
    return <p>Loading...</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">User Details</h1>
      <div className="mt-4">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Phone:</strong> {user.phoneNo}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Date of Birth:</strong> {new Date(user.dob).toLocaleDateString()}</p>
        <p><strong>Gender:</strong> {user.gender}</p>
        {user.profileImage && (
          <img
            src={`http://localhost:8000/public/registerImage/${user.profileImage}`}
            alt="Profile"
            className="w-20 h-20 rounded-lg"
          />
        )}
      </div>
    </div>
  );
};

export default ViewUser;