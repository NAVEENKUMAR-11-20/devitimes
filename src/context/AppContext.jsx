import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAllProducts } from '../lib/productsService';
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
  adminPassword: "lumiere@admin2024"
};

export const AppProvider = ({ children }) => {
  // Products — fetched from PocketBase on mount (no more localStorage/seedProducts)
  const [products, setProducts] = useState([]);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const pbProducts = await fetchAllProducts();
        console.log('[AppContext] Loaded products from PocketBase:', pbProducts.length);
        setProducts(pbProducts);
      } catch (err) {
        console.error('[AppContext] Failed to fetch products from PocketBase:', err);
        setProducts([]);
      }
    };
    loadProducts();
  }, []);

  const [users, setUsers] = useState([]);
  const [pendingRegistrations, setPendingRegistrations] = useState([]);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const pbUsers = await fetchAllUsers();
        setUsers(pbUsers);
        const pbRegs = await fetchPendingRegistrations();
        setPendingRegistrations(pbRegs);
      } catch (err) {
        console.error('[AppContext] Failed to load user data from PocketBase:', err);
      }
    };
    loadUserData();
  }, []);

  const [settings, setSettings] = useState(() => {
    const saved = localStorage.getItem('lumiere_settings');
    let parsedSettings = saved ? JSON.parse(saved) : defaultSettings;
    
    // Auto-update the cached dummy number to the new requested number
    if (parsedSettings.whatsappNumber === "+919999999999") {
      parsedSettings.whatsappNumber = "7358349394";
      localStorage.setItem('lumiere_settings', JSON.stringify(parsedSettings));
    }
    
    return parsedSettings;
  });

  // User Session (sessionStorage and localStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    const savedSession = sessionStorage.getItem('lumiere_current_user');
    const savedLocal = localStorage.getItem('lumiere_current_user');
    const saved = savedSession || savedLocal;
    return saved ? JSON.parse(saved) : null;
  });

  // Admin Session (sessionStorage)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    const saved = sessionStorage.getItem('lumiere_admin_auth');
    return saved === 'true';
  });

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

  const updateUserStatus = (userId, status) => {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status } : u));
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
      // 1. Search in PocketBase User collection
      const records = await pb.collection('User').getFullList({
        filter: `User_ID = "${userId.trim()}"`
      });

      if (records.length > 0) {
        const matchedUser = records[0];
        if (String(matchedUser.password).trim() === String(password).trim()) {
          const userStatus = matchedUser.status || 'active';
          if (userStatus !== 'active') {
            return { success: false, message: "Your account is suspended. Contact admin." };
          }
          
          const sessionObj = {
            userId: matchedUser.User_ID || matchedUser.id,
            name: matchedUser.Full_Name || 'Valued Customer',
            mobile: matchedUser.moblieno || matchedUser.mobileno || ''
          };
          sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          localStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
          setCurrentUser(sessionObj);
          return { success: true };
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

  // --- Cart Actions ---
  const addToCart = (product, qty = 1) => {
    const existingIndex = cart.findIndex(item => item.productId === product.id);
    let newCart = [...cart];

    if (existingIndex > -1) {
      const newQty = newCart[existingIndex].quantity + qty;
      const finalQty = Math.min(newQty, product.stockCount);
      newCart[existingIndex].quantity = finalQty;
    } else {
      const finalQty = Math.min(qty, product.stockCount);
      newCart.push({
        productId: product.id,
        productName: product.name,
        modelNumber: product.modelNumber,
        category: product.category,
        size: product.size,
        color: product.color,
        unitPrice: product.salePrice,
        quantity: finalQty,
        image: product.images && product.images.length > 0 ? product.images[0] : null
      });
    }
    saveCartForUser(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCartForUser(newCart);
  };

  const updateCartQuantity = (productId, quantity, maxStock) => {
    const finalQty = Math.max(1, Math.min(quantity, maxStock));
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

  // --- Admin Configuration Actions ---
  const loginAdmin = (username, password) => {
    if (username === 'admin' && password === settings.adminPassword) {
      sessionStorage.setItem('lumiere_admin_auth', 'true');
      setIsAdminAuthenticated(true);
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('lumiere_admin_auth');
    setIsAdminAuthenticated(false);
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
      users,
      pendingRegistrations,
      settings,
      currentUser,
      isAdminAuthenticated,
      cart,
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
