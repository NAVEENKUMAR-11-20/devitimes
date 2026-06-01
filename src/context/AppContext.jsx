import React, { createContext, useContext, useState, useEffect } from 'react';

const AppContext = createContext();

// Sample Seed Products
const seedProducts = [
  {
    id: "prod_001",
    name: "Obsidian Classic",
    category: "Modern Minimalist",
    modelNumber: "1221",
    size: "300 × 300 MM",
    color: "Black",
    salePrice: 89,
    originalPrice: 120,
    isOnSale: true,
    stockCount: 30,
    isLive: true,
    description: "Clean lines and minimalist design. Features a quiet sweeping hand mechanism and a sleek matte finish, making it the perfect focal point for any modern workspace or living room.",
    images: [], // Handled dynamically (or SVG fallback)
    createdAt: new Date().toISOString(),
    source: "manual"
  },
  {
    id: "prod_002",
    name: "Silver Frost Elite",
    category: "Contemporary",
    modelNumber: "1231",
    size: "300 × 300 MM",
    color: "Black & Silver",
    salePrice: 110,
    originalPrice: 150,
    isOnSale: true,
    stockCount: 20,
    isLive: true,
    description: "Contemporary design with brushed aluminum finish. An elegant addition to any boardroom, dining area, or master bedroom, pairing industrial durability with subtle luxury.",
    images: [],
    createdAt: new Date().toISOString(),
    source: "manual"
  },
  {
    id: "prod_003",
    name: "Emerald Vintage",
    category: "Luxury Vintage",
    modelNumber: "1241",
    size: "300 × 300 MM",
    color: "Navy Blue",
    salePrice: 149,
    originalPrice: 200,
    isOnSale: true,
    stockCount: 15,
    isLive: true,
    description: "Vintage-inspired elegance featuring rich gold accents. Brings classic old-world charm to your study or fireplace mantel, meticulously styled to resemble a heritage timepiece.",
    images: [],
    createdAt: new Date().toISOString(),
    source: "manual"
  },
  {
    id: "prod_004",
    name: "Stealth Matrix",
    category: "Modern Minimalist",
    modelNumber: "1271",
    size: "300 × 300 MM",
    color: "Navy & Gold",
    salePrice: 129,
    originalPrice: 180,
    isOnSale: true,
    stockCount: 10,
    isLive: true,
    description: "Premium modern timepiece with minimalist matrix hour markers. Bold, stark, and expressive, this clock elevates any feature wall with its contrast-heavy styling.",
    images: [],
    createdAt: new Date().toISOString(),
    source: "manual"
  }
];

// Default admin settings
const defaultSettings = {
  whatsappNumber: "7358349394",
  storeName: "DEVI TIMES",
  currency: "₹",
  websiteUrl: "http://localhost:5173", // default local dev url
  adminPassword: "lumiere@admin2024"
};

export const AppProvider = ({ children }) => {
  // State Initialization from LocalStorage
  const [products, setProducts] = useState(() => {
    const saved = localStorage.getItem('lumiere_products');
    return saved ? JSON.parse(saved) : seedProducts;
  });

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
    return saved ? JSON.parse(saved) : defaultSettings;
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

  // Sync state modifications to LocalStorage
  useEffect(() => {
    localStorage.setItem('lumiere_products', JSON.stringify(products));
  }, [products]);

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
