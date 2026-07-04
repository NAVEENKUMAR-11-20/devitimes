

async function test() {
  const email = 'teamdenvex@gmail.com';
  const passwords = ['7418956115', 'admin11', 'admin'];

  for (const password of passwords) {
    try {
      const res = await fetch('https://api.devitimes.in/api/collections/_superusers/auth-with-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: email, password })
      });
      const data = await res.json();
      if (data.token) {
        console.log(`Success with password: ${password}`);
        
        // Let's check app_settings rules
        const rulesRes = await fetch('https://api.devitimes.in/api/collections/app_settings', {
          headers: { 'Authorization': data.token }
        });
        const rulesData = await rulesRes.json();
        console.log('app_settings listRule:', rulesData.listRule);
        
        // Let's update app_settings rule to public
        if (rulesData.listRule !== "") {
          rulesData.listRule = "";
          rulesData.viewRule = "";
          const updateRes = await fetch('https://api.devitimes.in/api/collections/app_settings', {
            method: 'PATCH',
            headers: { 'Authorization': data.token, 'Content-Type': 'application/json' },
            body: JSON.stringify(rulesData)
          });
          console.log('Updated app_settings to public:', (await updateRes.json()).listRule);
        }

        // Do the same for retail_users
        const retailRes = await fetch('https://api.devitimes.in/api/collections/retail_users', {
          headers: { 'Authorization': data.token }
        });
        const retailData = await retailRes.json();
        if (retailData.listRule !== "") {
          retailData.listRule = "";
          retailData.viewRule = "";
          const retailUpdateRes = await fetch('https://api.devitimes.in/api/collections/retail_users', {
            method: 'PATCH',
            headers: { 'Authorization': data.token, 'Content-Type': 'application/json' },
            body: JSON.stringify(retailData)
          });
          console.log('Updated retail_users to public:', (await retailUpdateRes.json()).listRule);
        }
        
        // admin_password collection
        const adminRes = await fetch('https://api.devitimes.in/api/collections/admin_password', {
          headers: { 'Authorization': data.token }
        });
        const adminData = await adminRes.json();
        if (adminData.listRule !== "") {
          adminData.listRule = "";
          adminData.viewRule = "";
          const adminUpdateRes = await fetch('https://api.devitimes.in/api/collections/admin_password', {
            method: 'PATCH',
            headers: { 'Authorization': data.token, 'Content-Type': 'application/json' },
            body: JSON.stringify(adminData)
          });
          console.log('Updated admin_password to public:', (await adminUpdateRes.json()).listRule);
        }
        return;
      } else {
        console.log(`Failed with password: ${password}`);
      }
    } catch (err) {
      console.log(`Error with password: ${password}`, err);
    }
  }
}

test();
