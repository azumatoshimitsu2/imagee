import fs from "node:fs";
import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const input = process.argv[2];
const output = process.argv[3];
const frameWidth = 64;
const frameHeight = 64;
const columns = 4;
const rows = 4;
const alphaThreshold = 20;

if (!input || !output) {
  console.error("Usage: node make-feet-only-walk.mjs input.png output.png");
  process.exit(1);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function readPng(filePath) {
  const file = fs.readFileSync(filePath);
  if (!file.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("Not a PNG file");
  let offset = 8;
  let width = 0;
  let height = 0;
  const idat = [];

  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.subarray(offset + 4, offset + 8).toString("ascii");
    const data = file.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) throw new Error("Unsupported PNG format");
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const stride = width * 4;
  const pixels = new Uint8Array(width * height * 4);
  let src = 0;
  let prev = new Uint8Array(stride);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[src++];
    const row = inflated.subarray(src, src + stride);
    src += stride;
    const out = pixels.subarray(y * stride, (y + 1) * stride);
    for (let x = 0; x < stride; x += 1) {
      const left = x >= 4 ? out[x - 4] : 0;
      const up = prev[x] ?? 0;
      const upLeft = x >= 4 ? prev[x - 4] : 0;
      let value = row[x];
      if (filter === 1) value = (value + left) & 0xff;
      else if (filter === 2) value = (value + up) & 0xff;
      else if (filter === 3) value = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) value = (value + paeth(left, up, upLeft)) & 0xff;
      else if (filter !== 0) throw new Error(`Unsupported PNG filter: ${filter}`);
      out[x] = value;
    }
    prev = out.slice();
  }

  return { width, height, pixels };
}

function writePng(filePath, image) {
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(image.pixels.buffer, image.pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  const chunks = [
    chunk("IHDR", ihdr(image.width, image.height)),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ];
  fs.writeFileSync(filePath, Buffer.concat([PNG_SIGNATURE, ...chunks]));
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  return data;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function offset(image, x, y) {
  return (y * image.width + x) * 4;
}

function getPixel(image, x, y) {
  const i = offset(image, x, y);
  return [image.pixels[i], image.pixels[i + 1], image.pixels[i + 2], image.pixels[i + 3]];
}

function setPixel(image, x, y, rgba) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const i = offset(image, x, y);
  image.pixels[i] = rgba[0];
  image.pixels[i + 1] = rgba[1];
  image.pixels[i + 2] = rgba[2];
  image.pixels[i + 3] = rgba[3];
}

function clearPixel(image, x, y) {
  setPixel(image, x, y, [0, 0, 0, 0]);
}

function isVisible(image, x, y) {
  const [r, g, b, a] = getPixel(image, x, y);
  return a > alphaThreshold && !(r === 0 && g === 0 && b === 0);
}

function footBounds(row) {
  if (row === 0) return { left: 15, right: 48, top: 54, bottom: 61 };
  if (row === 3) return { left: 16, right: 48, top: 55, bottom: 62 };
  if (row === 1) return { left: 8, right: 55, top: 55, bottom: 61 };
  return { left: 8, right: 56, top: 55, bottom: 61 };
}

function copyFrame(source, target, sourceCol, sourceRow, targetCol, targetRow) {
  const sx0 = sourceCol * frameWidth;
  const sy0 = sourceRow * frameHeight;
  const tx0 = targetCol * frameWidth;
  const ty0 = targetRow * frameHeight;
  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) setPixel(target, tx0 + x, ty0 + y, getPixel(source, sx0 + x, sy0 + y));
  }
}

function replaceFeet(source, target, sourceCol, row, targetCol) {
  const bounds = footBounds(row);
  const sx0 = sourceCol * frameWidth;
  const tx0 = targetCol * frameWidth;
  const y0 = row * frameHeight;

  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) clearPixel(target, tx0 + x, y0 + y);
  }

  for (let y = bounds.top; y <= bounds.bottom; y += 1) {
    for (let x = bounds.left; x <= bounds.right; x += 1) {
      const sx = sx0 + x;
      const sy = y0 + y;
      if (!isVisible(source, sx, sy)) continue;
      setPixel(target, tx0 + x, sy, getPixel(source, sx, sy));
    }
  }
}

const source = readPng(input);
if (source.width !== columns * frameWidth || source.height !== rows * frameHeight) {
  throw new Error(`Expected ${columns * frameWidth}x${rows * frameHeight}, got ${source.width}x${source.height}`);
}

const result = { width: source.width, height: source.height, pixels: new Uint8Array(source.pixels.length) };

for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < columns; col += 1) copyFrame(source, result, 0, row, col, row);
  replaceFeet(source, result, 1, row, 1);
  replaceFeet(source, result, 3, row, 3);
}

writePng(output, result);
