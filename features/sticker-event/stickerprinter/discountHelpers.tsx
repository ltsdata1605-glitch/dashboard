import React from 'react';

export const renderAmountDiscount = (oldPriceStr: string, newPriceStr: string) => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));

    if (oldVal <= 0 || newVal <= 0) return null;

    if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
        newVal = newVal * 1000;
    }

    const diff = oldVal - newVal;
    if (diff <= 0) return null;

    let num = '';
    let unit = '';
    if (diff < 1000000) {
        num = (diff / 1000).toString();
        unit = 'K';
    } else {
        const trVal = diff / 1000000;
        num = Number(trVal.toFixed(1)).toString();
        unit = 'triệu';
    }

    return (
        <span className="discount-amount font-bold">
            <span className="discount-label">-</span>
            <span className="discount-num">{num}</span>
            <span className={`discount-unit ${unit === 'triệu' ? 'unit-trieu' : 'unit-k'}`}>{unit}</span>
        </span>
    );
};

export const renderPercentDiscount = (oldPriceStr: string, newPriceStr: string) => {
    const oldVal = Number(oldPriceStr.replace(/\D/g, ''));
    let newVal = Number(newPriceStr.replace(/\D/g, ''));

    if (oldVal <= 0 || newVal <= 0) return null;

    if (newVal * 1000 <= oldVal * 1.5 && newVal < oldVal) {
        newVal = newVal * 1000;
    }

    const ratio = Math.round((newVal / oldVal - 1) * 100);
    if (ratio < 0) {
        return `${ratio}%`;
    }
    return '';
};
