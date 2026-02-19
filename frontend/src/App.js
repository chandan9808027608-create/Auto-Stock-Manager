import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import VehicleDetail from "./pages/VehicleDetail";
import JobCards from "./pages/JobCards";
import Customers from "./pages/Customers";
import Team from "./pages/Team";
import Reports from "./pages/Reports";
import Partners from "./pages/Partners";
import AIAssistant from "./pages/AIAssistant";
import Settings from "./pages/Settings";

const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  return !user ? children : <Navigate to="/" replace />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="inventory/:id" element={<VehicleDetail />} />
        <Route path="jobs" element={<JobCards />} />
        <Route path="customers" element={<Customers />} />
        <Route path="team" element={<Team />} />
        <Route path="reports" element={<Reports />} />
        <Route path="partners" element={<Partners />} />
        <Route path="ai" element={<AIAssistant />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster richColors position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
