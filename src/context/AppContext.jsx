import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { fetchAllProducts, mapRecord } from '../lib/productsService';
import { fetchAllUsers, fetchPendingRegistrations, createRegistration as pbCreateRegistration, deleteRegistration as pbDeleteRegistration, updateRegistrationStatus as pbUpdateRegistrationStatus, createUser as pbCreateUser, deleteUser as pbDeleteUser } from '../lib/usersService';

import { apiGet, apiPost } from '../lib/apiClient';

const AppContext = createContext();

// Default admin settings
const defaultSettings = {
  whatsappNumber: "7358349394",
  storeName: "DEVI TIMES",
  currency: "₹",
  websiteUrl: "http://localhost:5173", // default local dev url
  lowStockThreshold: 10,
  inventoryAlertEnabled: true,
  bannerAlertEnabled: true,
  alertData: {}
};

// Global cache for fetched JSON galleries to avoid duplicate network requests
const fetchedGalleriesCache = {};

export const AppProvider = ({ children }) => {
  // Products — fetched from PocketBase on mount
  const [products, setProducts] = useState([]);
  const [retailProducts, setRetailProducts] = useState([]);

  const lastProductsFetchRef = useRef(0);
  const lastUsersFetchRef = useRef(0);

  const fetchJsonGalleryIfNeeded = async (product, callback) => {
    if (!product._jsonUrl) return;
    const cacheKey = product._jsonUrl + '?' + (product.updatedAt || '');
    const cacheVal = fetchedGalleriesCache[cacheKey];
    if (Array.isArray(cacheVal)) {
      callback(product.id, cacheVal);
      return;
    }
    if (cacheVal === 'fetching' || cacheVal === 'failed') {
      return;
    }

    fetchedGalleriesCache[cacheKey] = 'fetching';
    try {
      const fetchUrl = product._jsonUrl + (product._jsonUrl.includes('?') ? '&' : '?') + 't=' + (product.updatedAt ? encodeURIComponent(product.updatedAt) : '');
      const res = await fetch(fetchUrl, { cache: 'force-cache' }); // use browser cache for galleries
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchedGalleriesCache[cacheKey] = data;
          callback(product.id, data);
          return;
        }
      }
      fetchedGalleriesCache[cacheKey] = 'failed';
    } catch (err) {
      console.error('Failed to fetch JSON gallery for product:', product.id, err);
      fetchedGalleriesCache[cacheKey] = 'failed';
    }
  };

  const loadProducts = async (force = false) => {
    const now = Date.now();
    if (!force && products.length > 0 && now - lastProductsFetchRef.current < 15000) {
      console.log('[AppContext] Returning cached products');
      return;
    }
    lastProductsFetchRef.current = now;
    try {
      const pbProducts = await fetchAllProducts();
      setProducts(pbProducts);

      const rProducts = pbProducts
        .filter(p => (p.product_type === 'retail' || p.product_type === 'RETAIL') || p.retailPrice > 0)
        .map(p => ({ ...p, salePrice: p.retailPrice, originalPrice: null, isOnSale: false }));
      setRetailProducts(rProducts);

      // Fetch JSON galleries in the background
      pbProducts.forEach(prod => {
        if (prod._jsonUrl) {
          fetchJsonGalleryIfNeeded(prod, (id, images) => {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
            setRetailProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
          });
        }
      });
    } catch (err) {
      console.error('[AppContext] Failed to fetch products from PocketBase:', err);
      throw err;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let pollIntervalId = null;

    const loadGlobalSettings = async () => {
      try {
        const data = await apiGet('/api/settings');
        if (data && data.success && data.settings) {
          const s = data.settings;
          setSettings(prev => ({
            ...prev,
            whatsappNumber: s.whatsapp_number || s.whatsappNumber || "7358349394",
            lowStockThreshold: s.low_stock_limt !== undefined ? Number(s.low_stock_limt) : (s.low_stock_limit !== undefined ? Number(s.low_stock_limit) : 10),
            bannerAlertEnabled: s.banner_alert !== false,
            inventoryAlertEnabled: s.inventory_alert !== false,
            alertData: s.alert_data && typeof s.alert_data === 'object' ? s.alert_data : prev.alertData
          }));
        }
      } catch (err) {
        console.warn('[AppContext] Failed to load settings from API:', err);
      }
    };

    loadProducts();
    loadGlobalSettings();

    pollIntervalId = setInterval(() => {
      loadProducts();
      loadGlobalSettings();
    }, 30000); // Poll every 30s as fallback

    return () => {
      isMounted = false;
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
      }
    };
  }, []);

  const [users, setUsers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('lumiere_settings');
    let parsedSettings = saved ? JSON.parse(saved) : defaultSettings;
    
    return parsedSettings;
  });

  // User Session (sessionStorage and localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = sessionStorage.getItem('lumiere_current_user');
    const savedLocal = localStorage.getItem('lumiere_current_user');
    const saved = savedSession || savedLocal;
    return saved ? JSON.parse(saved) : null;
  });

  // Retail User Session (sessionStorage and localStorage)
  const [currentRetailUser, setCurrentRetailUser] = useState(() => {
    const savedSession = sessionStorage.getItem('lumiere_retail_user');
    const savedLocal = localStorage.getItem('lumiere_retail_user');
    const saved = savedSession || savedLocal;
    return saved ? JSON.parse(saved) : null;
  });

  // Admin Session (persisted in localStorage)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    const savedToken = localStorage.getItem('lumiere_admin_auth_token');
    if (savedToken) {
      try {
        const parsed = JSON.parse(savedToken);
        if (parsed && parsed.isAuthenticated) {
          return true;
        }
      } catch (e) {
        localStorage.removeItem('lumiere_admin_auth_token');
      }
    }
    return false;
  });

  const loadUserData = async (force = false) => {
    const now = Date.now();
    if (!force && users.length > 0 && now - lastUsersFetchRef.current < 15000) {
      console.log('[AppContext] Returning cached users');
      return;
    }
    lastUsersFetchRef.current = now;
    try {
      const pbUsers = await fetchAllUsers();
      setUsers(pbUsers);
      const pbRegs = await fetchPendingRegistrations();
      setPendingRegistrations(pbRegs);
    } catch (err) {
      console.error('[AppContext] Failed to load user data from PocketBase:', err);
      throw err;
    }
  };

  useEffect(() => {
    if (isAdminAuthenticated) {
      loadUserData().catch(err => {
        console.error("Background loadUserData failed:", err);
      });
    } else {
      setUsers([]);
      setPendingRegistrations([]);
    }
  }, [isAdminAuthenticated]);

  // Cart state, keyed by logged in user id. If no user, empty array
  const [cart, setCart] = useState([]);

  // Load and save cart when user shifts
  useEffect(() => {
    if (currentUser) {
      const savedCart = localStorage.getItem(`lumiere_cart_${currentUser.userId}`);
      setCart(savedCart ? JSON.parse(savedCart) : []);
    } else {
      setCart([]);
    }
  }, [currentUser]);

  // Synchronize admin auth states across tabs in real-time
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'lumiere_admin_auth_token') {
        if (!e.newValue) {
          setIsAdminAuthenticated(false);
        } else {
          try {
            const parsedToken = JSON.parse(e.newValue);
            if (parsedToken.isAuthenticated) {
              setIsAdminAuthenticated(true);
            } else {
              setIsAdminAuthenticated(false);
            }
          } catch (err) {
            setIsAdminAuthenticated(false);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  useEffect(() => {
    localStorage.setItem('lumiere_settings', JSON.stringify(settings));
  }, [settings]);

  // Save Cart to LocalStorage whenever it changes for active user
  const saveCartForUser = (newCart) => {
    setCart(newCart);
    if (currentUser) {
      localStorage.setItem(`lumiere_cart_${currentUser.userId}`, JSON.stringify(newCart));
    }
  };

  // --- Product Management Actions ---
  const addProduct = (prod) => {
    const newProduct = {
      ...prod,
      id: prod.id || `prod_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    setProducts(prev => [newProduct, ...prev]);
  };

  const updateProduct = (updatedProd) => {
    setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
  };

  const deleteProduct = (id) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const toggleProductLive = (id) => {
    setProducts(prev => prev.map(p => {
      if (p.id === id) {
        return { ...p, isLive: !p.isLive };
      }
      return p;
    }));
  };

  // --- Registration / User Management Actions ---
  const registerUser = async (name, mobile) => {
    try {
      const newReg = await pbCreateRegistration(name, mobile);
      setPendingRegistrations(prev => [newReg, ...prev]);
      return newReg;
    } catch (err) {
      console.error('Failed to register user in PocketBase:', err);
      throw err;
    }
  };

  const approveRegistration = async (regId, customUserId, password) => {
    const reg = pendingRegistrations.find(r => r.id === regId);
    if (!reg) return null;

    try {
      const newUser = await pbCreateUser({
        userId: customUserId,
        name: reg.name,
        mobile: reg.mobile,
        password: password
      });

      await pbUpdateRegistrationStatus(regId, "approved");

      setUsers(prev => [newUser, ...prev]);
      setPendingRegistrations(prev => prev.filter(r => r.id !== regId));
      return newUser;
    } catch (err) {
      console.error('Failed to approve registration:', err);
      alert('Failed to approve registration via PocketBase');
      return null;
    }
  };

  const deleteRegistrationRequest = async (regId) => {
    try {
      await pbDeleteRegistration(regId);
      setPendingRegistrations(prev => prev.filter(r => r.id !== regId));
    } catch (err) {
      console.error('Failed to delete registration request:', err);
      alert('Failed to delete registration from PocketBase');
    }
  };

  const createUser = async (user) => {
    try {
      const newUser = await pbCreateUser(user);
      setUsers(prev => [newUser, ...prev]);
    } catch (err) {
      console.error('Failed to create user:', err);
      alert('Failed to create user in PocketBase');
    }
  };

  const updateUserStatus = async (userId, status) => {
    try {
      const user = users.find(u => u.userId === userId);
      if (user && user.pbId) {
        let newName = user.name;
        if (status === 'suspended') {
          if (!newName.endsWith(' [SUSPENDED]')) {
            newName = newName + ' [SUSPENDED]';
          }
        } else {
          newName = newName.replace(' [SUSPENDED]', '');
        }
        await apiPut(`/api/admin/users/${user.pbId}`, { Full_Name: newName });
      }
      setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status } : u));
    } catch (err) {
      console.error('Failed to update user status:', err);
      alert('Failed to update user status in PocketBase');
    }
  };

  const deleteUser = async (userId) => {
    try {
      const user = users.find(u => u.userId === userId);
      if (user && user.pbId) {
        await pbDeleteUser(user.pbId);
      }
      setUsers(prev => prev.filter(u => u.userId !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user from PocketBase');
    }
  };

  // --- User Authentication Actions ---
  const loginUser = async (userId, password) => {
    try {
      const trimmedId = userId.trim();
      const trimmedPass = password.trim();

      // Check if it is a retail user
      try {
        const retailData = await apiPost('/api/retail-login', { username: trimmedId, password: trimmedPass });
        if (retailData.success && retailData.user) {
          const match = retailData.user;
          if (!match.active) {
            return { success: false, message: "Your account is not active. Please contact admin." };
          }
          const sessionObj = {
            userId: trimmedId,
            id: match.id,
            name: match.name || 'Retailer',
            mobile: '',
            isRetail: true
          };
          sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          localStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          setCurrentUser(sessionObj);
          return { success: true, isRetail: true };
        }
      } catch (err) {
        // Not a retail user or login failed, continue to User collection check
      }

      // 1. Search in PocketBase User collection via API
      try {
        const wholesaleData = await apiPost('/api/wholesale-login', { username: trimmedId, password: trimmedPass });
        if (wholesaleData.success && wholesaleData.user) {
          const matchedUser = wholesaleData.user;
          const sessionObj = {
            userId: matchedUser.User_ID || matchedUser.id,
            id: matchedUser.id,
            name: matchedUser.Full_Name || 'Valued Customer',
            mobile: matchedUser.moblieno || matchedUser.mobileno || '',
            isRetail: false
          };
          
          sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          localStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          setCurrentUser(sessionObj);
          
          return { success: true, isRetail: false };
        }
      } catch (err) {
        if (err.message && err.message.includes('suspended')) {
           return { success: false, message: "Your account is suspended. Please contact admin." };
        }
      }
      try {
        const check = await apiGet(`/api/check-pending-registration?user=${encodeURIComponent(userId.trim())}`);
        if (check.isPending) {
          return { success: false, message: "Your account is not approved yet. Please contact admin." };
        }
      } catch (err) {
        // Ignore — if collection read fails, proceed to invalid credentials
      }

      return { success: false, message: "Invalid username or password. Please contact admin." };
    } catch (err) {
      console.error('[AppContext] loginUser error:', err);
      return { success: false, message: "Invalid username or password. Please contact admin." };
    }
  };

  const logoutUser = () => {
    sessionStorage.removeItem('lumiere_current_user');
    localStorage.removeItem('lumiere_current_user');
    sessionStorage.removeItem('lumiere_retail_user');
    localStorage.removeItem('lumiere_retail_user');
    localStorage.removeItem('pocketbase_auth');
    pb.authStore.clear();
    setCurrentUser(null);
    setCurrentRetailUser(null);
    setCart([]);
  };

  const loginRetailUser = async (username, password) => {
    try {
      const data = await apiPost('/api/retail-login', { username: username.trim(), password: password.trim() });
      if (data.success && data.user) {
        const matchedUser = data.user;
        if (!matchedUser.active) {
          return { success: false, message: "Your account is not active. Please contact admin." };
        }
        
        sessionStorage.removeItem('lumiere_retail_user');
        localStorage.removeItem('lumiere_retail_user');
        
        const sessionObj = {
          id: matchedUser.id,
          username: matchedUser.username,
          name: matchedUser.name
        };
        sessionStorage.setItem('lumiere_retail_user', JSON.stringify(sessionObj));
        localStorage.setItem('lumiere_retail_user', JSON.stringify(sessionObj));
        setCurrentRetailUser(sessionObj);
        return { success: true };
      }
      return { success: false, message: "Invalid username or password." };
    } catch (err) {
      console.error('[AppContext] loginRetailUser error:', err);
      return { success: false, message: err.message || "Authentication failed. Please check connection." };
    }
  };

  const logoutRetailUser = () => {
    sessionStorage.removeItem('lumiere_current_user');
    localStorage.removeItem('lumiere_current_user');
    sessionStorage.removeItem('lumiere_retail_user');
    localStorage.removeItem('lumiere_retail_user');
    localStorage.removeItem('pocketbase_auth');
    pb.authStore.clear();
    setCurrentUser(null);
    setCurrentRetailUser(null);
    setCart([]);
  };

  const checkCurrentUserStatus = async () => {
    if (!currentUser) return true;
    if (currentUser.isRetail) return true;
    try {
      const check = await apiGet(`/api/check-user-status?userId=${encodeURIComponent(currentUser.userId)}`);
      
      if (check && check.suspended) {
        logoutUser();
        alert('Your account is suspended. Please contact admin.');
        window.location.hash = '/login';
        return false;
      }

      // If the session object doesn't have the database record ID, update it
      if (check && check.id && !currentUser.id) {
        const updatedSession = {
          ...currentUser,
          id: check.id
        };
        sessionStorage.setItem('lumiere_current_user', JSON.stringify(updatedSession));
        localStorage.setItem('lumiere_current_user', JSON.stringify(updatedSession));
        setCurrentUser(updatedSession);
      }
      if (check && !check.id) {
        logoutUser();
        window.location.hash = '/login';
        return false;
      }
    } catch (err) {
      console.error('[AppContext] Error checking user status:', err);
    }
    return true;
  };

  // Recheck current user status on app mount / load
  useEffect(() => {
    checkCurrentUserStatus();
  }, []);

  // --- Cart Actions ---
  const addToCart = (product, qty = 1) => {
    const existingIndex = cart.findIndex(item => item.productId === product.id);
    let newCart = [...cart];

    if (existingIndex > -1) {
      const newQty = newCart[existingIndex].quantity + qty;
      newCart[existingIndex].quantity = newQty;
    } else {
      newCart.push({
        productId: product.id,
        productName: product.name,
        modelNumber: product.modelNumber,
        category: product.category,
        size: product.size,
        color: product.color,
        unitPrice: product.salePrice,
        quantity: qty,
        image: product.images && product.images.length > 0 ? product.images[0] : null
      });
    }
    saveCartForUser(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCartForUser(newCart);
  };

  const updateCartQuantity = (productId, quantity) => {
    const finalQty = Math.max(1, quantity);
    const newCart = cart.map(item => {
      if (item.productId === productId) {
        return { ...item, quantity: finalQty };
      }
      return item;
    });
    saveCartForUser(newCart);
  };

  const clearCart = () => {
    saveCartForUser([]);
  };

  const loginAdmin = async (username, password) => {
    try {
      const data = await apiPost('/api/admin/login', { username, password });
      if (data.success && data.token) {
        const tokenData = {
          isAuthenticated: true,
          token: data.token,
          timestamp: Date.now()
        };
        localStorage.setItem('lumiere_admin_auth_token', JSON.stringify(tokenData));
        setIsAdminAuthenticated(true);
        return true;
      }
    } catch (err) {
      console.error('[AppContext] Admin login error:', err);
    }
    return false;
  };

  const logoutAdmin = () => {
    localStorage.removeItem('lumiere_admin_auth_token');
    setIsAdminAuthenticated(false);
    pb.authStore.clear();
  };

  const updateSettings = (newSettings) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings
    }));
  };

  const saveSettingsToPB = async (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('lumiere_settings', JSON.stringify(newSettings));

    const whatsappNum = newSettings.whatsappNumber || "7358349394";
    const threshold = (newSettings.lowStockThreshold !== undefined && !isNaN(Number(newSettings.lowStockThreshold))) ? Number(newSettings.lowStockThreshold) : 10;
    const enabled = newSettings.inventoryAlertEnabled !== false;
    const bannerEnabled = newSettings.bannerAlertEnabled !== false;
    const alertData = newSettings.alertData || {};

    const payload = {
      whatsapp_number: whatsappNum,
      low_stock_limt: threshold,
      inventory_alert: enabled,
      banner_alert: bannerEnabled,
      alert_data: alertData
    };

    try {
      await apiPost('/api/admin/settings', payload);
    } catch (err) {
      console.error("Failed to save settings to backend:", err);
    }
  };

  const checkAndTriggerLowStockAlert = async (product, newStockVal) => {
    const threshold = settings.lowStockThreshold || 10;
    
    if (newStockVal <= threshold) {
      const updatedAlertData = { ...settings.alertData };
      const prevAlertInfo = updatedAlertData[product.id] || { alertSent: false };
      
      if (!prevAlertInfo.alertSent) {
        updatedAlertData[product.id] = {
          alertSent: true,
          lastAlertSentAt: new Date().toISOString()
        };
        updateSettings({ alertData: updatedAlertData });
        await saveSettingsToPB({
          ...settings,
          alertData: updatedAlertData
        });
      }
    } else {
      const updatedAlertData = { ...settings.alertData };
      if (updatedAlertData[product.id]) {
        updatedAlertData[product.id] = {
          ...updatedAlertData[product.id],
          alertSent: false
        };
        updateSettings({ alertData: updatedAlertData });
        await saveSettingsToPB({
          ...settings,
          alertData: updatedAlertData
        });
      }
    }
  };

  return (
    <AppContext.Provider value={{
      products,
      retailProducts,
      users,
      pendingRegistrations,
      settings,
      currentUser,
      currentRetailUser,
      isAdminAuthenticated,
      cart,
      refreshProducts: loadProducts,
      refreshUsers: loadUserData,
      addProduct,
      updateProduct,
      deleteProduct,
      toggleProductLive,
      registerUser,
      approveRegistration,
      deleteRegistrationRequest,
      createUser,
      updateUserStatus,
      deleteUser,
      loginUser,
      logoutUser,
      loginRetailUser,
      logoutRetailUser,
      checkCurrentUserStatus,
      updateUserStatus,
      addToCart,
      removeFromCart,
      updateCartQuantity,
      clearCart,
      loginAdmin,
      logoutAdmin,
      updateSettings,
      saveSettingsToPB,
      checkAndTriggerLowStockAlert
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
