import { FaUsers, FaTools, FaUsersCog, FaMapMarkerAlt } from "react-icons/fa";
import { MdMiscellaneousServices, MdMyLocation } from "react-icons/md";
import { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import axios from "axios";
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// This component is used to update the map view when position changes
function ChangeView({ center, zoom }) {
  const map = useMap();
  map.setView(center, zoom);
  return null;
}

// PropTypes for ChangeView component
ChangeView.propTypes = {
  center: PropTypes.array.isRequired,
  zoom: PropTypes.number.isRequired
};

const Dashboard = () => {
  const navigate = useNavigate();
  const [userCount, setUserCount] = useState(0);
  const [serviceProviderCount, setServiceProviderCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [servicesCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [position, setPosition] = useState([27.7031, 85.324]); // Default: Kathmandu
  const [mapLoading, setMapLoading] = useState(true);
  const [locationName, setLocationName] = useState("Loading location...");
  const [activeTab, setActiveTab] = useState('today');

  // Try to get location name from coordinates
  const getLocationName = async (lat, lng) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`
      );
      const data = await response.json();
      if (data && data.display_name) {
        return data.display_name;
      }
      return "Current Location";
    } catch (error) {
      console.error("Error fetching location name:", error);
      return "Current Location";
    }
  };

  useEffect(() => {
    const fetchCounts = async () => {
      setLoading(true);
      setMapLoading(true);
      try {
        // Fetch user count
        const userResponse = await axios.get(
          "http://localhost:8000/api/users/gharUsers",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        
        if (userResponse.data.success) {
          setUserCount(userResponse.data.users.length);
        }

        // Fetch service provider count
        const providerResponse = await axios.get(
          "http://localhost:8000/api/users/serviceProvider",
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        
        if (providerResponse.data.success) {
          setServiceProviderCount(providerResponse.data.serviceProviders.length);
          setTotalCount(userResponse.data.users.length + providerResponse.data.serviceProviders.length);
        }

        // Try to get current location (if allowed)
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            setPosition([lat, lng]);
            
            // Get location name
            const name = await getLocationName(lat, lng);
            setLocationName(name);
            setMapLoading(false);
          },
          (error) => {
            console.error("Error getting location:", error);
            setLocationName("Kathmandu, Nepal");
            setMapLoading(false);
          },
          { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
        );
      } catch (err) {
        console.error("Error fetching counts:", err);
        setMapLoading(false);
      } finally {
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  // Center the map on current location
  const centerMap = () => {
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition([lat, lng]);
        
        // Get location name
        const name = await getLocationName(lat, lng);
        setLocationName(name);
      },
      (error) => {
        console.error("Error getting location:", error);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  // On demand service stats based on active tab
  const serviceStats = {
    today: [
      { label: "Total On Demand Jobs", value: 3, color: "text-blue-500" },
      { label: "Inprocess Jobs", value: 1, color: "text-amber-500" },
      { label: "Cancelled Jobs", value: 0, color: "text-rose-500" },
    ],
    total: [
      { label: "Total On Demand Jobs", value: 6, color: "text-blue-500" },
      { label: "Inprocess Jobs", value: 2, color: "text-amber-500" },
      { label: "Cancelled Jobs", value: 1, color: "text-rose-500" },
    ]
  };

  // Handle navigation when clicking on view details button
  const handleViewDetails = (path) => {
    navigate(path);
  };

  // Card configurations
  const cards = [
    {
      title: "Total Users",
      value: totalCount,
      icon: <FaUsersCog className="text-xl" />,
      bgColor: "bg-blue-100",
      borderColor: "border-blue-300",
      iconBg: "bg-blue-50",
      iconColor: "text-blue-500",
      path: "/dashboard/menu/users", // Path to all users page
    },
    {
      title: "Users",
      value: userCount,
      icon: <FaUsers className="text-xl" />,
      bgColor: "bg-green-100",
      borderColor: "border-green-300",
      iconBg: "bg-green-50",
      iconColor: "text-green-500",
      path: "/dashboard/menu/users", // Path to users page
    },
    {
      title: "Service Providers",
      value: serviceProviderCount,
      icon: <FaTools className="text-xl" />,
      bgColor: "bg-amber-100",
      borderColor: "border-amber-300",
      iconBg: "bg-amber-50",
      iconColor: "text-amber-500",
      path: "/dashboard/menu/serviceProvider", // Path to service providers page
    },
    {
      title: "Services",
      value: servicesCount,
      icon: <MdMiscellaneousServices className="text-xl" />,
      bgColor: "bg-purple-100",
      borderColor: "border-purple-300",
      iconBg: "bg-purple-50",
      iconColor: "text-purple-500",
      path: "/dashboard/menu/services/add-services", // Path to services page
    }
  ];

  // Custom marker icon for user location
  const userLocationIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="p-5 bg-gray-50">
      <div className="bg-blue-50 border border-blue-200 text-blue-700 p-4 rounded-lg mb-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-blue-600 text-sm opacity-80">Welcome to Ghar Ko Sathi admin panel</p>
      </div>
      
      {/* Stats Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {cards.map((card, index) => (
          <div key={index} className={`bg-white rounded-lg shadow-sm border ${card.borderColor} overflow-hidden`}>
            <div className={`${card.bgColor} p-3`}>
              <p className={`font-medium ${card.iconColor}`}>{card.title}</p>
            </div>
            <div className="p-4 flex items-center justify-between">
              <p className="text-3xl font-bold text-gray-700">
                {loading ? "..." : card.value}
              </p>
              <div className={`${card.iconBg} p-3 rounded-full ${card.iconColor}`}>
                {card.icon}
              </div>
            </div>
            <div className={`${card.bgColor} bg-opacity-60 px-4 py-2 border-t ${card.borderColor}`}>
              <button 
                className={`text-sm ${card.iconColor} font-medium hover:underline`}
                onClick={() => handleViewDetails(card.path)}
              >
                View Details →
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 p-4 text-blue-700 border-b border-blue-200 flex justify-between items-center">
            <h2 className="font-semibold flex items-center">
              <FaMapMarkerAlt className="mr-2" /> Your Location
            </h2>
            <button 
              onClick={centerMap}
              className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded text-sm flex items-center border border-blue-300"
            >
              <MdMyLocation className="mr-1" /> Refresh Location
            </button>
          </div>
          <div className="p-4">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <span className="text-sm text-gray-500 mr-2">Current location:</span>
                <span className="font-medium text-gray-700 text-sm">
                  {mapLoading ? "Detecting your location..." : locationName}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                {position[0].toFixed(4)}, {position[1].toFixed(4)}
              </div>
            </div>
            <div className="h-[400px] rounded border border-gray-200 relative">
              {mapLoading && (
                <div className="absolute inset-0 bg-gray-100 bg-opacity-80 flex items-center justify-center z-10">
                  <div className="text-center">
                    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-gray-700">Locating you...</p>
                  </div>
                </div>
              )}
              <MapContainer 
                center={position} 
                zoom={15} 
                style={{ height: '100%', width: '100%' }}
                className="z-0"
              >
                <ChangeView center={position} zoom={15} />
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={position} icon={userLocationIcon}>
                  <Popup>
                    <div>
                      <div className="font-medium text-blue-700">Your Location</div>
                      <div className="text-sm text-gray-600 mt-1">{locationName}</div>
                    </div>
                  </Popup>
                </Marker>
              </MapContainer>
            </div>
          </div>
        </div>

        {/* On Demand Services Section */}
        <div className="bg-white rounded-lg shadow-sm border border-amber-200 overflow-hidden">
          <div className="bg-amber-50 p-4 text-amber-700 border-b border-amber-200">
            <h2 className="font-semibold">On Demand Services</h2>
          </div>
          
          <div className="p-4">
            <div className="flex border-b mb-4">
              <button 
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'today' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('today')}
              >
                Today
              </button>
              <button 
                className={`pb-2 px-4 text-sm font-medium ${
                  activeTab === 'total' 
                    ? 'text-blue-500 border-b-2 border-blue-500' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
                onClick={() => setActiveTab('total')}
              >
                Total
              </button>
            </div>

            {/* Job Stats */}
            <div className="space-y-3">
              {serviceStats[activeTab].map((stat, index) => (
                <div 
                  key={index} 
                  className="p-3 bg-white rounded-lg flex justify-between items-center border border-gray-200"
                >
                  <span className="text-sm font-medium text-gray-600">{stat.label}</span>
                  <span className={`text-lg font-semibold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
            
            <div className="mt-4 pt-3 border-t text-center">
              <button 
                className="bg-amber-100 text-amber-700 border border-amber-300 px-4 py-2 rounded text-sm font-medium hover:bg-amber-200 transition-colors"
                onClick={() => navigate('/dashboard/menu/services')}
              >
                View All Services
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
