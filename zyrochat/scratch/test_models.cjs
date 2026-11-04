const fs = require('fs');

async function testModels() {
  const prompt = encodeURIComponent('red sports car on asphalt road');
  const models = ['flux', 'turbo', 'flux-realism', 'flux-anime', 'flux-3d'];
  
  for (const model of models) {
    try {
      const url = `https://image.pollinations.ai/prompt/${prompt}?width=512&height=512&seed=100&nologo=true&model=${model}`;
      console.log(`Testing model: ${model}`);
      const res = await fetch(url);
      if (res.ok) {
        const buf = Buffer.from(await res.arrayBuffer());
        fs.writeFileSync(`scratch/test_${model}.jpg`, buf);
        console.log(`Saved test_${model}.jpg (${buf.length} bytes)`);
      } else {
        console.log(`Model ${model} returned:`, res.status);
      }
    } catch (e) {
      console.log(`Error testing ${model}:`, e.message);
    }
  }
}

testModels().catch(console.error);
