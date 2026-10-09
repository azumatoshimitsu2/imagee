import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import zlib from "node:zlib";
import { spawnSync } from "node:child_process";

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const args = Object.fromEntries(
  process.argv.slice(2).map((arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    return [key, value ?? true];
  }),
);

const input = args.input;
const reference = args.reference;
const output = args.output;
const frameWidth = Number(args.frameWidth ?? 64);
const frameHeight = Number(args.frameHeight ?? 64);
const columns = Number(args.columns ?? 4);
const upRow = Number(args.upRow ?? 3);
const patchHeight = Number(args.patchHeight ?? 34);
const referenceScale = Number(args.referenceScale ?? 1);
const patchShiftX = Number(args.patchShiftX ?? 0);
const patchShiftY = Number(args.patchShiftY ?? 0);
const clearBaseHair = args.clearBaseHair === "true";

if (!input || !reference || !output) {
  console.error("Usage: node patch-up-hair-from-reference.mjs --input=base.png --reference=ref.png --output=dest.png");
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
    } else if (type === "IEND") break;
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

function readPngWithFallback(filePath) {
  try {
    return readPng(filePath);
  } catch {
    const tempPath = path.join(os.tmpdir(), `hair-patch-${process.pid}-${path.basename(filePath)}.png`);
    const result = spawnSync("magick", [filePath, "PNG32:" + tempPath], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr || result.stdout);
    try {
      return readPng(tempPath);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }
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

function isHairPixel(r, g, b, a) {
  if (a < 40) return false;
  const warmBrown = r >= 55 && r > g * 1.12 && g >= 18 && g <= 185 && b <= 115;
  const darkOutline = r >= 18 && r <= 95 && g <= 55 && b <= 40;
  return warmBrown || darkOutline;
}

const base = readPngWithFallback(input);
const ref = readPngWithFallback(reference);
if (base.width !== ref.width || base.height !== ref.height) throw new Error("Input and reference sizes must match");

let patched = 0;
for (let col = 0; col < columns; col += 1) {
  const x0 = col * frameWidth;
  const y0 = upRow * frameHeight;

  if (clearBaseHair) {
    for (let y = 0; y < patchHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const i = offset(base, x0 + x, y0 + y);
        const [r, g, b, a] = base.pixels.subarray(i, i + 4);
        if (!isHairPixel(r, g, b, a)) continue;
        base.pixels[i] = 0;
        base.pixels[i + 1] = 0;
        base.pixels[i + 2] = 0;
        base.pixels[i + 3] = 0;
      }
    }
  }

  if (referenceScale !== 1) {
    const hairPixels = [];
    let left = frameWidth;
    let right = -1;
    let top = patchHeight;
    let bottom = -1;
    for (let y = 0; y < patchHeight; y += 1) {
      for (let x = 0; x < frameWidth; x += 1) {
        const i = offset(ref, x0 + x, y0 + y);
        const [r, g, b, a] = ref.pixels.subarray(i, i + 4);
        if (!isHairPixel(r, g, b, a)) continue;
        hairPixels.push({ x, y, rgba: [r, g, b, a] });
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }

    if (right === -1) continue;
    const srcWidth = right - left + 1;
    const srcHeight = bottom - top + 1;
    const destWidth = Math.max(1, Math.round(srcWidth * referenceScale));
    const destHeight = Math.max(1, Math.round(srcHeight * referenceScale));
    const destLeft = Math.round(frameWidth / 2 - destWidth / 2 + patchShiftX);
    const destTop = Math.round(top + (srcHeight - destHeight) / 2 + patchShiftY);

    hairPixels.forEach(({ x, y, rgba }) => {
      const dx = x0 + destLeft + Math.floor(((x - left) / srcWidth) * destWidth);
      const dy = y0 + destTop + Math.floor(((y - top) / srcHeight) * destHeight);
      if (dx < x0 || dx >= x0 + frameWidth || dy < y0 || dy >= y0 + patchHeight) return;
      const i = offset(base, dx, dy);
      base.pixels[i] = rgba[0];
      base.pixels[i + 1] = rgba[1];
      base.pixels[i + 2] = rgba[2];
      base.pixels[i + 3] = rgba[3];
      patched += 1;
    });
    continue;
  }

  for (let y = 0; y < patchHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) {
      const i = offset(ref, x0 + x, y0 + y);
      const [r, g, b, a] = ref.pixels.subarray(i, i + 4);
      if (!isHairPixel(r, g, b, a)) continue;
      base.pixels[i] = r;
      base.pixels[i + 1] = g;
      base.pixels[i + 2] = b;
      base.pixels[i + 3] = a;
      patched += 1;
    }
  }
}

writePng(output, base);
console.log(`patched ${patched} hair pixels`);
