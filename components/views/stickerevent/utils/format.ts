import { Product, InventoryItem } from './types';

/**
 * Shared cached Intl.NumberFormat instance for VND currency formatting.
 * Creating this once instead of per-call avoids ~10x CPU overhead.
 */
const currencyFormatter = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export const formatCurrency = (value: number): string => currencyFormatter.format(value);
