import React from 'react';
import { normalizeStickerPriceUnit, formatPriceChangePercent, formatDiscountAmount } from '../utils/format';

export const renderAmountDiscount = (oldPriceStr: string, newPriceStr: string) => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));

    if (oldVal <= 0 || newVal <= 0) return null;

    newVal = normalizeStickerPriceUnit(oldVal, newVal);

    const result = formatDiscountAmount(oldVal, newVal);
    if (!result) return null;
    const { num, unit } = result;

    return (
        <span className="discount-amount font-bold">
            <span className="discount-label">-</span>
            <span className="discount-num">{num}</span>
            <span className={`discount-unit ${unit === 'triệu' ? 'unit-trieu' : 'unit-k'}`}>{unit}</span>
        </span>
    );
};

export const renderPercentDiscount = (oldPriceStr: string, newPriceStr: string) =>
    formatPriceChangePercent(oldPriceStr, newPriceStr);
