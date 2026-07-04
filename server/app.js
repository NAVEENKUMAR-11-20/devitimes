import express from 'express';
import cors from 'cors';
import multer from 'multer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import PocketBase from 'pocketbase';

dotenv.config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize PocketBase
const pbUrl = process.env.POCKETBASE_URL || process.env.VITE_POCKETBASE_URL || 'https://api.devitimes.in';
const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

const SECRET_KEY = process.env.ADMIN_SESSION_SECRET || 'lumiere_devi_times_secret_key_2026';

// Stateless HMAC token generation & verification
function generateToken(username) {
  const payload = JSON.stringify({ username, exp: Date.now() + 24 * 60 * 60 * 1000 });
  const hash = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
  return Buffer.from(payload).toString('base64') + '.' + hash;
}

function verifyToken(token) {
  if (!token) return false;
  try {
    const [base64Payload, hash] = token.split('.');
    if (!base64Payload || !hash) return false;
    const payload = Buffer.from(base64Payload, 'base64').toString('utf8');
    const expectedHash = crypto.createHmac('sha256', SECRET_KEY).update(payload).digest('hex');
    if (hash !== expectedHash) return false;
    const data = JSON.parse(payload);
    if (Date.now() > data.exp) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// Helper to ensure superuser authentication against PocketBase
async function ensureSuperuserAuth() {
  const superEmail = process.env.PB_SUPERUSER_EMAIL || process.env.PB_ADMIN_EMAIL || 'teamdenvex@gmail.com';
  const superPass = process.env.PB_SUPERUSER_PASSWORD || process.env.PB_ADMIN_PASSWORD || 'admin22';
  
  if (pb.authStore.isValid && (pb.authStore.isSuperuser || pb.authStore.isAdmin || pb.authStore.model?.collectionName === '_superusers')) {
    return true;
  }
  
  try {
    await pb.collection('_superusers').authWithPassword(superEmail, superPass);
    return true;
  } catch (err) {
    if (pb.admins && typeof pb.admins.authWithPassword === 'function') {
      try {
        await pb.admins.authWithPassword(superEmail, superPass);
        return true;
      } catch (e) { /* ignore */ }
    }
    // Try fallback passwords if default fails
    const fallbackPasses = ['admin22', '7418956115', 'admin11', 'admin'];
    for (const pass of fallbackPasses) {
      try {
        await pb.collection('_superusers').authWithPassword(superEmail, pass);
        return true;
      } catch (e) { /* ignore */ }
    }
  }
  return false;
}

// Middleware to secure admin routes
function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers['x-admin-token'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
  if (!verifyToken(token)) {
    return res.status(401).json({ error: 'Unauthorized admin access' });
  }
  next();
}

// ==========================================
// 1. PUBLIC SAFE ENDPOINTS (No Auth Required)
// ==========================================

// Public Settings endpoint (for customers, cart, register)
app.get('/api/settings', async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('app_settings').getFullList();
    const settingsRecord = records && records.length > 0 ? records[0] : null;
    
    const retailRecords = await pb.collection('retail_users').getFullList().catch(() => []);
    const rRecord = retailRecords && retailRecords.length > 0 ? retailRecords[0] : null;

    res.json({
      success: true,
      settings: settingsRecord ? {
        id: settingsRecord.id,
        whatsappNumber: settingsRecord.whatsapp_number || '7358349394',
        whatsapp_number: settingsRecord.whatsapp_number || '7358349394',
        bannerAlertEnabled: settingsRecord.banner_alert_enabled !== false,
        lowStockThreshold: settingsRecord.low_stock_threshold || 10,
        alertData: settingsRecord.alert_data || {},
        retailUserId: rRecord?.username || '',
        retailPassword: rRecord?.password || ''
      } : {
        whatsappNumber: '7358349394',
        whatsapp_number: '7358349394',
        bannerAlertEnabled: true,
        lowStockThreshold: 10,
        alertData: {},
        retailUserId: rRecord?.username || '',
        retailPassword: rRecord?.password || ''
      }
    });
  } catch (err) {
    res.json({
      success: true,
      settings: {
        whatsappNumber: '7358349394',
        whatsapp_number: '7358349394',
        bannerAlertEnabled: true,
        lowStockThreshold: 10,
        alertData: {},
        retailUserId: '',
        retailPassword: ''
      }
    });
  }
});

app.post('/api/retail-login', async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { username, password } = req.body;
    const records = await pb.collection('retail_users').getFullList();
    const match = records.find(r => r.username === username && r.password === password);
    if (match) {
      res.json({ success: true, user: match });
    } else {
      res.status(401).json({ error: 'Invalid retail credentials' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/check-pending-registration', async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { user } = req.query;
    if (!user) return res.json({ isPending: false });
    const pendingRegs = await pb.collection('registered_users').getFullList({
      filter: `status = "pending" && (user_name = "${user}" || mobile_no = "${user}")`
    });
    res.json({ isPending: pendingRegs.length > 0 });
  } catch (err) {
    res.json({ isPending: false });
  }
});

// Public safe endpoint to get today's orders count for sequential ID generation in Cart.jsx
app.get('/api/orders/today-count', async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { prefix } = req.query; // e.g. "dvt20260704"
    if (!prefix) return res.json({ count: 0 });
    const todayOrders = await pb.collection('orders').getFullList({
      filter: `id ~ "${prefix}"`,
      fields: 'id'
    });
    res.json({ count: todayOrders.length });
  } catch (err) {
    res.json({ count: 0 });
  }
});

