import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "../../../context/authContext";

const Services = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [services, setServices] = useState([]);
  const [serviceProviders, setServiceProviders] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch services
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
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
        }
      } catch (error) {
        console.error("Error fetching services:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServices();
  }, []);

  // Fetch service providers when a service is selected
  useEffect(() => {
    const fetchServiceProviders = async () => {
      if (!selectedService) return;
      
      setLoading(true);
      try {
        const response = await axios.get(
          `http://localhost:8000/api/users/serviceProviders${selectedService ? `?service=${selectedService.name}` : ''}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        if (response.data.success) {
          setServiceProviders(response.data.serviceProviders);
        }
      } catch (error) {
        console.error("Error fetching service providers:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchServiceProviders();
  }, [selectedService]);

  const handleServiceClick = (service) => {
    // Navigate directly to the map page with the selected service
    navigate("/dashboard/menu/maps", { state: { selectedService: service.name } });
  };

  const handleBackToServices = () => {
    setSelectedService(null);
    setServiceProviders([]);
  };

  const handleViewMap = () => {
    navigate("/dashboard/menu/maps", { state: { selectedService: selectedService.name } });
  };

  // Filter service providers by name
  const filteredProviders = serviceProviders.filter(provider =>
    provider.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {selectedService ? (
        // Service Provider List View
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={handleBackToServices}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <span>←</span> Back to Services
              </button>
              <h2 className="text-2xl font-bold text-gray-800">
                {selectedService.name} Service Providers
              </h2>
            </div>
            <div className="flex gap-4 w-full md:w-auto">
              <input
                type="text"
                placeholder="Search providers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
              />
              <button
                onClick={handleViewMap}
                className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg whitespace-nowrap"
              >
                View All on Map
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProviders.map((provider) => (
              <div
                key={provider._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    {provider.profileImage ? (
                      <img
                        src={`http://localhost:8000/public/registerImage/${provider.profileImage}`}
                        alt={provider.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                        <span className="text-2xl text-gray-600">
                          {provider.name[0]}
                        </span>
                      </div>
                    )}
                    <div>
                      <h3 className="text-lg font-semibold">{provider.name}</h3>
                      <p className="text-gray-600">{provider.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      <span className="font-medium">Phone:</span> {provider.phoneNo}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-medium">Experience:</span>{" "}
                      {provider.question || "Not specified"}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate(`/dashboard/menu/serviceProvider/view/${provider._id}`)}
                    className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
                  >
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {filteredProviders.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No service providers found for this service.</p>
            </div>
          )}
        </div>
      ) : (
        // Services Grid View
        <div>
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <h2 className="text-2xl font-bold text-gray-800">Available Services</h2>
            <button
              onClick={() => navigate("/dashboard/menu/maps")}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg"
            >
              View All Service Providers
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {services.map((service) => (
              <div
                key={service._id}
                onClick={() => handleServiceClick(service)}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow cursor-pointer transform hover:scale-105 transition-transform"
              >
                {service.serviceImage ? (
                  <img
                    src={service.serviceImage}
                    alt={service.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-500">No Image</span>
                  </div>
                )}
                <div className="p-4">
                  <h3 className="text-lg font-semibold text-center text-gray-800">
                    {service.name}
                  </h3>
                </div>
              </div>
            ))}
          </div>

          {services.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-600">No services available.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Services;
