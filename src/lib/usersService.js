import pb from './pocketbase';

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
    const records = await pb.collection('User').getFullList({ sort: '-created' });
    return records.map(mapUser);
  } catch (err) {
    console.error('[PB] fetchAllUsers error:', err);
    throw err;
  }
}

export async function fetchPendingRegistrations() {
  try {
    const records = await pb.collection('registered_users').getFullList({
      filter: 'status = "pending"',
      sort: '-created'
    });
    return records.map(mapRegistration);
  } catch (err) {
    console.error('[PB] fetchPendingRegistrations error:', err);
    throw err;
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

/** Resolve or create registered_users record ID for a user */
export async function getOrCreateRegistrationId(currentUser) {
  if (!currentUser) return '';
  const cleanName = String(currentUser.name || '').trim();
  const cleanMobile = String(currentUser.mobile || '').trim();

  // 1. Try to find approved registration record
  try {
    let filterStr = '';
    if (cleanName && cleanMobile) {
      filterStr = `status = "approved" && (user_name = "${cleanName}" || mobile_no = "${cleanMobile}")`;
    } else if (cleanName) {
      filterStr = `status = "approved" && user_name = "${cleanName}"`;
    } else if (cleanMobile) {
      filterStr = `status = "approved" && mobile_no = "${cleanMobile}"`;
    }

    if (filterStr) {
      const records = await pb.collection('registered_users').getFullList({ filter: filterStr });
      if (records.length > 0) {
        return records[0].id;
      }
    }
  } catch (err) {
    console.error('[PB] getOrCreateRegistrationId approved fetch error:', err);
  }

  // 2. Try to find any registration record matching name or mobile
  try {
    let filterStr = '';
    if (cleanName && cleanMobile) {
      filterStr = `user_name = "${cleanName}" || mobile_no = "${cleanMobile}"`;
    } else if (cleanName) {
      filterStr = `user_name = "${cleanName}"`;
    } else if (cleanMobile) {
      filterStr = `mobile_no = "${cleanMobile}"`;
    }

    if (filterStr) {
      const records = await pb.collection('registered_users').getFullList({ filter: filterStr });
      if (records.length > 0) {
        const reg = records[0];
        if (reg.status !== 'approved') {
          await pb.collection('registered_users').update(reg.id, { status: 'approved' });
        }
        return reg.id;
      }
    }
  } catch (err) {
    console.error('[PB] getOrCreateRegistrationId any fetch error:', err);
  }

  // 3. Create on the fly if not found
  try {
    if (cleanName || cleanMobile) {
      const record = await pb.collection('registered_users').create({
        user_name: cleanName || 'Wholesale User',
        mobile_no: cleanMobile || '',
        status: 'approved'
      });
      return record.id;
    }
  } catch (err) {
    console.error('[PB] getOrCreateRegistrationId create error:', err);
  }
  return '';
}

