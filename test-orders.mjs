async function test() {
  const res = await fetch('https://api.devitimes.in/api/collections/orders/records');
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

test().catch(console.error);
