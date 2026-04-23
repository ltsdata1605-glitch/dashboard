/**
 * Chart animation flag — bật trên desktop, tắt trên mobile để tiết kiệm pin.
 * Chỉ check 1 lần khi module load (static), vì animation chỉ chạy on mount.
 */
export const CHART_ANIMATION_ENABLED = typeof window !== 'undefined' && window.innerWidth >= 1024;
