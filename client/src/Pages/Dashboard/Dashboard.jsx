import { FaUsers } from "react-icons/fa";
import { GiAutoRepair } from "react-icons/gi";

const Dashboard = () => {
  return (
    <div className="p-4">
       <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="col-span-1 md:col-span-2">
          <div className="bg-white p-4 rounded-lg shadow-md">
            <h3 className="font-bold text-lg mb-4">God&apos;s View</h3>
            <div className="flex flex-wrap justify-between mb-4">
              {["Users", "Available"].map((status, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center mb-2 md:mb-0 md:flex-row md:items-start"
                >
                  <span>{status}</span>
                  <span className="text-gray-600">(0)</span>
                </div>
              ))}
            </div>
            <div className="bg-gray-200 h-[300px] rounded">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3532.856520737962!2d85.324!3d27.7031!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x39eb191e9c5b5c5b%3A0x9c8dc9e8b8f8b8e6!2sKathmandu%2C%20Nepal!5e0!3m2!1sen!2sus!4v1634930201234!5m2!1sen!2sus"
                width="100%"
                height="100%" // Set height to 100%
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
              ></iframe>
            </div>
            {/* Map placeholder */}
          </div>
        </div>

        {/* User and Service Provider Stats */}
        <div className="grid grid-cols-1 gap-y-4 md:grid-cols-1 md:gap-x-4">
          <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center gap-2">
            <FaUsers className="text-5xl text-blue-500" />
            <h3 className="font-bold text-2xl mb-1 text-center text-blue-500">
              User&apos;s
            </h3>
            <p className="text-[23px] font-semibold text-blue-500">11</p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-md flex flex-col items-center justify-center gap-2">
            <GiAutoRepair className="text-5xl text-green-500" />

            <h3 className="font-bold text-2xl mb-1 text-center text-green-500">
              Service Provider
            </h3>
            <p className="text-[23px] font-semibold text-green-500">10</p>
          </div>
        </div>
      </div>

      {/* On Demand Services Section */}
      <div className="bg-white p-4 mt-4 rounded-lg shadow-md">
        <h3 className="font-bold text-lg mb-4">On Demand Services</h3>
        <div className="flex justify-between mb-4 flex-col md:flex-row">
          <button className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-500 transition duration-200">
            Today
          </button>
          <button className="text-gray-600 hover:text-blue-600 transition duration-200">
            Total
          </button>
        </div>

        {/* Job Stats */}
        {[
          { label: "Total On Demand Jobs", value: 6 },
          { label: "Inprocess Jobs", value: "0.00" },
          { label: "Cancelled Jobs", value: "0.00" },
        ].map((jobStat) => (
          <p key={jobStat.label} className="flex justify-between mt-2">
            <span>{jobStat.label}</span>
            <span>{jobStat.value}</span>
          </p>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
