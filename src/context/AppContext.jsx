import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchAllProducts } from '../lib/productsService';

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

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('lumiere_users');
    return saved ? JSON.parse(saved) : [];
  });

  const [pendingRegistrations, setPendingRegistrations] = useState(() => {
    const saved = localStorage.getItem('lumiere_registrations');
    return saved ? JSON.parse(saved) : [];
  });

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

  // User Session (sessionStorage)
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = sessionStorage.getItem('lumiere_current_user');
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

  useEffect(() => {
    localStorage.setItem('lumiere_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('lumiere_registrations', JSON.stringify(pendingRegistrations));
  }, [pendingRegistrations]);

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
  const registerUser = (name, mobile) => {
    const newReg = {
      id: `reg_${Date.now()}`,
      name,
      mobile,
      registeredAt: new Date().toISOString(),
      status: "pending"
    };
    setPendingRegistrations(prev => [newReg, ...prev]);
    return newReg;
  };

  const approveRegistration = (regId, customUserId, password) => {
    const reg = pendingRegistrations.find(r => r.id === regId);
    if (!reg) return null;

    const newUser = {
      userId: customUserId,
      name: reg.name,
      mobile: reg.mobile,
      password: password,
      status: "active",
      createdAt: new Date().toISOString()
    };

    setUsers(prev => [newUser, ...prev]);
    setPendingRegistrations(prev => prev.filter(r => r.id !== regId));
    return newUser;
  };

  const deleteRegistrationRequest = (regId) => {
    setPendingRegistrations(prev => prev.filter(r => r.id !== regId));
  };

  const createUser = (user) => {
    const newUser = {
      ...user,
      createdAt: new Date().toISOString()
    };
    setUsers(prev => [newUser, ...prev]);
  };

  const updateUserStatus = (userId, status) => {
    setUsers(prev => prev.map(u => u.userId === userId ? { ...u, status } : u));
  };

  const deleteUser = (userId) => {
    setUsers(prev => prev.filter(u => u.userId !== userId));
  };

  // --- User Authentication Actions ---
  const loginUser = (userId, password) => {
    const matchedUser = users.find(u => u.userId.toLowerCase() === userId.toLowerCase() && u.password === password);
    if (!matchedUser) {
      return { success: false, message: "Invalid User ID or Password. Please check your credentials." };
    }
    if (matchedUser.status !== 'active') {
      return { success: false, message: "Your account is suspended. Contact admin." };
    }

    const sessionObj = {
      userId: matchedUser.userId,
      name: matchedUser.name,
      mobile: matchedUser.mobile
    };
    sessionStorage.setItem('lumiere_current_user', JSON.stringify(sessionObj));
    setCurrentUser(sessionObj);
    return { success: true };
  };

  const logoutUser = () => {
    sessionStorage.removeItem('lumiere_current_user');
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
