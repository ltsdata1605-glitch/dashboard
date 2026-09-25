// Sinh video Y4M chứa mã vạch EAN-13 thật, để Chromium dùng làm "camera giả"
// (--use-file-for-fake-video-capture). Không cần ffmpeg: Y4M là định dạng thô.
const fs = require('fs');

const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const PARITY = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

function ean13Checksum(d12) {
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += Number(d12[i]) * (i % 2 === 0 ? 1 : 3);
  return (10 - (sum % 10)) % 10;
}

/** Trả chuỗi 95 module '0'/'1' của mã EAN-13 */
function ean13Modules(digits12) {
  const check = ean13Checksum(digits12);
  const full = digits12 + String(check);
  const parity = PARITY[Number(full[0])];
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    const d = Number(full[i]);
    bits += parity[i - 1] === 'L' ? L[d] : G[d];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[Number(full[i])];
  bits += '101';
  return { bits, full };
}

/** Vẽ mã vạch vào khung ảnh xám (Uint8Array luma), nền trắng, vạch đen */
function renderFrame(width, height, bits, moduleW, barHeight) {
  const y = new Uint8Array(width * height).fill(235); // nền trắng
  const totalW = bits.length * moduleW;
  const x0 = Math.floor((width - totalW) / 2);
  const y0 = Math.floor((height - barHeight) / 2);
  for (let m = 0; m < bits.length; m++) {
    if (bits[m] !== '1') continue;
    for (let dx = 0; dx < moduleW; dx++) {
      const px = x0 + m * moduleW + dx;
      if (px < 0 || px >= width) continue;
      for (let py = y0; py < y0 + barHeight && py < height; py++) y[py * width + px] = 16; // vạch đen
    }
  }
  return y;
}

function writeY4M(path, width, height, frames, luma) {
  const hdr = Buffer.from(`YUV4MPEG2 W${width} H${height} F30:1 Ip A1:1 C420\n`, 'ascii');
  const frameHdr = Buffer.from('FRAME\n', 'ascii');
  const uv = Buffer.alloc((width / 2) * (height / 2), 128); // ảnh xám -> U=V=128
  const parts = [hdr];
  for (let i = 0; i < frames; i++) parts.push(frameHdr, Buffer.from(luma), uv, uv);
  fs.writeFileSync(path, Buffer.concat(parts));
}

const [, , outPath, digits12, moduleWArg] = process.argv;
const W = 640, H = 480;
const { bits, full } = ean13Modules(digits12 || '200123400001');
const moduleW = Number(moduleWArg || 4);
const luma = renderFrame(W, H, bits, moduleW, 260);
writeY4M(outPath, W, H, 60, luma);
console.log(`Đã tạo ${outPath} — mã EAN-13 đầy đủ: ${full} (rộng ${bits.length * moduleW}px trên khung ${W}x${H})`);
