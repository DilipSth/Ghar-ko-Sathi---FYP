const Maps = () => {
  return (
    <div className="p-4 h-full ">
      <div className="bg-white p-4 rounded-lg shadow-md h-full flex flex-col">
        <h3 className="font-bold text-2xl mb-4">God&apos;s View</h3>
        <div className="flex flex-wrap justify-around mb-4">
          {["Users", "Available"].map((status, index) => (
            <div
              key={index}
              className="flex flex-col items-center mb-2 md:mb-0 md:flex-row md:items-start"
            >
              <span>{status}</span>
              <span className="text-gray-600">(10)</span>
            </div>
          ))}
        </div>
        {/* Full-Screen Google Map Embed */}
        <div className="flex-grow rounded overflow-hidden"> {/* Use flex-grow to take remaining space */}
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
            width="100%"
            height="100%" // Set height to 100%
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Maps;