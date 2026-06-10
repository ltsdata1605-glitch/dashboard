/**
 * Safety Guard for Telegram Agent Command Execution
 * Blocks dangerous inputs to prevent accidental data loss or security bypass.
 */

const DANGEROUS_PATTERNS = [
  /rm\s+-rf/i,                       // Chặn xóa đệ quy rm -rf
  /rm\s+-[a-zA-Z]*r[a-zA-Z]*f/i,     // Chặn các biến thể của rm -rf (vd: rm -fr, rm -r -f)
  /git\s+reset\s+--hard/i,           // Chặn reset mất code
  /git\s+push/i,                     // Chặn đẩy code trực tiếp
  /deploy/i,                         // Chặn deploy tự động ngoài tầm kiểm soát
  /\.env/i,                          // Chặn đọc/ghi hoặc thao tác file cấu hình .env
  /rm\s+.*\.db/i,                    // Chặn xóa cơ sở dữ liệu .db
  /rm\s+.*\.sqlite/i,                // Chặn xóa cơ sở dữ liệu .sqlite
  /rm\s+.*\.json/i,                  // Chặn xóa file cấu hình .json
  /gcloud\s+projects\s+delete/i,     // Chặn xóa GCP project
  /firebase\s+projects:delete/i      // Chặn xóa Firebase project
];

/**
 * Kiểm tra xem một chuỗi câu lệnh hoặc tham số đầu vào có an toàn hay không.
 * @param {string} input 
 * @returns {boolean}
 */
function isSafeInput(input) {
  if (!input || typeof input !== 'string') return false;
  
  const normalized = input.trim();
  
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(normalized)) {
      return false;
    }
  }
  
  return true;
}

module.exports = {
  isSafeInput
};
