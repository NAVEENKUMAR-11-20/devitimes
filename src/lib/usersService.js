import pb from './pocketbase';

// Map PocketBase user record → app user shape
function mapUser(record) {
  return {
    id: record.id,
    pbId: record.id,
    userId: record.User_ID || record.id,
    name: record.Full_Name || '',
    mobile: record.moblieno || record.mobileno || '',
    password: record.password || '',
    status: 'active',
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

/** Fetch all users from PocketBase */
export async function fetchAllUsers() {
  try {
    const records = await pb.collection('User').getFullList({ sort: '-created' });
    return records.map(mapUser);
  } catch (err) {
    console.error('[PB] fetchAllUsers error:', err);
    return [];
  }
}

/** Fetch all pending registrations from PocketBase */
export async function fetchPendingRegistrations() {
  try {
    const records = await pb.collection('registered_users').getFullList({
      filter: 'status = "pending"',
      sort: '-created'
    });
    return records.map(mapRegistration);
  } catch (err) {
    console.error('[PB] fetchPendingRegistrations error:', err);
    return [];
  }
}

/** Create a new registration */
export async function createRegistration(name, mobile) {
  const record = await pb.collection('registered_users').create({
    user_name: name,
    mobile_no: mobile,
    status: 'pending'
  });
  return mapRegistration(record);
}

/** Delete a registration */
export async function deleteRegistration(id) {
  await pb.collection('registered_users').delete(id);
}

/** Update registration status */
export async function updateRegistrationStatus(id, status) {
  await pb.collection('registered_users').update(id, { status });
}

/** Create a new user */
export async function createUser(data) {
  const record = await pb.collection('User').create({
    User_ID:   data.userId || '',
    Full_Name: data.name || '',
    moblieno:  data.mobile || '',
    password:  data.password || '',
  });
  return mapUser(record);
}

/** Delete a user by PB id */
export async function deleteUser(pbId) {
  await pb.collection('User').delete(pbId);
}
