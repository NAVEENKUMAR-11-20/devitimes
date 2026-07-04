

async function test() {
  const email = 'teamdenvex@gmail.com';
  const password = '7418956115';

  try {
    const res = await fetch('https://api.devitimes.in/api/collections/_superusers/auth-with-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: email, password })
    });
    const data = await res.json();
    if (data.token) {
      console.log('Got token');
      const prodRes = await fetch('https://api.devitimes.in/api/collections/PRODUCT_DATAS', {
        headers: { 'Authorization': data.token }
      });
      const prodData = await prodRes.json();
      console.log('PRODUCT_DATAS rules:');
      console.log('listRule:', prodData.listRule);
      console.log('viewRule:', prodData.viewRule);
      console.log('createRule:', prodData.createRule);
      console.log('updateRule:', prodData.updateRule);
      console.log('deleteRule:', prodData.deleteRule);
    }
  } catch (e) {
    console.error(e);
  }
}
test();
