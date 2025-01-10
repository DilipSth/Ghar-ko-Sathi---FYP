import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";

const Services = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState([]);
  const [serLoading, setSerLoading] = useState(false);
  const [filteredService, setFilteredService] = useState([]);

  const handleCreateService = () => {
    navigate("/dashboard/menu/services/add-services");
  };

  useEffect(() => {
    const fetchServices = async () => {
      setSerLoading(true);
      try {
        const response = await axios.get("http://localhost:8000/api/services", {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        if (response.data.success) {
          const data = response.data.services.map((ser) => ({
            _id: ser._id,
            name: ser.ser_name,
            serviceImage: ser.serviceImage
              ? `http://localhost:8000/public/servicesPhotoUpload/${ser.serviceImage}`
              : null,
          }));
          setServices(data);
          setFilteredService(data);
        }
      } catch (error) {
        alert(
          error.response?.data?.error || "Error occurred while fetching services."
        );
      } finally {
        setSerLoading(false);
      }
    };

    fetchServices();
  }, []);

  const handleFilter = (e) => {
    const searchTerm = e.target.value.toLowerCase();
    const records = services.filter((ser) =>
      ser.name.toLowerCase().includes(searchTerm)
    );
    setFilteredService(records);
  };

  return (
    <div className="p-4 h-screen">
      <div className="bg-white p-4 rounded-lg shadow-md h-screen flex flex-col">
        <h1 className="text-2xl font-bold mb-6">Our Services</h1>
        {/* Search input */}
        <div className="mb-4 flex gap-36 justify-center">
          <input
            type="text"
            placeholder="Search Services"
            onChange={handleFilter}
            className="border rounded-lg px-4 py-2 w-64"
          />
          <button
            className="ml-4 bg-blue-500 text-white px-4 py-2 rounded-lg"
            onClick={handleCreateService}
          >
            Add Service
          </button>
        </div>
        {/* Responsive grid layout */}
        {serLoading ? (
          <p className="text-center">Loading services...</p>
        ) : filteredService.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 min-lg:grid-cols-3 xl:grid-cols-4 gap-6 cursor-pointer pt-8">
            {filteredService.map((service) => (
              <div
                key={service._id}
                className="border rounded-lg shadow hover:shadow-lg p-4 w-60 max-xl:h-80 flex flex-col items-center flex-grow-0 max-xl:w-[400px]"
              >
                {service.serviceImage ? (
                  <img
                    src={service.serviceImage}
                    alt={service.name}
                    className="w-full h-40 object-cover rounded-t-lg mb-4"
                  />
                ) : (
                  <div className="w-full h-40 bg-gray-200 rounded-t-lg mb-4 flex items-center justify-center">
                    No Image
                  </div>
                )}
                <h3 className="text-lg font-semibold text-center">{service.name}</h3>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center">No services found.</p>
        )}
      </div>
    </div>
  );
};

export default Services;
