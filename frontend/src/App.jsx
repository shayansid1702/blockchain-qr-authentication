import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyProduct from "./pages/VerifyProduct";
import ManufacturerDashboard from "./pages/ManufacturerDashboard";
import RegisterProduct from "./pages/RegisterProduct";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify" element={<VerifyProduct />} />
        <Route path="/verify/:id" element={<VerifyProduct />} />

        <Route
          path="/manufacturer"
          element={
            <ProtectedRoute roles={["MANUFACTURER"]}>
              <ManufacturerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manufacturer/register-product"
          element={
            <ProtectedRoute roles={["MANUFACTURER"]}>
              <RegisterProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
}
