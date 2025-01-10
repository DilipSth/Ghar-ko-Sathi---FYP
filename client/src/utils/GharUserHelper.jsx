import axios from "axios";

export const fetchServices = async () => {
  try {
    const response = await axios.get("http://localhost:8000/api/services", {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (response.data.success) {
      return response.data.services;
    } else {
      console.error("Failed to fetch services:", response.data.message);
      return [];
    }
  } catch (error) {
    console.error("Error fetching services:", error);
    alert(error.response?.data?.error || "Error occurred while fetching services.");
    return [];
  }
};