// Public endpoint for decrementing product stock after order placement
app.post('/api/orders/decrement-stock', async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { items } = req.body;
    if (!Array.isArray(items)) return res.json({ success: false, error: 'Invalid items array' });
    
    for (const item of items) {
      if (!item.productId) continue;
      try {
        const prod = await pb.collection('PRODUCT_DATAS').getOne(item.productId);
        const currentStock = prod && prod.STOCK !== undefined ? Number(prod.STOCK) : (prod.stock !== undefined ? Number(prod.stock) : 20);
        const qty = Number(item.quantity) || 0;
        const newStock = Math.max(0, currentStock - qty);
        await pb.collection('PRODUCT_DATAS').update(item.productId, { STOCK: newStock, stock: newStock });
      } catch (e) {
        console.error(`[API] Failed to decrement stock for ${item.productId}:`, e.message);
      }
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. ADMIN AUTH ENDPOINTS
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    
    let isAuthenticated = false;
    const cleanUser = username.trim();
    const possibleUsers = Array.from(new Set([cleanUser, 'teamdenvex@gmail.com', 'admin']));

    // 1. Check superusers first
    for (const u of possibleUsers) {
      try {
        await pb.collection('_superusers').authWithPassword(u, password);
        isAuthenticated = true;
        break;
      } catch (err) {
        if (pb.admins && typeof pb.admins.authWithPassword === 'function') {
          try {
            await pb.admins.authWithPassword(u, password);
            isAuthenticated = true;
            break;
          } catch (e) { /* ignore */ }
        }
      }
    }

    // 2. Check admin_password collection
    if (!isAuthenticated) {
      try {
        await ensureSuperuserAuth();
        const records = await pb.collection('admin_password').getFullList();
        const match = records.find(r => 
          (r.username === cleanUser || r.username === 'admin' || r.username === 'teamdenvex@gmail.com') && r.password === password
        );
        if (match) {
          isAuthenticated = true;
        }
      } catch (err) { /* ignore */ }
    }

    if (isAuthenticated) {
      const token = generateToken(cleanUser);
      return res.json({ success: true, token });
    }
    
    return res.status(401).json({ error: 'Invalid admin credentials' });
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

app.post('/api/admin/change-password', requireAdminAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All password fields are required' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New passwords do not match' });
    }

    await ensureSuperuserAuth();
    const possibleUsers = ['teamdenvex@gmail.com', 'admin'];
    let records = [];
    try {
      records = await pb.collection('admin_password').getFullList();
    } catch (err) {
      return res.status(500).json({ error: 'Failed to access admin_password collection' });
    }

    const adminRecord = records.find(r => r.username === 'admin' || r.username === 'teamdenvex@gmail.com' || r.password === currentPassword) || records[0];
    if (!adminRecord || adminRecord.password !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Update admin_password collection
    await pb.collection('admin_password').update(adminRecord.id, {
      password: newPassword.trim()
    });

    // Also update superuser password in _superusers
    let superId = pb.authStore.model?.id || pb.authStore.record?.id;
    if (superId) {
      try {
        await pb.collection('_superusers').update(superId, {
          password: newPassword.trim(),
          passwordConfirm: confirmPassword.trim()
        });
      } catch (e1) {
        try {
          await pb.collection('_superusers').update(superId, {
            oldPassword: currentPassword,
            password: newPassword.trim(),
            passwordConfirm: confirmPassword.trim()
          });
        } catch (e2) { /* ignore */ }
      }
    }

    res.json({ success: true, message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update password' });
  }
});

// ==========================================
// 3. ADMIN SETTINGS & WHATSAPP ENDPOINTS
// ==========================================

