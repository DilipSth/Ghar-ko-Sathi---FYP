// index.js
import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter as Router } from "react-router-dom";
// import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import App from "./App";
import AuthContext from "./context/authContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* <Provider store={store}> */}
    <AuthContext>
      <Router>
        <Toaster />
        <App />
      </Router>
    </AuthContext>
    {/* </Provider> */}
  </React.StrictMode>
);