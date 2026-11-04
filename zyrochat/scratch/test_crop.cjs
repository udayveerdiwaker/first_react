const fs = require('fs');
const sharp = require('../backend/node_modules/sharp');

async function testCrop() {
  const prompt = encodeURIComponent('athletic person in gym fitness workout');
  const targetW = 512;
  const targetH = 512;
  const extraBottom = 48; // Extra padding for the watermark to land on
  const requestH = targetH + extraBottom;

  const url = `https://image.pollinations.ai/prompt/${prompt}?width=${targetW}&height=${requestH}&seed=200&nologo=true`;
  console.log('Fetching:', url);
  const res = await fetch(url);
  const rawBuf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync('scratch/uncropped.jpg', rawBuf);

  // Now crop exactly targetW x targetH from top-left (0,0)
  const cleanBuf = await sharp(rawBuf)
    .extract({ left: 0, top: 0, width: targetW, height: targetH })
    .jpeg({ quality: 95 })
    .toBuffer();

  fs.writeFileSync('scratch/cropped_clean.jpg', cleanBuf);
  console.log('Successfully saved scratch/cropped_clean.jpg');
}

testCrop().catch(console.error);
