import AdminRoutes from "./Routes/AdminRoutes";
import { SocketProvider } from "./context/SocketContext";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  return (
    <SocketProvider>
      <ToastContainer position="top-right" autoClose={3000} />
      <AdminRoutes />
    </SocketProvider>
  );
}

export default App;
