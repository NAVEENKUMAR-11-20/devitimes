import { apiGet, apiPost, apiPut, apiDelete } from './apiClient';

// Map PocketBase user record → app user shape
function mapUser(record) {
  const isSuspended = record.Full_Name && record.Full_Name.endsWith(' [SUSPENDED]');
  const cleanName = isSuspended ? record.Full_Name.replace(' [SUSPENDED]', '') : (record.Full_Name || '');
  return {
    id: record.id,
    pbId: record.id,
    userId: record.User_ID || record.id,
    name: cleanName,
    mobile: record.moblieno || record.mobileno || '',
    password: record.password || '',
    status: isSuspended ? 'suspended' : 'active',
    createdAt: record.created,
  };
}

// Map PocketBase registration record → app registration shape
function mapRegistration(record) {
  return {
    id: record.id,
    name: record.user_name || '',
    mobile: record.mobile_no || '',
    status: record.status || 'pending',
    registeredAt: record.created,
  };
}

export async function fetchAllUsers() {
  try {
    const res = await apiGet('/api/admin/users');
    const records = res?.records || [];
    return records.map(mapUser);
  } catch (err) {
    console.error('[API] fetchAllUsers error:', err);
    throw err;
  }
}

export async function fetchPendingRegistrations() {
  try {
    const res = await apiGet('/api/admin/registered-users?filter=status%3D%22pending%22');
    const records = res?.records || [];
    return records.map(mapRegistration);
  } catch (err) {
    console.error('[API] fetchPendingRegistrations error:', err);
    throw err;
  }
}

/** Create a new registration */
export async function createRegistration(name, mobile) {
  const data = await apiPost('/api/admin/registered-users', {
    user_name: name,
    mobile_no: mobile,
    status: 'pending'
  });
  return mapRegistration(data.record);
}

/** Delete a registration */
export async function deleteRegistration(id) {
  await apiDelete(`/api/admin/registered-users/${id}`);
}

/** Update registration status */
export async function updateRegistrationStatus(id, status) {
  await apiPut(`/api/admin/registered-users/${id}`, { status });
}

/** Create a new user */
export async function createUser(data) {
  const res = await apiPost('/api/admin/users', {
    User_ID:   data.userId || '',
    Full_Name: data.name || '',
    moblieno:  data.mobile || '',
    password:  data.password || '',
  });
  return mapUser(res.record);
}

/** Delete a user by PB id */
export async function deleteUser(pbId) {
  await apiDelete(`/api/admin/users/${pbId}`);
}

/** Resolve or create registered_users record ID for a user */
export async function getOrCreateRegistrationId(currentUser) {
  if (!currentUser) return '';
  const cleanName = String(currentUser.name || '').trim();
  const cleanMobile = String(currentUser.mobile || '').trim();

  try {
    const res = await apiPost('/api/get-or-create-registration', { name: cleanName, mobile: cleanMobile });
    return res.id || '';
  } catch (err) {
    console.error('[API] getOrCreateRegistrationId error:', err);
    return '';
  }
}

/** Formats a 15-char PocketBase order ID to DVT-YYYYMMDD-XXXX format if it matches the pattern */
export function formatOrderId(id) {
  if (id && id.toLowerCase().startsWith('dvt') && id.length === 15) {
    const clean = id.toUpperCase();
    return `DVT-${clean.substring(3, 11)}-${clean.substring(11)}`;
  }
  return id;
}


