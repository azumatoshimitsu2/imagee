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
const frameWidth = Number(args.frameWidth ?? 64);
const frameHeight = Number(args.frameHeight ?? 64);
const columns = Number(args.columns ?? 4);
const rows = Number(args.rows ?? 4);
const alphaThreshold = Number(args.alphaThreshold ?? 20);
const footY = Number(args.footY ?? 59);
const centerX = Number(args.centerX ?? 32);
const maxBodyWidth = Number(args.maxBodyWidth ?? 44);
const maxBodyHeight = Number(args.maxBodyHeight ?? 58);
const minComponentPixels = Number(args.minComponentPixels ?? 90);

if (!input || !output) {
  console.error("Usage: node normalize-spritesheet.mjs --input=src.png --output=dest.png");
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
      const bitDepth = data[8];
      const colorType = data[9];
      const interlace = data[12];
      if (bitDepth !== 8 || colorType !== 6 || interlace !== 0) {
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
    const tempPath = path.join(os.tmpdir(), `normalized-spritesheet-${process.pid}.png`);
    const result = spawnSync("magick", [filePath, "PNG32:" + tempPath], { encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`${error.message}\nImageMagick fallback failed: ${result.stderr || result.stdout}`);
    }
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

function transparentImage(width, height) {
  return { width, height, pixels: new Uint8Array(width * height * 4) };
}

function getPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return image.pixels.subarray(offset, offset + 4);
}

function setPixel(image, x, y, rgba) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return;
  const offset = (y * image.width + x) * 4;
  image.pixels[offset] = rgba[0];
  image.pixels[offset + 1] = rgba[1];
  image.pixels[offset + 2] = rgba[2];
  image.pixels[offset + 3] = rgba[3];
}

function copyPixel(src, sx, sy, dest, dx, dy) {
  if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) return;
  setPixel(dest, dx, dy, getPixel(src, sx, sy));
}

function bbox(image) {
  let left = image.width;
  let right = -1;
  let top = image.height;
  let bottom = -1;
  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      if (getPixel(image, x, y)[3] <= alphaThreshold) continue;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
  return right === -1 ? null : { left, right, top, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function cropFrame(sheet, col, row) {
  const frame = transparentImage(frameWidth, frameHeight);
  const x0 = col * frameWidth;
  const y0 = row * frameHeight;
  for (let y = 0; y < frameHeight; y += 1) {
    for (let x = 0; x < frameWidth; x += 1) copyPixel(sheet, x0 + x, y0 + y, frame, x, y);
  }
  return frame;
}

function removeLooseFragments(image) {
  const visited = new Uint8Array(image.width * image.height);
  const components = [];

  for (let startY = 0; startY < image.height; startY += 1) {
    for (let startX = 0; startX < image.width; startX += 1) {
      const startIndex = startY * image.width + startX;
      if (visited[startIndex] || getPixel(image, startX, startY)[3] <= alphaThreshold) continue;

      const queue = [[startX, startY]];
      const pixels = [];
      visited[startIndex] = 1;

      for (let i = 0; i < queue.length; i += 1) {
        const [x, y] = queue[i];
        pixels.push([x, y]);
        for (const [nx, ny] of [
          [x + 1, y],
          [x - 1, y],
          [x, y + 1],
          [x, y - 1],
          [x + 1, y + 1],
          [x - 1, y - 1],
          [x + 1, y - 1],
          [x - 1, y + 1],
        ]) {
          if (nx < 0 || ny < 0 || nx >= image.width || ny >= image.height) continue;
          const index = ny * image.width + nx;
          if (visited[index] || getPixel(image, nx, ny)[3] <= alphaThreshold) continue;
          visited[index] = 1;
          queue.push([nx, ny]);
        }
      }
      components.push(pixels);
    }
  }

  if (components.length <= 1) return { image, removed: 0 };

  const main = components.reduce((largest, component) => (component.length > largest.length ? component : largest), components[0]);
  const cleaned = transparentImage(image.width, image.height);
  let removed = 0;

  components.forEach((component) => {
    const keep = component === main || component.length >= minComponentPixels;
    if (!keep) {
      removed += component.length;
      return;
    }
    component.forEach(([x, y]) => copyPixel(image, x, y, cleaned, x, y));
  });

  return { image: cleaned, removed };
}

function blitScaled(src, box, dest, x0, y0, scale) {
  const width = Math.max(1, Math.round(box.width * scale));
  const height = Math.max(1, Math.round(box.height * scale));
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const sx = box.left + Math.min(box.width - 1, Math.floor(x / scale));
      const sy = box.top + Math.min(box.height - 1, Math.floor(y / scale));
      setPixel(dest, x0 + x, y0 + y, getPixel(src, sx, sy));
    }
  }
  return { width, height };
}

const sheet = readPngWithFallback(input);
if (sheet.width !== frameWidth * columns || sheet.height !== frameHeight * rows) {
  throw new Error(`Expected ${frameWidth * columns}x${frameHeight * rows}, got ${sheet.width}x${sheet.height}`);
}

const normalized = transparentImage(sheet.width, sheet.height);
const reports = [];

  for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < columns; col += 1) {
    const { image: frame, removed } = removeLooseFragments(cropFrame(sheet, col, row));
    const box = bbox(frame);
    if (!box) continue;
    const scale = Math.min(1, maxBodyWidth / box.width, maxBodyHeight / box.height);
    const scaledWidth = Math.max(1, Math.round(box.width * scale));
    const scaledHeight = Math.max(1, Math.round(box.height * scale));
    const x = Math.round(centerX - scaledWidth / 2);
    const y = Math.round(footY - scaledHeight + 1);
    const normalizedFrame = transparentImage(frameWidth, frameHeight);
    blitScaled(frame, box, normalizedFrame, x, y, scale);

    for (let py = 0; py < frameHeight; py += 1) {
      for (let px = 0; px < frameWidth; px += 1) {
        copyPixel(normalizedFrame, px, py, normalized, col * frameWidth + px, row * frameHeight + py);
      }
    }
    reports.push(`${row},${col}: ${box.width}x${box.height} -> ${scaledWidth}x${scaledHeight} at ${x},${y}; removed ${removed}px`);
  }
}

writePng(output, normalized);
console.log(reports.join("\n"));
