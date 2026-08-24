import { Routes, Route } from 'react-router-dom';
import Navbar from './components/common/Navbar';
import Footer from './components/common/Footer';
import HomePage from './pages/HomePage';
import MaterialsPage from './pages/MaterialsPage';
import ComparisonPage from './pages/ComparisonPage';
import DashboardPage from './pages/DashboardPage';
import SupplierProfilePage from './pages/SupplierProfilePage';
import InquiryPage from './pages/InquiryPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AdminPanel from './pages/AdminPanel';

export default function App() {
  return <div className="app-shell"><Navbar /><main><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/materials" element={<MaterialsPage />} />
    <Route path="/compare" element={<ComparisonPage />} />
    <Route path="/dashboard" element={<DashboardPage />} />
    <Route path="/suppliers/:id" element={<SupplierProfilePage />} />
    <Route path="/inquiry" element={<InquiryPage />} />
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/admin" element={<AdminPanel />} />
  </Routes></main><Footer /></div>;
}
