import React from 'react';

const ServiceProviderCard = ({ provider, onSelect }) => {
  return (
    <div
      className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all cursor-pointer"
      onClick={() => onSelect(provider)}
    >
      <div className="flex items-start space-x-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <img
            src={`http://localhost:8000/public/registerImage/${provider.profileImage}`}
            alt={provider.name}
            className="w-full h-full rounded-lg object-cover border-2 border-blue-100"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = "https://via.placeholder.com/64?text=P";
            }}
          />
          <div className="absolute -bottom-1 -right-1">
            <span className="bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full shadow-sm">
              Active
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-base font-semibold text-gray-900 mb-0.5 truncate">
            {provider.name}
          </h4>
          <div className="flex items-center mb-1">
            <div className="flex items-center text-yellow-400">
              {[...Array(5)].map((_, index) => (
                <span
                  key={index}
                  className={`text-sm ${
                    index < Math.floor(provider.rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                >
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm font-medium text-gray-700 ml-1">
              {provider.rating}
            </span>
            <span className="text-xs text-gray-500 ml-1">
              ({provider.completedJobs})
            </span>
          </div>
          <div className="space-y-0.5">
            <p className="text-sm text-gray-600 truncate">
              <span className="font-medium">Services:</span>{" "}
              {provider.services}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Phone:</span>{" "}
              {provider.phone}
            </p>
          </div>
        </div>
      </div>
      <button
        className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white py-1.5 px-4 rounded-lg transition-all flex items-center justify-center text-sm font-medium shadow-sm hover:shadow-md"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(provider);
        }}
      >
        <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        Book Now
      </button>
    </div>
  );
};

export default ServiceProviderCard; 