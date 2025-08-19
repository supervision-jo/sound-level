import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
// import { BrowserRouter, Route } from "react-router";
// import { Routes } from "react-router";
// import Login from "./pages/Login.tsx";
// import ProtectedRoute from "./pages/ProtectedRoute.tsx";
import App from "./App.tsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {/* <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter> */}
    <App />
    <Toaster position="top-center" />
  </StrictMode>
);
