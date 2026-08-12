// Barrel re-export — giữ nguyên đường dẫn import cho 13+ file đang dùng `services/uiService`.
// Nội dung thật đã tách theo trách nhiệm vào services/uiExport/: blob (tải/chia sẻ file),
// imageExport (html-to-image, phần lớn nhất ~900 dòng), colorUtils (xử lý màu oklch cho canvas).
export * from './uiExport/blobUtils';
export * from './uiExport/imageExport';
export * from './uiExport/colorUtils';
