import sharp from 'sharp';

const sizes = [192, 512];

for (const size of sizes) {
  const fontSize = Math.round(size * 0.55);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#16a34a"/>
  <text
    x="50%"
    y="50%"
    dominant-baseline="central"
    text-anchor="middle"
    font-family="Arial, Helvetica, sans-serif"
    font-size="${fontSize}"
    font-weight="bold"
    fill="white"
  >M</text>
</svg>`;

  await sharp(Buffer.from(svg))
    .png()
    .toFile(`public/icon-${size}.png`);

  console.log(`✓ public/icon-${size}.png を生成しました`);
}
