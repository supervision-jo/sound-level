import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter, Route, Routes } from "react-router";
import App from "./App.tsx";
import SensorComparisonGraph from "./components/SensorComparisonGraph.tsx";
import { Toaster } from "react-hot-toast";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/sensor-comparison" element={<SensorComparisonGraph />} />
      </Routes>
    </BrowserRouter>
    <Toaster position="top-center" />
  </StrictMode>
);
