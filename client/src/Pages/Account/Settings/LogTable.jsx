import { useState } from "react";

const logs = [
  { title: "Password Change", ip: "241.157.15.24", time: "21.03.2021 - 16:10" },
  { title: "View Invoice", ip: "211.562.0.184", time: "21.03.2021 - 15:42" },
  { title: "Logout", ip: "195.234.11.94", time: "20.03.2021 - 10:22" },
  {
    title: "Verification Code Sent",
    ip: "195.234.11.94",
    time: "18.03.2021 - 12:50",
  },
  { title: "Password Change", ip: "195.234.11.94", time: "07.02.2021 - 11:10" },
  { title: "New Database", ip: "153.205.03.11", time: "06.02.2021 - 09:25" },
  {
    title: "Secondary Email Enable",
    ip: "241.157.15.24",
    time: "05.02.2021 - 17:53",
  },
  { title: "Login", ip: "241.157.15.02", time: "28.01.2021 - 19:11" },
  { title: "Logout", ip: "241.157.15.24", time: "27.01.2021 - 08:27" },
  {
    title: "Api Key Generated",
    ip: "241.157.15.24",
    time: "26.01.2021 - 12:40",
  },
];

const LogTable = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const logsPerPage = 6;

  // Calculate the index range for current logs
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = logs.slice(indexOfFirstLog, indexOfLastLog);

  // Total number of pages
  const totalPages = Math.ceil(logs.length / logsPerPage);

  // Function to handle page changes
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-lg shadow-md h-[345px]">
      {/* Logs Table */}
      <table className="table-auto w-full border-collapse">
        <thead>
          <tr className="bg-gray-200 text-left text-gray-700 text-sm">
            <th className="px-4 py-2">Title</th>
            <th className="px-4 py-2">IP</th>
            <th className="px-4 py-2">Time</th>
            <th className="px-4 py-2">Action</th>
          </tr>
        </thead>
        <tbody>
          {currentLogs.map((log, index) => (
            <tr
              key={index}
              className={`border-t ${
                index % 2 === 0 ? "bg-gray-50" : "bg-white"
              }`}
            >
              <td className="px-4 py-2">{log.title}</td>
              <td className="px-4 py-2">{log.ip}</td>
              <td className="px-4 py-2">{log.time}</td>
              <td className="px-4 py-2 text-blue-500 cursor-pointer">•••</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Pagination Controls */}
      <div className="flex justify-center mt-4 space-x-2">
        <button
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`px-3 py-1 rounded ${
            currentPage === 1
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, index) => (
          <button
            key={index}
            onClick={() => handlePageChange(index + 1)}
            className={`px-3 py-1 rounded ${
              currentPage === index + 1
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-600 hover:bg-gray-300"
            }`}
          >
            {index + 1}
          </button>
        ))}
        <button
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`px-3 py-1 rounded ${
            currentPage === totalPages
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-500 text-white hover:bg-blue-600"
          }`}
        >
          &gt; 
        </button>
      </div>
    </div>
  );
};

export default LogTable;
