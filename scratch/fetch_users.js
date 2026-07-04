(async () => {
  try {
    const pbUrl = process.env.VITE_POCKETBASE_URL || 'https://api.devitimes.in';
    const url = `${pbUrl}/api/collections/User/records`;
    console.log('Fetching:', url);
    const res = await fetch(url);
    const data = await res.json();
    console.log('Response Status:', res.status);
    console.log('Response Data:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error:', err);
  }
})();
