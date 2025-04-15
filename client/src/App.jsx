import AdminRoutes from "./Routes/AdminRoutes";
import SocketProvider from "./context/SocketProvider";

function App() {
  return (
    <SocketProvider>
      <AdminRoutes />
    </SocketProvider>
  );
}

export default App;
