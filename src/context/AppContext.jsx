import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAllProducts, mapRecord } from '../lib/productsService';
import { fetchAllUsers, fetchPendingRegistrations, createRegistration as pbCreateRegistration, deleteRegistration as pbDeleteRegistration, updateRegistrationStatus as pbUpdateRegistrationStatus, createUser as pbCreateUser, deleteUser as pbDeleteUser } from '../lib/usersService';
import pb from '../lib/pocketbase';

const AppContext = createContext();

// (seedProducts removed — all products now come from PocketBase)

// Default admin settings
const defaultSettings = {
  whatsappNumber: "7358349394",
  storeName: "DEVI TIMES",
  currency: "₹",
  websiteUrl: "http://localhost:5173", // default local dev url
  adminPassword: "lumiere@admin2024",
  retailUserId: "work001",
  retailPassword: "naveenwork001"
};

// Global cache for fetched JSON galleries to avoid duplicate network requests
const fetchedGalleriesCache = {};

export const AppProvider = ({ children }) => {
  // Products — fetched from PocketBase on mount (no more localStorage/seedProducts)
  const [products, setProducts] = useState([]);
  const [retailProducts, setRetailProducts] = useState([]);

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
      const fetchUrl = product._jsonUrl + (product._jsonUrl.includes('?') ? '&' : '?') + 't=' + (product.updatedAt ? encodeURIComponent(product.updatedAt) : Date.now());
      const res = await fetch(fetchUrl, { cache: 'no-store' });
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

  const loadProducts = async () => {
    try {
      const pbProducts = await fetchAllProducts();
      setProducts(pbProducts);

      // Fetch JSON galleries in the background
      pbProducts.forEach(prod => {
        if (prod._jsonUrl) {
          fetchJsonGalleryIfNeeded(prod, (id, images) => {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
          });
        }
      });
    } catch (err) {
      console.error('[AppContext] Failed to fetch products from PocketBase:', err);
      throw err;
    }
  };

  const loadRetailProducts = async () => {
    try {
      const records = await pb.collection('retail_products').getFullList({
        sort: '-created',
        requestKey: null
      });
      const mapped = records.map(mapRecord);
      setRetailProducts(mapped);

      // Fetch JSON galleries in the background for retail products
      mapped.forEach(prod => {
        if (prod._jsonUrl) {
          fetchJsonGalleryIfNeeded(prod, (id, images) => {
            setRetailProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
          });
        }
      });
    } catch (err) {
      console.error('[AppContext] Failed to fetch retail products from PocketBase:', err);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let pollIntervalId = null;

    const loadGlobalSettings = async () => {
      try {
        const records = await pb.collection('app_settings').getFullList();
        if (records && records.length > 0) {
          const raw = records[0].whatsapp_number;
          if (raw && raw.startsWith('[') && raw.endsWith(']')) {
            const parts = raw.slice(1, -1).split(',');
            setSettings(prev => ({
              ...prev,
              whatsappNumber: parts[0] || prev.whatsappNumber
            }));
          } else if (raw) {
            setSettings(prev => ({
              ...prev,
              whatsappNumber: raw
            }));
          }
        }

        // Fetch retail user credentials from retail_users collection in PocketBase
        const retailRecords = await pb.collection('retail_users').getFullList();
        if (retailRecords && retailRecords.length > 0) {
          const rRecord = retailRecords[0];
          setSettings(prev => ({
            ...prev,
            retailUserId: rRecord.username,
            retailPassword: rRecord.password
          }));
        }

        // Admin password is no longer stored in global settings for security.
        // It is fetched directly during login and password update.
      } catch (err) {
        console.warn('[AppContext] Failed to load settings from PB:', err);
      }
    };

    loadProducts();
    loadRetailProducts();
    loadGlobalSettings();

    const subscribeToProducts = async () => {
      try {
        await pb.collection('products').subscribe('*', (e) => {
          console.log('[AppContext] PocketBase real-time event:', e.action, e.record);
          if (!isMounted) return;
          if (e.action === 'create') {
            const newProd = mapRecord(e.record);
            setProducts(prev => {
              if (prev.some(p => p.id === newProd.id)) return prev;
              return [newProd, ...prev];
            });
            if (newProd._jsonUrl) {
              fetchJsonGalleryIfNeeded(newProd, (id, images) => {
                if (isMounted) {
                  setProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
                }
              });
            }
          } else if (e.action === 'update') {
            const updatedProd = mapRecord(e.record);
            setProducts(prev => prev.map(p => p.id === updatedProd.id ? updatedProd : p));
            if (updatedProd._jsonUrl) {
              fetchJsonGalleryIfNeeded(updatedProd, (id, images) => {
                if (isMounted) {
                  setProducts(prev => prev.map(p => p.id === id ? { ...p, images } : p));
                }
              });
            }
          } else if (e.action === 'delete') {
            setProducts(prev => prev.filter(p => p.id !== e.record.id));
          }
        });
        console.log('[AppContext] Successfully subscribed to PocketBase products collection.');
      } catch (err) {
        console.warn('[AppContext] PocketBase real-time subscription failed, relying on polling fallback:', err);
      }
    };

    subscribeToProducts();

    // Setup polling fallback every 3 seconds
    pollIntervalId = setInterval(() => {
      loadProducts();
      loadRetailProducts();
      loadGlobalSettings();
    }, 3000);

    return () => {
      isMounted = false;
      if (pollIntervalId) {
        clearInterval(pollIntervalId);
      }
      pb.collection('products').unsubscribe('*').catch(err => {
        // Ignore unsubscribe errors on cleanup
      });
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
        if (parsed.isAuthenticated) {
          return true;
        }
      } catch (e) {
        console.error("Admin auth parsing error:", e);
        localStorage.removeItem('lumiere_admin_auth_token');
      }
    }
    return false;
  });

  // Removed ensurePbAuth as we are relying on public API rules for guest access

  const loadUserData = async () => {
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
        // Will be caught by AdminDashboard if triggered there, but here we just log
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

  // Products are now fetched from PocketBase — no localStorage sync needed

  // Products and Users are fetched from PocketBase — no localStorage sync needed

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
        await pb.collection('User').update(user.pbId, { Full_Name: newName });
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
      const targetUserId = (settings.retailUserId || 'work001').trim();
      const targetPassword = (settings.retailPassword || 'naveenwork001').trim();

      if (trimmedId === targetUserId && trimmedPass === targetPassword) {
        const sessionObj = {
          userId: trimmedId,
          name: 'Retailer',
          mobile: '',
          isRetail: true
        };
        sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
        localStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
        setCurrentUser(sessionObj);
        return { success: true, isRetail: true };
      }

      // 1. Search in PocketBase User collection
      const records = await pb.collection('User').getFullList({
        filter: `User_ID = "${trimmedId}"`
      });

      if (records.length > 0) {
        const matchedUser = records[0];
        if (String(matchedUser.password).trim() === String(password).trim()) {
          const isSuspended = matchedUser.Full_Name && matchedUser.Full_Name.endsWith(' [SUSPENDED]');
          if (isSuspended) {
            return { success: false, message: "Your account is suspended. Please contact admin." };
          }
          
          const sessionObj = {
            userId: matchedUser.User_ID || matchedUser.id,
            name: matchedUser.Full_Name || 'Valued Customer',
            mobile: matchedUser.moblieno || matchedUser.mobileno || '',
            isRetail: false
          };
          sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          localStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          setCurrentUser(sessionObj);
          return { success: true, isRetail: false };
        } else {
          return { success: false, message: "Invalid username or password. Please contact admin." };
        }
      }

      // 2. Check if there's a pending registration request with matching name/mobile
      const pendingRegs = await pb.collection('registered_users').getFullList({
        filter: `status = "pending" && (user_name = "${userId.trim()}" || mobile_no = "${userId.trim()}")`
      });

      if (pendingRegs.length > 0) {
        return { success: false, message: "Your account is not approved yet. Please contact admin." };
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
    setCurrentUser(null);
    setCart([]);
  };

  const loginRetailUser = async (username, password) => {
    try {
      const records = await pb.collection('retail_users').getFullList({
        filter: `username = "${username.trim()}"`
      });

      if (records.length > 0) {
        const matchedUser = records[0];
        if (String(matchedUser.password).trim() === String(password).trim()) {
          if (!matchedUser.active) {
            return { success: false, message: "Your account is not active. Please contact admin." };
          }
          
          const sessionObj = {
            id: matchedUser.id,
            username: matchedUser.username
          };
          sessionStorage.setItem('lumiere_retail_user', JSON.stringify(sessionObj));
          localStorage.setItem('lumiere_retail_user', JSON.stringify(sessionObj));
          setCurrentRetailUser(sessionObj);
          return { success: true };
        }
      }
      return { success: false, message: "Invalid username or password." };
    } catch (err) {
      console.error('[AppContext] loginRetailUser error:', err);
      return { success: false, message: "Authentication failed. Please check connection." };
    }
  };

  const logoutRetailUser = () => {
    sessionStorage.removeItem('lumiere_retail_user');
    localStorage.removeItem('lumiere_retail_user');
    setCurrentRetailUser(null);
  };

  const checkCurrentUserStatus = async () => {
    if (!currentUser) return true;
    if (currentUser.isRetail) return true;
    try {
      const records = await pb.collection('User').getFullList({
        filter: `User_ID = "${currentUser.userId}"`
      });
      if (records.length > 0) {
        const matchedUser = records[0];
        const isSuspended = matchedUser.Full_Name && matchedUser.Full_Name.endsWith(' [SUSPENDED]');
        if (isSuspended) {
          logoutUser();
          alert('Your account is suspended. Please contact admin.');
          window.location.hash = '/login';
          return false;
        }
      } else {
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
      const adminPassRecords = await pb.collection('admin_password').getFullList();
      if (adminPassRecords && adminPassRecords.length > 0) {
        const record = adminPassRecords[0];
        if (record.username === username && record.password === password) {
          const token = {
            isAuthenticated: true,
            authUsername: username,
            authPassword: password
          };
          localStorage.setItem('lumiere_admin_auth_token', JSON.stringify(token));
          setIsAdminAuthenticated(true);
          return true;
        }
      }
    } catch (err) {
      console.error("Failed to fetch admin password from PocketBase:", err);
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
      refreshProducts: () => Promise.all([loadProducts(), loadRetailProducts()]),
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
      updateSettings
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
