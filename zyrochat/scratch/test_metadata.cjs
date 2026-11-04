const fs = require('fs');
const sharp = require('../backend/node_modules/sharp');

async function testCropWithMetadata() {
  const file = 'scratch/uncropped.jpg';
  const rawBuf = fs.readFileSync(file);
  const meta = await sharp(rawBuf).metadata();
  console.log('Uncropped metadata:', meta.width, 'x', meta.height);

  const cleanBuf = await sharp(rawBuf)
    .extract({
      left: 0,
      top: 0,
      width: meta.width,
      height: meta.height - 48
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  const cleanMeta = await sharp(cleanBuf).metadata();
  console.log('Clean metadata:', cleanMeta.width, 'x', cleanMeta.height);
}

testCropWithMetadata().catch(console.error);
