const parseNumber = (str) => {
    if (!str) return 0;
    const cleaned = String(str).replace(/,/g, '').replace('%', '').trim();
    return parseFloat(cleaned) || 0;
};
console.log(parseNumber("1,000,000"));
console.log(parseNumber("1.000.000"));
console.log(parseNumber("1 000 000"));
