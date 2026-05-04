/**
 * Transforms raw coupon text into a structured format.
 * 
 * @param rawText The raw text input containing coupon lines.
 * @param titleText The optional title to prepend.
 * @returns The formatted string.
 */
export const transformCouponText = (rawText: string, titleText: string): string => {
  const upperCaseTitle = titleText.trim().toUpperCase();
  const titleSection = upperCaseTitle ? `${upperCaseTitle}\n\n` : '';

  const lines = rawText.trim().split('\n').filter(line => line.trim() !== '');
  
  // If no content lines, just return the title
  if (lines.length === 0) {
      return titleSection.trim();
  }

  // Find the split point between header info and coupon list
  // Looking for the line containing "dùng cho" (used for)
  const firstCouponIndex = lines.findIndex(line => line.toLowerCase().includes('dùng cho'));

  // If no coupon pattern found, return text as is with title
  if (firstCouponIndex === -1) {
      return `${titleSection}${lines.join('\n')}`;
  }

  const headerLines = lines.slice(0, firstCouponIndex);
  const couponLines = lines.slice(firstCouponIndex);

  const productCoupons: Record<string, string[]> = {};
  // Regex to capture Product Name and Coupon Code
  // Expects format: "... dùng cho [Product]: [Code]"
  const regex = /dùng cho (.*?): (.*)/i;

  for (const line of couponLines) {
      const match = line.match(regex);
      if (match) {
          const productName = match[1].trim();
          const couponCode = match[2].trim();
          
          if (!productCoupons[productName]) {
              productCoupons[productName] = [];
          }
          productCoupons[productName].push(couponCode);
      }
  }

  let formattedProducts = '';
  for (const productName in productCoupons) {
      formattedProducts += `\n\n❖ ${productName}:`;
      const coupons = productCoupons[productName];
      for (const coupon of coupons) {
          formattedProducts += `\n    ▶ ${coupon}`;
      }
  }
  
  const headerText = headerLines.join('\n');
  
  // Combine all parts
  return `${titleSection}${headerText}${formattedProducts}`;
};