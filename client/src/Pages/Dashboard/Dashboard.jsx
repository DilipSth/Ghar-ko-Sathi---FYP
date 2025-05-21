import { FaUsers, FaTools, FaUsersCog, FaMapMarkerAlt } from "react-icons/fa";
import { MdMiscellaneousServices, MdMyLocation } from "react-icons/md";
import { useEffect, useState } from "react";
import PropTypes from 'prop-types';
import axios from "axios";
import { useNavigate, useLocation } from 'react-router-dom';
import { LiveTracking } from "../../Components/Map";
import { ReviewForm } from "../../Components";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [userCount, setUserCount] = useState(0);
  const [serviceProviderCount, setServiceProviderCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [servicesCount] = useState(4);
  const [loading, setLoading] = useState(true);
  const [currentPosition, setCurrentPosition] = useState({ lat: 27.7031, lng: 85.324 }); // Default: Kathmandu
  const [mapLoading, setMapLoading] = useState(true);
  const [locationName, setLocationName] = useState("Loading location...");
  const [activeTab, setActiveTab] = useState('today');
  const [showReviewForm, setShowReviewForm] = useState(false);

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
    // Fetch user counts
    const fetchCounts = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/users/counts');
        setUserCount(response.data.userCount);
        setServiceProviderCount(response.data.serviceProviderCount);
        setTotalCount(response.data.totalCount);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching counts:', error);
        setLoading(false);
      }
    };

    fetchCounts();
  }, []);

  useEffect(() => {
    // Check for review parameter in URL
    const params = new URLSearchParams(location.search);
    const shouldShowReview = params.get('showReview') === 'true';
    
    if (shouldShowReview) {
      setShowReviewForm(true);
    }
  }, [location.search]);

  // Check localStorage for review information on mount
  useEffect(() => {
    const showReview = localStorage.getItem('showReviewForm') === 'true';
    if (showReview) {
      setShowReviewForm(true);
      // Optionally clear the flag after showing the form
      // localStorage.removeItem('showReviewForm');
    }
  }, []);

  // Handle location update from RealTimeMap
  const handleLocationUpdate = async (position) => {
    setCurrentPosition(position);
    setMapLoading(false);
    const name = await getLocationName(position.lat, position.lng);
    setLocationName(name);
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
      value: loading ? "..." : userCount,
      icon: <FaUsers className="text-blue-500" size={24} />,
      path: "/admin/users"
    },
    {
      title: "Service Providers",
      value: loading ? "..." : serviceProviderCount,
      icon: <FaUsersCog className="text-green-500" size={24} />,
      path: "/admin/service-providers"
    },
    {
      title: "Total Services",
      value: servicesCount,
      icon: <MdMiscellaneousServices className="text-purple-500" size={24} />,
      path: "/admin/services"
    },
    {
      title: "Total Members",
      value: loading ? "..." : totalCount,
      icon: <FaTools className="text-orange-500" size={24} />,
      path: "/admin/members"
    }
  ];

  return (
    <div className="p-4 space-y-6">
      {/* Review Form Modal */}
      {showReviewForm && (
        <ReviewForm onClose={() => setShowReviewForm(false)} />
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div key={index} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-gray-500 text-sm">{card.title}</h3>
                <p className="text-2xl font-semibold mt-2">{card.value}</p>
              </div>
              {card.icon}
            </div>
            <button
              onClick={() => handleViewDetails(card.path)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View Details →
            </button>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Map Section */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-blue-200 overflow-hidden">
          <div className="bg-blue-50 p-4 text-blue-700 border-b border-blue-200 flex justify-between items-center">
            <h2 className="font-semibold flex items-center">
              <FaMapMarkerAlt className="mr-2" /> Live Location Tracking
            </h2>
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
                {currentPosition.lat.toFixed(4)}, {currentPosition.lng.toFixed(4)}
              </div>
            </div>
            <div className="h-[400px] rounded border border-gray-200 relative">
              <LiveTracking
                onPositionUpdate={handleLocationUpdate}
                showOnlyUserLocation={true}
                bookingState="idle"
                className="h-full"
              />
            </div>
          </div>
        </div>

        {/* On Demand Services Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">On Demand Services</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('today')}
                className={`px-3 py-1 rounded text-sm ${
                  activeTab === 'today'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Today
              </button>
              <button
                onClick={() => setActiveTab('total')}
                className={`px-3 py-1 rounded text-sm ${
                  activeTab === 'total'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                Total
              </button>
            </div>
          </div>
          
          <div className="space-y-4">
            {serviceStats[activeTab].map((stat, index) => (
              <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="text-gray-600">{stat.label}</span>
                <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
