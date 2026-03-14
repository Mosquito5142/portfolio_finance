async function testEMA200() {
  const url = 'http://localhost:3000/api/ema200?symbol=AAPL&strict=true';
  console.log('Testing EMA 200 API:', url);
  try {
    const res = await fetch(url);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

testEMA200();
