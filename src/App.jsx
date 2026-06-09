import React, { useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';

const ScrollToTopOnNavigation = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Pages
import Home from './pages/Home';
import Collection from './pages/Collection';
import ProductDetail from './pages/ProductDetail';
import Login from './pages/Login';
import Cart from './pages/Cart';
import CheckoutSuccess from './pages/CheckoutSuccess';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminProducts from './pages/admin/AdminProducts';
import AdminAddProduct from './pages/admin/AdminAddProduct';
import AdminPdfImport from './pages/admin/AdminPdfImport';
import AdminUsers from './pages/admin/AdminUsers';
import AdminSettings from './pages/admin/AdminSettings';

// Client Layout wrapper displaying main site navbar & footer
const ClientLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <div style={{ flexGrow: 1 }}>{children}</div>
      <Footer />
      <ScrollToTop />
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ScrollToTopOnNavigation />
        <Routes>
          
          {/* PUBLIC & CLIENT PORTAL ROUTES (WITH NAVBAR/FOOTER) */}
          <Route path="/" element={<ClientLayout><Home /></ClientLayout>} />
          <Route path="/collection" element={<ClientLayout><Collection /></ClientLayout>} />
          <Route path="/product/:id" element={<ClientLayout><ProductDetail /></ClientLayout>} />
          <Route path="/login" element={<ClientLayout><Login /></ClientLayout>} />
          
          {/* PROTECTED CLIENT ROUTES */}
          <Route path="/cart" element={<ClientLayout><Cart /></ClientLayout>} />
          <Route path="/checkout/success" element={<ClientLayout><CheckoutSuccess /></ClientLayout>} />

          {/* ADMIN ROUTES (TOTALLY ISOLATED - NO CLIENT LAYOUT) */}
          <Route path="/admin/login" element={<AdminLogin />} />
          
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="add-product" element={<AdminAddProduct />} />
            <Route path="add-via-pdf" element={<AdminPdfImport />} />
            <Route path="users" element={<AdminUsers initialTab="USERS" />} />
            <Route path="registrations" element={<AdminUsers initialTab="PENDING" />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />

        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
