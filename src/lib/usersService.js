import pb from './pocketbase';

// Map PocketBase user record → app user shape
function mapUser(record) {
  return {
    id: record.id,
    pbId: record.id,
    userId: record.User_ID || record.id,
    name: record.Full_Name || '',
    mobile: record.mobileno || '',
    password: record.password || '',
    status: 'active',
    createdAt: record.created,
  };
}

/** Fetch all users from PocketBase */
export async function fetchAllUsers() {
  try {
    const records = await pb.collection('user').getFullList({ sort: '-created' });
    return records.map(mapUser);
  } catch (err) {
    console.error('[PB] fetchAllUsers error:', err);
    return [];
  }
}

/** Create a new user */
export async function createUser(data) {
  const record = await pb.collection('user').create({
    User_ID:   data.userId || '',
    Full_Name: data.name || '',
    mobileno:  data.mobile || '',
    password:  data.password || '',
  });
  return mapUser(record);
}

/** Delete a user by PB id */
export async function deleteUser(pbId) {
  await pb.collection('user').delete(pbId);
}
