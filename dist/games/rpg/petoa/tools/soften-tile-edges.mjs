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
const output = args.output;
const tileSize = Number(args.tileSize ?? 32);
const edgeDepth = Number(args.edgeDepth ?? 1);
const frames = parseFrames(String(args.frames ?? ""));

if (!input || !output || frames.size === 0) {
  console.error("Usage: node soften-tile-edges.mjs --input=src.png --output=dest.png --frames=0,1,6,8-23 --edgeDepth=2");
  process.exit(1);
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function parseFrames(value) {
  const result = new Set();
  for (const part of value.split(",")) {
    if (!part) continue;
    if (part.includes("-")) {
      const [start, end] = part.split("-").map(Number);
      for (let frame = start; frame <= end; frame += 1) result.add(frame);
    } else {
      result.add(Number(part));
    }
  }
  return result;
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
      if (data[8] !== 8 || data[9] !== 6 || data[12] !== 0) {
        throw new Error("Only non-interlaced 8-bit RGBA PNG files are supported");
      }
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
    const filter = inflated[src];
    src += 1;
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
  } catch (error) {
    const tempPath = path.join(os.tmpdir(), `soften-tile-edges-${process.pid}.png`);
    const result = spawnSync("magick", [filePath, "PNG32:" + tempPath], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(`${error.message}\nImageMagick fallback failed: ${result.stderr || result.stdout}`);
    try {
      return readPng(tempPath);
    } finally {
      fs.rmSync(tempPath, { force: true });
    }
  }
}

function writePng(filePath, image) {
  const stride = image.width * 4;
  const raw = Buffer.alloc((stride + 1) * image.height);
  for (let y = 0; y < image.height; y += 1) {
    raw[y * (stride + 1)] = 0;
    Buffer.from(image.pixels.buffer, image.pixels.byteOffset + y * stride, stride).copy(raw, y * (stride + 1) + 1);
  }

  fs.writeFileSync(
    filePath,
    Buffer.concat([
      PNG_SIGNATURE,
      chunk("IHDR", ihdr(image.width, image.height)),
      chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

function ihdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
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

function copyPixel(image, sx, sy, dx, dy) {
  const src = (sy * image.width + sx) * 4;
  const dest = (dy * image.width + dx) * 4;
  image.pixels[dest] = image.pixels[src];
  image.pixels[dest + 1] = image.pixels[src + 1];
  image.pixels[dest + 2] = image.pixels[src + 2];
  image.pixels[dest + 3] = image.pixels[src + 3];
}

function softenFrame(image, frame) {
  const columns = image.width / tileSize;
  const x0 = (frame % columns) * tileSize;
  const y0 = Math.floor(frame / columns) * tileSize;
  const last = tileSize - 1;

  for (let depth = 0; depth < edgeDepth; depth += 1) {
    for (let x = 0; x < tileSize; x += 1) {
      copyPixel(image, x0 + x, y0 + edgeDepth, x0 + x, y0 + depth);
      copyPixel(image, x0 + x, y0 + last - edgeDepth, x0 + x, y0 + last - depth);
    }
    for (let y = 0; y < tileSize; y += 1) {
      copyPixel(image, x0 + edgeDepth, y0 + y, x0 + depth, y0 + y);
      copyPixel(image, x0 + last - edgeDepth, y0 + y, x0 + last - depth, y0 + y);
    }
  }
}

const image = readPngWithFallback(input);
if (image.width % tileSize !== 0 || image.height % tileSize !== 0) {
  throw new Error(`Image size ${image.width}x${image.height} is not divisible by tile size ${tileSize}`);
}

for (const frame of frames) softenFrame(image, frame);
writePng(output, image);
console.log(`Wrote ${output}`);
