import pb from '../src/lib/pocketbase.js';

async function testCreate() {
  try {
    console.log('Testing create on retail_users with common mobile fields...');
    const record = await pb.collection('retail_users').create({
      username: 'testretail_' + Math.random().toString(36).substring(7),
      password: 'password123',
      name: 'Test Retail User',
      active: true,
      mobile: '9876543210',
      moblieno: '9876543210',
      mobile_no: '9876543210'
    });
    console.log('Success!', record);
    // Cleanup if success
    await pb.collection('retail_users').delete(record.id);
  } catch (err) {
    console.error('Error creating record:', err.data || err);
  }
}

testCreate();