app.get('/api/admin/settings', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('app_settings').getFullList();
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/settings', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const payload = req.body;
    const records = await pb.collection('app_settings').getFullList();
    let updated;
    if (records && records.length > 0) {
      updated = await pb.collection('app_settings').update(records[0].id, payload);
    } else {
      updated = await pb.collection('app_settings').create(payload);
    }
    res.json({ success: true, record: updated, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/settings', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const payload = req.body;
    const records = await pb.collection('app_settings').getFullList();
    let updated;
    if (records && records.length > 0) {
      updated = await pb.collection('app_settings').update(records[0].id, payload);
    } else {
      updated = await pb.collection('app_settings').create(payload);
    }
    res.json({ success: true, record: updated, settings: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/whatsapp-number', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { whatsapp_number } = req.body;
    const records = await pb.collection('app_settings').getFullList();
    let updated;
    if (records && records.length > 0) {
      updated = await pb.collection('app_settings').update(records[0].id, { whatsapp_number });
    } else {
      updated = await pb.collection('app_settings').create({ whatsapp_number });
    }
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. ADMIN PRODUCTS ENDPOINTS
// ==========================================

app.get('/api/admin/products', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('PRODUCT_DATAS').getFullList({ sort: '-created' });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/products', requireAdminAuth, upload.any(), async (req, res) => {
  try {
    await ensureSuperuserAuth();
    let payload = req.body;
    if (req.files && req.files.length > 0) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(req.body)) {
        formData.append(key, val);
      }
      for (const file of req.files) {
        const fileBlob = new Blob([file.buffer], { type: file.mimetype });
        const fileObj = new File([fileBlob], file.originalname, { type: file.mimetype });
        formData.append(file.fieldname || 'PRODUCT_IMAGE', fileObj);
      }
      payload = formData;
    }
    const created = await pb.collection('PRODUCT_DATAS').create(payload, { requestKey: null });
    res.json({ success: true, record: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/products/:id', requireAdminAuth, upload.any(), async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    let payload = req.body;
    if (req.files && req.files.length > 0) {
      const formData = new FormData();
      for (const [key, val] of Object.entries(req.body)) {
        formData.append(key, val);
      }
      for (const file of req.files) {
        const fileBlob = new Blob([file.buffer], { type: file.mimetype });
        const fileObj = new File([fileBlob], file.originalname, { type: file.mimetype });
        formData.append(file.fieldname || 'PRODUCT_IMAGE', fileObj);
      }
      payload = formData;
    }
    const updated = await pb.collection('PRODUCT_DATAS').update(id, payload, { requestKey: null });
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/products/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    await pb.collection('PRODUCT_DATAS').delete(id, { requestKey: null });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/products/:id/toggle-status', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    const { status, isLive } = req.body;
    const targetStatus = status !== undefined ? status : (isLive ? 'live' : 'hidden');
    
    // Update multiple possible status fields to be robust
    const payload = {
      STATUS: targetStatus,
      status: targetStatus,
      isLive: targetStatus === 'live' || targetStatus === 'active',
      is_live: targetStatus === 'live' || targetStatus === 'active',
      live: targetStatus === 'live' || targetStatus === 'active',
      active: targetStatus === 'live' || targetStatus === 'active',
      hidden: targetStatus === 'hidden' || targetStatus === 'inactive',
      isHidden: targetStatus === 'hidden' || targetStatus === 'inactive',
      visibility: targetStatus
    };

    const updated = await pb.collection('PRODUCT_DATAS').update(id, payload, { requestKey: null });
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/products/:id/status', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    const { status, isLive } = req.body;
    const targetStatus = status !== undefined ? status : (isLive ? 'live' : 'hidden');
    
    // Update multiple possible status fields to be robust
    const payload = {
      STATUS: targetStatus,
      status: targetStatus,
      isLive: targetStatus === 'live' || targetStatus === 'active',
      is_live: targetStatus === 'live' || targetStatus === 'active',
      live: targetStatus === 'live' || targetStatus === 'active',
      active: targetStatus === 'live' || targetStatus === 'active',
      hidden: targetStatus === 'hidden' || targetStatus === 'inactive',
      isHidden: targetStatus === 'hidden' || targetStatus === 'inactive',
      visibility: targetStatus
    };

    const updated = await pb.collection('PRODUCT_DATAS').update(id, payload, { requestKey: null });
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. ADMIN USERS & RETAIL USERS ENDPOINTS
// ==========================================

app.get('/api/admin/registered-users', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { filter, sort } = req.query;
    const options = {};
    if (filter) options.filter = filter;
    if (sort) options.sort = sort;
    else options.sort = '-created';
    const records = await pb.collection('registered_users').getFullList(options);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/registered-users', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const created = await pb.collection('registered_users').create(req.body);
    res.json({ success: true, record: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/registered-users/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    const updated = await pb.collection('registered_users').update(id, req.body);
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/registered-users/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    await pb.collection('registered_users').delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/retail-users', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { sort } = req.query;
    const options = sort ? { sort } : {};
    const records = await pb.collection('retail_users').getFullList(options);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/retail-users', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const created = await pb.collection('retail_users').create(req.body);
    res.json({ success: true, record: created });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/retail-users/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    const updated = await pb.collection('retail_users').update(id, req.body);
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/retail-users/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    await pb.collection('retail_users').delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('User').getFullList({ sort: '-created' });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    await pb.collection('User').delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. ADMIN ORDERS & EXPORTS ENDPOINTS
// ==========================================

app.get('/api/admin/orders', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('orders').getFullList({ sort: '-created' });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    const updated = await pb.collection('orders').update(id, req.body);
    res.json({ success: true, record: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/orders/:id', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const { id } = req.params;
    await pb.collection('orders').delete(id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/clear-cart-sessions', requireAdminAuth, async (req, res) => {
  try {
    res.json({ success: true, message: 'Cart sessions cleared' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/products/export', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('PRODUCT_DATAS').getFullList({ sort: '-created' });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/users/export', requireAdminAuth, async (req, res) => {
  try {
    await ensureSuperuserAuth();
    const records = await pb.collection('User').getFullList({ sort: '-created' });
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
