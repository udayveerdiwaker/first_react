const fs = require('fs');

async function test() {
  const prompt = encodeURIComponent('a beautiful red apple on a wooden table');
  
  // Test 1: standard
  const url1 = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=42&nologo=true&nofeed=true&private=true`;
  console.log('Fetching URL 1:', url1);
  const res1 = await fetch(url1);
  const buf1 = Buffer.from(await res1.arrayBuffer());
  fs.writeFileSync('scratch/test1.jpg', buf1);
  console.log('Saved test1.jpg, size:', buf1.length);
}

test().catch(console.error);
