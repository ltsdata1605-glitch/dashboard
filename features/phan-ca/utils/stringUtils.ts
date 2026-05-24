/**
 * Rút gọn tên đầy đủ của người Việt thành dạng "Ký tự đệm.Tên".
 * Ví dụ: "Nguyễn Vũ Minh" -> "V.Minh"
 * Ví dụ: "Lê Thị Bích Thủy" -> "B.Thủy"
 * @param fullName - Tên đầy đủ cần rút gọn.
 * @returns Tên đã được rút gọn.
 */
export const abbreviateVietnameseName = (fullName: string): string => {
  if (!fullName || typeof fullName !== 'string') return '';
  
  const parts = fullName.trim().split(/\s+/);
  
  // Nếu tên chỉ có 1 hoặc 2 từ, trả về ký tự đầu.Tên
  if (parts.length < 2) {
    return fullName;
  }
  if (parts.length === 2) {
    const initial = parts[0].charAt(0).toUpperCase();
    const name = parts[1];
    return `${initial}.${name}`;
  }

  // Nếu tên có nhiều hơn 2 từ, lấy ký tự đầu của từ ngay trước tên chính
  const lastName = parts[parts.length - 1];
  const middleInitial = parts[parts.length - 2].charAt(0).toUpperCase();
  
  return `${middleInitial}.${lastName}`;
};
