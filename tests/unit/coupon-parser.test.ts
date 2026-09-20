import { describe, it, expect } from 'vitest';
import {
    looksLikeCouponForm,
    parseCouponForm,
    parsePmhBlocks,
    isBlockBelongToUser,
    parsePastedCouponList,
    formatSyntaxListMessage,
    formatInventoryReportMessage,
    isHelpCommand,
    formatHelpGuideMessage,
    parseCancelCouponCommand,
    matchesProductSearch
} from '../../features/line-bot/services/couponParser';

describe('couponParser', () => {
    it('detects coupon form correctly', () => {
        expect(looksLikeCouponForm('Kho 910 xin mã PMH đơn hàng 12345678')).toBe(true);
        expect(looksLikeCouponForm('Xin chào buổi sáng')).toBe(false);
    });

    it('parses structured coupon form correctly', () => {
        const formText = `[ĐĂNG KÝ PMH]
Kho: 910
MĐH: 88291029
Loại: 100k
Quản lý: Lê Trường Sơn`;

        const res = parseCouponForm(formText);
        expect(res.isValid).toBe(true);
        expect(res.warehouse).toBe('910');
        expect(res.orderId).toBe('88291029');
        expect(res.couponType).toBe('PMH 100K');
        expect(res.managerName).toBe('Lê Trường Sơn');
    });

    it('parses "FORM MẪU LẤY PMH" without warehouse correctly', () => {
        const formText = `📝 FORM MẪU LẤY PMH 
Loại PMH: Bếp gas đôi Sunhouse SHB3105MD
MĐH Áp dụng: 12345678`;

        const res = parseCouponForm(formText);
        expect(res.isValid).toBe(true);
        expect(res.orderId).toBe('12345678');
        expect(res.couponType).toBe('Bếp gas đôi Sunhouse SHB3105MD');
    });

    it('reports missing fields for incomplete form', () => {
        const incompleteText = `Quản lý: Sơn`;
        const res = parseCouponForm(incompleteText);
        expect(res.isValid).toBe(false);
        expect(res.errorMessage).toContain('MĐH Áp dụng');
    });

    it('splits forwarded PMH message into individual blocks', () => {
        const forwardedMessage = `KHO 910 PHÁT MÃ
━━━━━━━━━━━━━━━━━━━━
Anh Tuấn:
➜ PMH 100K: ABCD-1234
━━━━━━━━━━━━━━━━━━━━
Lê Sơn:
➜ PMH 200K: XYZW-5678
━━━━━━━━━━━━━━━━━━━━`;

        const blocks = parsePmhBlocks(forwardedMessage);
        expect(blocks.length).toBe(2);
        expect(blocks[0]).toContain('ABCD-1234');
        expect(blocks[1]).toContain('XYZW-5678');
    });

    it('filters PMH block belonging to specific user only', () => {
        const block1 = `Anh Tuấn:\n➜ PMH 100K: ABCD-1234`;
        const block2 = `Lê Trường Sơn:\n➜ PMH 200K: XYZW-5678`;

        expect(isBlockBelongToUser(block1, ['Lê Trường Sơn', 'Sơn'])).toBe(false);
        expect(isBlockBelongToUser(block2, ['Lê Trường Sơn', 'Sơn'])).toBe(true);
    });

    it('parses Mẫu 1: Bộ 3 hộp nhựa chữ nhật Hokkaido (hỗ trợ cả cùng dòng và xuống dòng)', () => {
        const sample1 = `Ngày 18/09/2026 : Mã Phiếu mua hàng 1 - dùng cho Bộ 3 hộp nhựa chữ nhật Hokkaido:
BNXOONE4CM
Ngày 18/09/2026 : Mã Phiếu mua hàng 2 - dùng cho Bộ 3 hộp nhựa chữ nhật Hokkaido: NH9CJIRX6N
Ngày 18/09/2026 : Mã Phiếu mua hàng 3 - dùng cho Bộ 3 hộp nhựa chữ nhật Hokkaido: VUH7FB87H0
Ngày 18/09/2026 : Mã Phiếu mua hàng 4 - dùng cho Bộ 3 hộp nhựa chữ nhật Hokkaido: NJWZJXVAV1`;

        const items = parsePastedCouponList(sample1, 'Giờ Vàng Giá Sốc');
        expect(items.length).toBe(4);
        expect(items[0].code).toBe('BNXOONE4CM');
        expect(items[0].productName).toBe('Bộ 3 hộp nhựa chữ nhật Hokkaido');
        expect(items[0].type).toBe('Giờ Vàng Giá Sốc');

        expect(items[1].code).toBe('NH9CJIRX6N');
        expect(items[1].productName).toBe('Bộ 3 hộp nhựa chữ nhật Hokkaido');

        expect(items[2].code).toBe('VUH7FB87H0');
        expect(items[3].code).toBe('NJWZJXVAV1');
    });

    it('parses Mẫu 2: 22 Mã PMH Quạt đứng Midea FS40-10NAVN(K) có dòng trống', () => {
        const sample2 = `Mã PMH 1 - dùng cho Quạt đứng Midea FS40-10NAVN(K): 21UOZG9KHC

Mã PMH 2 - dùng cho Quạt đứng Midea FS40-10NAVN(K): VVD38R5WXM

Mã PMH 3 - dùng cho Quạt đứng Midea FS40-10NAVN(K): 2Z787JJANM

Mã PMH 4 - dùng cho Quạt đứng Midea FS40-10NAVN(K): XCOFTZ4CMB

Mã PMH 5 - dùng cho Quạt đứng Midea FS40-10NAVN(K): J5NBXO308L

Mã PMH 6 - dùng cho Quạt đứng Midea FS40-10NAVN(K): XTANWC5AMN

Mã PMH 7 - dùng cho Quạt đứng Midea FS40-10NAVN(K): JSFHCRUN51

Mã PMH 8 - dùng cho Quạt đứng Midea FS40-10NAVN(K): YBG4NUZDAC

Mã PMH 9 - dùng cho Quạt đứng Midea FS40-10NAVN(K): RC7UZSTH1M

Mã PMH 10 - dùng cho Quạt đứng Midea FS40-10NAVN(K): PFFJCYP55G

Mã PMH 11 - dùng cho Quạt đứng Midea FS40-10NAVN(K): XFPNB1W3H7

Mã PMH 12 - dùng cho Quạt đứng Midea FS40-10NAVN(K): 1S1IVDVMA9

Mã PMH 13 - dùng cho Quạt đứng Midea FS40-10NAVN(K): WRWR9R93VU

Mã PMH 14 - dùng cho Quạt đứng Midea FS40-10NAVN(K): VKMIYL5SIE

Mã PMH 15 - dùng cho Quạt đứng Midea FS40-10NAVN(K): LATG6O62ES

Mã PMH 16 - dùng cho Quạt đứng Midea FS40-10NAVN(K): FL1M7CWLPD

Mã PMH 17 - dùng cho Quạt đứng Midea FS40-10NAVN(K): CV5X32LTT9

Mã PMH 18 - dùng cho Quạt đứng Midea FS40-10NAVN(K): ES040NYY7G

Mã PMH 19 - dùng cho Quạt đứng Midea FS40-10NAVN(K): UQ4RC0CAND

Mã PMH 20 - dùng cho Quạt đứng Midea FS40-10NAVN(K): 6L5HO3SWZG

Mã PMH 21 - dùng cho Quạt đứng Midea FS40-10NAVN(K): 0C9PH5S951

Mã PMH 22 - dùng cho Quạt đứng Midea FS40-10NAVN(K): UBMOBRSB0E`;

        const items = parsePastedCouponList(sample2, 'Event Cuối Tuần');
        expect(items.length).toBe(22);
        expect(items[0].code).toBe('21UOZG9KHC');
        expect(items[0].productName).toBe('Quạt đứng Midea FS40-10NAVN(K)');
        expect(items[0].type).toBe('Event Cuối Tuần');

        expect(items[21].code).toBe('UBMOBRSB0E');
        expect(items[21].productName).toBe('Quạt đứng Midea FS40-10NAVN(K)');
    });

    it('parses Mẫu 3: Tủ lạnh Panasonic NR-DZ601VGKV', () => {
        const sample3 = `Ngày 18/09/2026 : Mã Coupon 1 - dùng cho Tủ lạnh Panasonic NR-DZ601VGKV: DMXT8K781T448KG

Ngày 18/09/2026 : Mã Coupon 2 - dùng cho Tủ lạnh Panasonic NR-DZ601VGKV: DMXT69BSZ4CBZHX

Ngày 18/09/2026 : Mã Coupon 3 - dùng cho Tủ lạnh Panasonic NR-DZ601VGKV: DMXTB2BK2PS3G1R

Ngày 19/09/2026 : Mã Coupon 1 - dùng cho Tủ lạnh Panasonic NR-DZ601VGKV: DMXT8PX7TGPC7D6

Ngày 19/09/2026 : Mã Coupon 2 - dùng cho Tủ lạnh Panasonic NR-DZ601VGKV: DMXT7D6H6DHGBZR`;

        const items = parsePastedCouponList(sample3, 'Event Lớn');
        expect(items.length).toBe(5);
        expect(items[0].code).toBe('DMXT8K781T448KG');
        expect(items[0].productName).toBe('Tủ lạnh Panasonic NR-DZ601VGKV');
        expect(items[0].type).toBe('Event Lớn');

        expect(items[4].code).toBe('DMXT7D6H6DHGBZR');
        expect(items[4].productName).toBe('Tủ lạnh Panasonic NR-DZ601VGKV');
    });

    it('parses Mẫu 4: 36 mã Máy lọc nước RO (Hòa Phát, Karofi, Sunhouse, Kangaroo) và tự động lọc bỏ mã trùng nếu dán lặp', () => {
        const sampleWaterPurifiers = `Ngày 18/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDFKH8PDNTJB8
Ngày 18/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX5PQBZ9VZZS7K
Ngày 18/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX6TVJQ4ZNK1GH
Ngày 18/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMXC8DBDH44GJS6
Ngày 18/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDFGHDKHJJS2D
Ngày 18/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX81N4FSK5G9H6
Ngày 18/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX3K13D1JCBQ92
Ngày 18/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMX9J8K1VRG4M4S
Ngày 18/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDFNK6MT91CTF
Ngày 18/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX4J98CFM5PBP3
Ngày 18/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX214CQ6M1VNZC
Ngày 18/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMX4CHRBH2DJPK4
Ngày 19/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDFNJGF5M7Z8V
Ngày 19/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX6XFGR86B6BC1
Ngày 19/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX55FGJ2TZG2J1
Ngày 19/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMX8T4DRZX75JNH
Ngày 19/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDG845KR5KZR3
Ngày 19/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX7VCC1B5ZQ8BT
Ngày 19/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX26ZB1KGGB823
Ngày 19/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMXC8DX8KR297H8
Ngày 19/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDG38Q4ZK1NN4
Ngày 19/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX82MTM6HBJT5D
Ngày 19/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX2X2DPCXSC62K
Ngày 19/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMXC7NMM45J4NM8
Ngày 20/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDG2C5494QGQ2
Ngày 20/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX7XCKSRXZ3NT8
Ngày 20/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX7DCTNT1XKFM4
Ngày 20/09/2026 : Mã Coupon 1 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMXC82JQQ6S57DC
Ngày 20/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDFD53M1NKT8S
Ngày 20/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX418V6FP1V1FX
Ngày 20/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX9PJB2NXP3MB5
Ngày 20/09/2026 : Mã Coupon 2 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMXC9KNHTSXTP92
Ngày 20/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Hòa Phát HPN639: DMXDGNDT79X1H8B
Ngày 20/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Karofi KAD-X68: DMX7SKK19152PTN
Ngày 20/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S: DMX6BDSJJJ2MZZ6
Ngày 20/09/2026 : Mã Coupon 3 - dùng cho Máy lọc nước RO nóng nguội lạnh tủ đứng Kangaroo KG12S2H4: DMX8G4F6QRPBK8K`;

        // 1. Phải bóc tách chuẩn xác 36 mã (mỗi sản phẩm đúng 9 mã)
        const items = parsePastedCouponList(sampleWaterPurifiers, 'Giờ Vàng Giá Sốc');
        expect(items.length).toBe(36);

        const hoaPhat = items.filter(i => i.productName.includes('Hòa Phát'));
        const karofi = items.filter(i => i.productName.includes('Karofi'));
        const sunhouse = items.filter(i => i.productName.includes('Sunhouse'));
        const kangaroo = items.filter(i => i.productName.includes('Kangaroo'));

        expect(hoaPhat.length).toBe(9);
        expect(karofi.length).toBe(9);
        expect(sunhouse.length).toBe(9);
        expect(kangaroo.length).toBe(9);

        // Model syntax tự động rút trích phải ngắn gọn chính xác
        expect(hoaPhat[0].syntax).toBe('HPN639');
        expect(karofi[0].syntax).toBe('KAD-X68');
        expect(sunhouse[0].syntax).toBe('SHA76601S');
        expect(kangaroo[0].syntax).toBe('KG12S2H4');

        // 2. Nếu dán đúp 2 lần (72 dòng hoặc 71 dòng dán lặp), hệ thống tự lọc bỏ các mã trùng
        let duplicateCount = 0;
        const doubledText = `${sampleWaterPurifiers}\n${sampleWaterPurifiers}`;
        const deduplicatedItems = parsePastedCouponList(doubledText, 'Giờ Vàng Giá Sốc', () => {
            duplicateCount++;
        });

        expect(deduplicatedItems.length).toBe(36);
        expect(duplicateCount).toBe(36);
    });

    it('parses Mẫu 5: danh sách 330 mã (11 sản phẩm x 30 mã) tự động khử trùng khi bị dán lặp 659 dòng', () => {
        // Mô phỏng 11 sản phẩm, mỗi sản phẩm 30 mã duy nhất (tổng 330 mã)
        const products = [
            'Bếp gas đôi Sunhouse SHB3105MD',
            'Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L',
            'Bếp điện từ đơn Kangaroo KG20IH10N',
            'Nồi cơm điện tử Toshiba RC-18DH2PV(W) 1.8L',
            'Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G',
            'Bếp nướng điện Sunhouse SHD4607',
            'Bình đun siêu tốc Rapido RK2015-C 2L',
            'Máy lọc không khí Midea KJ400GVN',
            'Máy xay thịt Bear CH-5H03P36',
            'Nồi lẩu đa năng Kangaroo KG40EH2 4 lít',
            'Quạt đứng Midea FS40-24EVN(K)'
        ];

        const rawLines: string[] = [];
        for (let day = 18; day <= 27; day++) {
            for (let sess = 1; sess <= 3; sess++) {
                for (let pIdx = 0; pIdx < products.length; pIdx++) {
                    const code = `CODE_D${day}_S${sess}_P${pIdx}`;
                    rawLines.push(`Ngày ${day}/09/2026 : Mã Phiếu mua hàng ${sess} - dùng cho ${products[pIdx]}: ${code}`);
                }
            }
        }
        expect(rawLines.length).toBe(330);

        // Trường hợp bị dán đúp thành 659 dòng (như tình huống người dùng gặp)
        const duplicated659 = [...rawLines, ...rawLines.slice(1)].join('\n');

        let skippedDups = 0;
        const parsed = parsePastedCouponList(duplicated659, 'Event', () => {
            skippedDups++;
        });

        expect(parsed.length).toBe(330);
        expect(skippedDups).toBe(329); // 329 mã trùng lặp được lọc bỏ sạch sẽ
    });

    it('formats syntax list for "cp" command correctly', () => {
        const sampleCoupons = [
            { productName: 'Bếp gas đôi Sunhouse SHB3105MD', syntax: '[ĐĂNG KÝ PMH] Bếp gas Sunhouse', status: 'UNUSED' },
            { productName: 'Bếp gas đôi Sunhouse SHB3105MD', syntax: '[ĐĂNG KÝ PMH] Bếp gas Sunhouse', status: 'UNUSED' },
            { productName: 'Quạt đứng Midea FS40', syntax: '[ĐĂNG KÝ PMH] Quạt Midea', status: 'SENT' },
        ];

        const output = formatSyntaxListMessage(sampleCoupons);
        expect(output).toContain('DANH SÁCH CÚ PHÁP ĐĂNG KÝ PMH');
        expect(output).toContain('Bếp gas đôi Sunhouse SHB3105MD');
        expect(output).toContain('[ĐĂNG KÝ PMH] Bếp gas Sunhouse');
        expect(output).toContain('Quạt đứng Midea FS40');
        expect(output).toContain('[ĐĂNG KÝ PMH] Quạt Midea');
        expect(output).toContain('Gõ "tk" để kiểm tra số lượng tồn kho');
    });

    it('formats inventory report for "tk" command with low stock (<3) warning', () => {
        const sampleCoupons = [
            // Bếp gas: 60 mã, 58 còn, 2 đã dùng -> OK
            ...Array(58).fill({ productName: 'Bếp gas Sunhouse', status: 'UNUSED' }),
            ...Array(2).fill({ productName: 'Bếp gas Sunhouse', status: 'SENT' }),
            // Nồi cơm điện: 2 mã UNUSED (< 3) -> SẮP HẾT CẢNH BÁO
            { productName: 'Nồi cơm Cuckoo', status: 'UNUSED' },
            { productName: 'Nồi cơm Cuckoo', status: 'UNUSED' },
            // Quạt: 3 mã nhưng đều SENT -> HẾT MÃ (0)
            { productName: 'Quạt Midea', status: 'SENT' },
            { productName: 'Quạt Midea', status: 'SENT' },
            { productName: 'Quạt Midea', status: 'SENT' },
        ];

        const report = formatInventoryReportMessage(sampleCoupons);
        expect(report.lowStockCount).toBe(2); // Quạt Midea (0) và Nồi cơm Cuckoo (2)
        expect(report.totalUnused).toBe(60);
        expect(report.totalAll).toBe(65);

        // Tin nhắn phải chứa cảnh báo nổi bật
        expect(report.replyText).toContain('CẢNH BÁO TỒN KHO THẤP (< 3 MÃ)');
        expect(report.replyText).toContain('Có [2] sản phẩm sắp hết hoặc đã hết mã');

        // Phải có icon cảnh báo và trạng thái từng món (loại bỏ icon ✅ cho món bình thường)
        expect(report.replyText).toContain('❌ Quạt Midea');
        expect(report.replyText).toContain('HẾT MÃ (0/3 mã)');

        expect(report.replyText).toContain('⚠️ Nồi cơm Cuckoo');
        expect(report.replyText).toContain('SẮP HẾT: Còn 2/2 mã (CẦN NẠP GẤP!)');

        expect(report.replyText).toContain('3. Bếp gas Sunhouse');
        expect(report.replyText).not.toContain('✅');
        expect(report.replyText).toContain('Còn khả dụng: 58/60 mã');
        expect(report.replyText).toContain('Nhận mã Event: Gõ "e + STT"');
        expect(report.replyText).toContain('Nhận mã Giờ Vàng: Gõ "gv + STT"');

        // Tổng tồn kho và cú pháp nhận mã phải nằm ở trên cùng (trước danh sách sản phẩm)
        expect(report.replyText.indexOf('Tổng tồn kho:')).toBeLessThan(report.replyText.indexOf('Bếp gas Sunhouse'));
    });

    it('thống kê riêng "tk event" chỉ hiển thị các sản phẩm thuộc nhóm Event và hướng dẫn cú pháp e+STT', () => {
        const sampleCoupons = [
            { productName: 'Quạt đứng Midea', type: 'Event', status: 'UNUSED' },
            { productName: 'Quạt đứng Midea', type: 'Event', status: 'UNUSED' },
            { productName: 'Nồi chiên Kangaroo', type: 'Giờ Vàng Giá Sốc', status: 'UNUSED' },
        ];

        const report = formatInventoryReportMessage(sampleCoupons, 'EVENT');
        expect(report.replyText).toContain('📊 BÁO CÁO TỒN KHO PMH EVENT');
        expect(report.replyText).toContain('Quạt đứng Midea');
        expect(report.replyText).not.toContain('Nồi chiên Kangaroo');
        expect(report.replyText).toContain('Cú pháp nhận mã Event: Gõ "e + STT" (ví dụ: e1, e2, e3...)');
        expect(report.products.length).toBe(1);
    });

    it('thống kê riêng "tk gvgs" chỉ hiển thị các sản phẩm thuộc nhóm Giờ Vàng Giá Sốc và hướng dẫn cú pháp gv+STT', () => {
        const sampleCoupons = [
            { productName: 'Quạt đứng Midea', type: 'Event', status: 'UNUSED' },
            { productName: 'Nồi chiên Kangaroo', type: 'Giờ Vàng Giá Sốc', status: 'UNUSED' },
            { productName: 'Bình đun Rapido', type: 'Giờ Vàng Giá Sốc', status: 'UNUSED' },
        ];

        const report = formatInventoryReportMessage(sampleCoupons, 'GVGS');
        expect(report.replyText).toContain('📊 BÁO CÁO TỒN KHO PMH GIỜ VÀNG GIÁ SỐC');
        expect(report.replyText).toContain('Nồi chiên Kangaroo');
        expect(report.replyText).toContain('Bình đun Rapido');
        expect(report.replyText).not.toContain('Quạt đứng Midea');
        expect(report.replyText).toContain('Cú pháp nhận mã Giờ Vàng: Gõ "gv + STT" (ví dụ: gv1, gv2, gv3...)');
        expect(report.products.length).toBe(2);
    });

    describe('Cơ chế xin mã coupon: e + STT (Event) và gv + STT (Giờ Vàng Giá Sốc)', () => {
        it('nhận diện chính xác cú pháp e + STT để lấy PMH Event', async () => {
            const { parseCouponClaimCommand } = await import('../../features/line-bot/services/couponParser');

            // Cú pháp Event đơn giản
            expect(parseCouponClaimCommand('e1')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 1, orderId: undefined });
            expect(parseCouponClaimCommand('e 2')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 2, orderId: undefined });
            expect(parseCouponClaimCommand('E10')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 10, orderId: undefined });
            expect(parseCouponClaimCommand('event 3')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 3, orderId: undefined });

            // Cú pháp Event kèm MĐH
            expect(parseCouponClaimCommand('e2 12345678')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 2, orderId: '12345678' });
            expect(parseCouponClaimCommand('e1 01602SO26090873565')).toEqual({ isSelection: true, isClaim: true, category: 'EVENT', productIndex: 1, orderId: '01602SO26090873565' });
        });

        it('nhận diện chính xác cú pháp gv + STT để lấy PMH Giờ Vàng Giá Sốc', async () => {
            const { parseCouponClaimCommand } = await import('../../features/line-bot/services/couponParser');

            // Cú pháp Giờ Vàng đơn giản
            expect(parseCouponClaimCommand('gv1')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 1, orderId: undefined });
            expect(parseCouponClaimCommand('gv 2')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 2, orderId: undefined });
            expect(parseCouponClaimCommand('GV5')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 5, orderId: undefined });
            expect(parseCouponClaimCommand('gvgs 4')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 4, orderId: undefined });

            // Cú pháp Giờ Vàng kèm MĐH
            expect(parseCouponClaimCommand('gv1 12345678')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 1, orderId: '12345678' });
            expect(parseCouponClaimCommand('gv2 01602SO26090873565')).toEqual({ isSelection: true, isClaim: true, category: 'GVGS', productIndex: 2, orderId: '01602SO26090873565' });
        });

        it('nhận diện số trần và đánh dấu isBareNumber để nhắc người dùng phân loại e hoặc gv', async () => {
            const { parseCouponClaimCommand } = await import('../../features/line-bot/services/couponParser');

            // Số trần không có e/gv
            expect(parseCouponClaimCommand('2')).toEqual({ isSelection: true, isClaim: false, isBareNumber: true, productIndex: 2, orderId: undefined });
            expect(parseCouponClaimCommand('2 12345678')).toEqual({ isSelection: true, isClaim: false, isBareNumber: true, productIndex: 2, orderId: '12345678' });

            // Không phải lệnh xin mã
            expect(parseCouponClaimCommand('tk').isSelection).toBe(false);
            expect(parseCouponClaimCommand('tk event').isSelection).toBe(false);
            expect(parseCouponClaimCommand('12345678').isSelection).toBe(false);
        });

        it('đánh số thứ tự sản phẩm chuẩn xác theo từng nhóm Event và GVGS', async () => {
            const { getProductInventoryList } = await import('../../features/line-bot/services/couponParser');

            const sampleCoupons = [
                // Event 1: Quạt
                ...Array(20).fill({ productName: 'Quạt đứng Midea', type: 'Event', status: 'UNUSED' }),
                // GVGS 1: Bình đun
                ...Array(15).fill({ productName: 'Bình đun Rapido', type: 'Giờ Vàng Giá Sốc', status: 'UNUSED' }),
                // Event 2: Nồi cơm
                ...Array(10).fill({ productName: 'Nồi cơm Toshiba', type: 'Event', status: 'UNUSED' }),
            ];

            const eventList = getProductInventoryList(sampleCoupons, 'EVENT');
            expect(eventList.length).toBe(2);
            expect(eventList[0].index).toBe(1);
            expect(eventList[0].productName).toBe('Nồi cơm Toshiba'); // 10 mã (còn ít hơn xếp trước)
            expect(eventList[1].index).toBe(2);
            expect(eventList[1].productName).toBe('Quạt đứng Midea'); // 20 mã

            const gvgsList = getProductInventoryList(sampleCoupons, 'GVGS');
            expect(gvgsList.length).toBe(1);
            expect(gvgsList[0].index).toBe(1);
            expect(gvgsList[0].productName).toBe('Bình đun Rapido');
        });
    });

    describe('extractProductSyntax & auto-prefill syntax', () => {
        it('tự động trích xuất mã model từ tên sản phẩm làm cú pháp mặc định', async () => {
            const { extractProductSyntax } = await import('../../features/line-bot/services/couponParser');
            
            // Các sản phẩm từ thực tế người dùng chụp ảnh
            expect(extractProductSyntax('Nồi lẩu đa năng Kangaroo KG40EH2 4 lít')).toBe('KG40EH2');
            expect(extractProductSyntax('Bình đun siêu tốc Rapido RK2015-C 2L')).toBe('RK2015');
            expect(extractProductSyntax('Máy xay thịt Bear CH-5H03P36')).toBe('5H03P36');
            expect(extractProductSyntax('Bếp nướng điện Sunhouse SHD4607')).toBe('SHD4607');
            expect(extractProductSyntax('Nồi cơm nắp gài Toshiba RC-18JH1TVN(N) 1.8L')).toBe('18JH1TVN');
            expect(extractProductSyntax('Bếp điện từ đơn Kangaroo KG20IH10N')).toBe('KG20IH10N');
            expect(extractProductSyntax('Nồi cơm điện tử Toshiba RC-18DH2PV(W) 1.8L')).toBe('18DH2PV');
            expect(extractProductSyntax('Nồi chiên không dầu Kangaroo 6.5L KGAF65M1')).toBe('KGAF65M1');
            expect(extractProductSyntax('Bếp gas đôi Sunhouse SHB3105MD')).toBe('SHB3105MD');
            expect(extractProductSyntax('Quạt đứng Midea FS40-10NAVN(K)')).toBe('FS40-10NAVN');
            
            // Sản phẩm không có mã model -> fallback về nguyên tên
            expect(extractProductSyntax('Bộ 3 hộp nhựa chữ nhật Hokkaido')).toBe('Bộ 3 hộp nhựa chữ nhật Hokkaido');
        });

        it('parsePastedCouponList tự động gán syntax = model/tên sản phẩm thay vì để rỗng', () => {
            const rawText = [
                'Ngày 27/09/2026 : Mã Phiếu mua hàng 1 – dùng cho Bếp nướng điện Sunhouse SHD4607: ZJA7RESDNJ',
                'Ngày 27/09/2026 : Mã Phiếu mua hàng 2 – dùng cho Bếp nướng điện Sunhouse SHD4607: VWQU13YUQX',
                'Ngày 27/09/2026 : Mã Phiếu mua hàng 3 – dùng cho Nồi lẩu đa năng Kangaroo KG40EH2 4 lít: IJNFVEZBHE'
            ].join('\n');

            const items = parsePastedCouponList(rawText, 'Event Cuối Tuần');
            expect(items.length).toBe(3);
            expect(items[0].syntax).toBe('SHD4607');
            expect(items[1].syntax).toBe('SHD4607');
            expect(items[2].syntax).toBe('KG40EH2');
        });
    });

    describe('filterPmhByUsers (Tính năng Lọc PMH cho BOT)', () => {
        it('lọc chính xác các mã thuộc về tên cấu hình từ tin nhắn gộp', async () => {
            const { filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const forwardedText = `Lê Trường Sơn
➜ PMH 18JH1TVN : 6W43J4BI2S
━━━━━━
Nguyễn Văn A
➜ PMH KG20IH10N : ABCD1234
━━━━━━
Lê Sơn
➜ PMH SHD4607 : VWQU13YUQX
━━━━━━
Trần Thị B
➜ PMH 5H03P36 : 99998888`;

            const res = filterPmhByUsers(forwardedText, ['Lê Trường Sơn', 'Sơn']);
            expect(res.totalBlocks).toBe(4);
            expect(res.matchedBlocks.length).toBe(2);
            expect(res.matchedCodes.length).toBe(2);

            // Kiểm tra mã đã bóc tách
            expect(res.matchedCodes[0].code).toBe('6W43J4BI2S');
            expect(res.matchedCodes[0].typeOrProduct).toBe('18JH1TVN');
            expect(res.matchedCodes[1].code).toBe('VWQU13YUQX');
            expect(res.matchedCodes[1].typeOrProduct).toBe('SHD4607');

            // Tin nhắn trả lời phải chứa đúng các mã của người đó
            expect(res.summaryMessage).toContain('6W43J4BI2S');
            expect(res.summaryMessage).toContain('VWQU13YUQX');
            expect(res.summaryMessage).not.toContain('ABCD1234');
            expect(res.summaryMessage).not.toContain('99998888');

            // Tính năng mới: Thẻ Flex Cards (Mỗi mã PMH là 1 thẻ)
            expect(res.flexMessages).toBeDefined();
            expect(res.flexMessages!.length).toBe(1);
            const carousel = res.flexMessages![0].contents as any;
            expect(carousel.type).toBe('carousel');
            expect(carousel.contents.length).toBe(2);
            expect(carousel.contents[0].body.contents[0].contents[0].text).toContain('Lê Trường Sơn');
            expect(carousel.contents[0].body.contents[2].contents[0].contents[1].text).toBe('6W43J4BI2S');
            expect(carousel.contents[0].body.contents[2].contents[0].action.clipboardText).toBe('6W43J4BI2S');
        });

        it('lọc danh sách mã PMH và tạo Thẻ Flex Message dạng Carousel chuẩn xác cho từng mã', async () => {
            const { filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const forwardedText = `STR_THƯ_15464-BOSS
➜ PMH ICT200 : OFLQCOQ9QC
────────
AGI_DUNG_72919_TC
➜ PMH MM300 : HBTXBR4QKK
────────
AGI_DUNG_72919_TC
➜ PMH ICT200 : QWZCO7DMEG
────────
Str_Tuấn_22094-TC
➜ PMH MM300 : C3TEPRUR6T
────────
Str_Tuấn_22094-TC
➜ PMH MM300 : KII904M559
────────
CTH_Phong_219586_TC
➜ PMH MM300 : VXBUW671NF`;

            const res = filterPmhByUsers(forwardedText, ['Str_Tuấn_22094-TC']);
            expect(res.totalBlocks).toBe(6);
            expect(res.matchedBlocks.length).toBe(2);
            expect(res.flexMessages).toBeDefined();
            expect(res.flexMessages!.length).toBe(1);
            const carousel = res.flexMessages![0].contents as any;
            expect(carousel.type).toBe('carousel');
            expect(carousel.contents.length).toBe(2);
            expect(carousel.contents[0].body.contents[2].contents[0].contents[1].text).toBe('C3TEPRUR6T');
            expect(carousel.contents[1].body.contents[2].contents[0].contents[1].text).toBe('KII904M559');
        });

        it('báo rõ khi không tìm thấy mã nào thuộc về tên cấu hình', async () => {
            const { filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const forwardedText = `Nguyễn Văn A
➜ PMH KG20IH10N : ABCD1234
━━━━━━
Trần Thị B
➜ PMH 5H03P36 : 99998888`;

            const res = filterPmhByUsers(forwardedText, ['Lê Trường Sơn']);
            expect(res.totalBlocks).toBe(2);
            expect(res.matchedBlocks.length).toBe(0);
            expect(res.summaryMessage).toContain('BOT KHÔNG TÌM THẤY MÃ PMH');
            expect(res.summaryMessage).toContain('Lê Trường Sơn');
        });

        it('làm gọn khối THU HỒI & CẤP LẠI xuống 2 dòng, bóc tách đúng người nhận và mã thu hồi', async () => {
            const { parsePmhBlockDetails, filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const block1 = `🔄 THU HỒI & CẤP LẠI (TRÙNG MĐH: 01602SO26090873565)
ℹ️ Đã thu hồi mã "JV4FL9I14N" (14:31 19-09)
STR_BOSS SƠN_21707
➜ PMH ICT500 : 18PBPT78G4`;

            const details1 = parsePmhBlockDetails(block1);
            expect(details1.recipient).toBe('STR_BOSS SƠN_21707');
            expect(details1.orderId).toBe('01602SO26090873565');
            expect(details1.revokedCode).toBe('JV4FL9I14N');
            expect(details1.code).toBe('18PBPT78G4');
            expect(details1.typeOrProduct).toBe('ICT500');
            expect(details1.isReissue).toBe(true);
            expect(details1.compactBlock).toBe(
                'STR_BOSS SƠN_21707 🔄 Cấp lại [MĐH: 01602SO26090873565]\n➜ PMH ICT500 : 18PBPT78G4 (Thu hồi: JV4FL9I14N)'
            );

            // Kiểm tra trường hợp rớt dòng (như ảnh chụp thực tế)
            const block2 = `🔄 THU HỒI & CẤP LẠI (TRÙNG MĐH:
01602SO2609085241)
ℹ️ Đã thu hồi mã "R6M322942J" (14:57 19-09)
STR_BOSS SƠN_21707
➜ PMH ICT500 : IAC5XU4LLH`;

            const details2 = parsePmhBlockDetails(block2);
            expect(details2.recipient).toBe('STR_BOSS SƠN_21707');
            expect(details2.orderId).toBe('01602SO2609085241');
            expect(details2.revokedCode).toBe('R6M322942J');
            expect(details2.code).toBe('IAC5XU4LLH');
            expect(details2.compactBlock).toBe(
                'STR_BOSS SƠN_21707 🔄 Cấp lại [MĐH: 01602SO2609085241]\n➜ PMH ICT500 : IAC5XU4LLH (Thu hồi: R6M322942J)'
            );

            // Kiểm tra filter tin nhắn gộp cả 2 khối thu hồi (gôm theo người nhận)
            const fullForwarded = `${block1}\n\n${block2}`;
            const filterRes = filterPmhByUsers(fullForwarded, ['STR_BOSS SƠN_21707']);
            expect(filterRes.matchedBlocks.length).toBe(2);
            expect(filterRes.summaryMessage).toContain('STR_BOSS SƠN_21707');
            expect(filterRes.summaryMessage).toContain('➜ PMH ICT500 : 18PBPT78G4 (Thu hồi: JV4FL9I14N)');
            expect(filterRes.summaryMessage).toContain('➜ PMH ICT500 : IAC5XU4LLH (Thu hồi: R6M322942J)');
        });

        it('gôm nhiều mã PMH của cùng 1 người lại theo định dạng rút gọn chuẩn', async () => {
            const { filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const forwardedText = `STR_BOSS SƠN_21707
➜ PMH ICT200 : R6KDPXGZU6
━━━━━━
STR_BOSS SƠN_21707
➜ PMH ICT400 : R6KDPXGZU6
━━━━━━
STR_BOSS SƠN_21707
➜ PMH ICT100 : R6KDPXGZU6`;

            const res = filterPmhByUsers(forwardedText, ['STR_BOSS SƠN_21707']);
            expect(res.summaryMessage).toBe(`🎯 KẾT QUẢ LỌC PMH:
━━━━━━
STR_BOSS SƠN_21707
➜ PMH ICT200 : R6KDPXGZU6
➜ PMH ICT400 : R6KDPXGZU6
➜ PMH ICT100 : R6KDPXGZU6
━━━━━━
💡 Sao chép mã phía trên để sử dụng!`);
        });

        it('bóc tách và hiển thị thông báo lỗi ❌ MĐH khi bot phát mã từ chối thay vì báo không tìm thấy', async () => {
            const { filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            // Tin nhắn thực tế từ LINE chuyển tiếp nhiều người
            const forwardedText = `AGI-Tèo-7176 Boss
➜ PMH MM200 : RKAI1UJJJC
━━━━━━
CMA-THẢO🍀40924🍭BOSS
➜ PMH MM300 : 3NWSPVE8N1
━━━━━━
CTH-THANH-98336-TC
➜ PMH MM300 : G7PPXYOR1B
━━━━━━
BLI_LINH110002-BOSS2
➜ PMH MM300 : 2CH65FLI3R
━━━━━━
BLI_LINH110002-BOSS2
➜ PMH MM300 : SR3A50CETL
━━━━━━
STR_BOSS SƠN_21707
➜ ❌ MĐH Áp Dụng Thiếu Hoặc Sai Cú Pháp.`;

            const candidates = ['STR_ Trường_21453-TC', 'Str_Tuấn_22094-TC', 'STR_BOSS SƠN_21707'];
            const res = filterPmhByUsers(forwardedText, candidates);

            expect(res.totalBlocks).toBe(6);
            expect(res.matchedBlocks.length).toBe(1);
            expect(res.summaryMessage).toBe(`🎯 KẾT QUẢ LỌC PMH:
━━━━━━
STR_BOSS SƠN_21707
➜ ❌ MĐH Áp Dụng Thiếu Hoặc Sai Cú Pháp.
━━━━━━
💡 Sao chép mã phía trên để sử dụng!`);
        });

        it('tuyệt đối không nhận diện nhầm báo cáo thống kê tồn kho PMH thành form lọc phát mã PMH', async () => {
            const { isInventoryOrStatisticsReport, parsePmhBlocks, filterPmhByUsers } = await import('../../features/line-bot/services/couponParser');

            const reportText = `@CMA_Nam 44517_TC
📊 THỐNG KÊ PMH CÒN LẠI:
------------------------
⬢ PMH ICT TRỪ APPLE ( Hạn 30.09 )
- Dưới 5 Triệu: 0
- Từ 5 Đến 10 Triệu: 0
- Từ 10 Đến 20 Triệu: 3673
- Từ 20 Đến 30 Triệu: 186
- Từ 30 Triệu: 359

⬢ PMH ICT MOTOROLA ( 30/09 )
- Giảm 2Tr SP Từ 10 Triệu: 0

⬢ PMH ICT HONOR ( HẾT HẠN )
- PMH 500K Honor 600 Lite 5G: 0

⬢ PMH SAMSUNG S26 FE ( Hạn 30.09 )
- PMH 1 Triệu samsung S26 FE: 0

⬢ PMH LAPTOP TRỪ APPLE ( 30/09 )
- PMH 500K DƯỚI 30 TRIỆU: 0
- PMH 1TR TRÊN 30 TRIỆU: 0

⬢ PMH ICT XIAOMI REDMI 17 ( hạn 07.09)
- PMH 300k XIAOMI REDMI 17: 0

⬢ PMH MÙA MƯA (Trừ Tủ lạnh dưới 200 lít , Endoffline)
- Dưới 10 Triệu: 0
- Từ 10 Đến 20 Triệu: 350
- Trên 20 Triệu: 255

⬢ PMH MLN SUNHOUSE 400K ( HẠN 01.09 )
- MLN SUNHOUSE: 0

⬢ ĐIỆN THOẠI GẬP ( hạn 30/09 )
- GIẢM 2 TRIỆU DÒNG Flip: 0
- GIẢM 3 TRIỆU DÒNG Fold: 0
----
📊 THỐNG KÊ PMH 20H00.

📱 Smartphone - Tablet :
• 50K : 0 Phiếu ❌
• 100K : 0 Phiếu ❌
• 200K : 2.155 Phiếu
• 300K : 327 Phiếu
• 500K : 319 Phiếu

📱 Smartphone Hãng :
• Samsung Galaxy Z Flip 7/8 + Motorola Razr 60 : 0 Phiếu ❌
• Samsung Galaxy Z Fold 7/8 + Motorola Razr Fold + Oppo Find N6 : 7 Phiếu
• Samsung Galaxy S26 FE : 0 Phiếu ❌
• Motorola Trên 10 Triệu : 42 Phiếu
👕 Máy Giặt :
• Haier 800K : 0 Phiếu ❌

🚰 Máy Lọc Nước :
• Sunhouse 400K : 434 Phiếu

⛈️ Nhóm Mùa Mưa (C.E) Số Lượng Phân Bổ Lớn Nên Sẽ Đủ Sử Dụng Hết Tháng 09.`;

            // 1. Phải nhận diện chính xác đây là báo cáo thống kê / tồn kho
            expect(isInventoryOrStatisticsReport(reportText)).toBe(true);

            // 2. parsePmhBlocks phải trả về mảng rỗng (0 khối)
            const blocks = parsePmhBlocks(reportText);
            expect(blocks.length).toBe(0);

            // 3. filterPmhByUsers phải trả về 0 block, không tạo tin nhắn spam
            const candidates = ['STR_ Trường_21453-TC', 'Str_Tuấn_22094-TC', 'STR_BOSS SƠN_21707'];
            const res = filterPmhByUsers(reportText, candidates);
            expect(res.totalBlocks).toBe(0);
            expect(res.matchedBlocks.length).toBe(0);
        });

        it('bóc tách ngày lớn nhất từ danh sách mã và kiểm tra trạng thái hết hạn chuẩn xác', async () => {
            const {
                extractLatestDateFromText,
                isDateExpired,
                formatExpiredCouponNotification,
                parsePastedCouponList
            } = await import('../../features/line-bot/services/couponParser');

            const sampleText = `Ngày 18/09/2026 : Mã Phiếu mua hàng 1 - dùng cho Bếp gas đôi Sunhouse SHB3105MD: CG5BBSGXJ9
Ngày 27/09/2026 : Mã Phiếu mua hàng 2 - dùng cho Bếp gas đôi Sunhouse SHB3105MD: 4P1DXFTUM8`;

            // 1. Kiểm tra trích xuất ngày muộn nhất
            const latestDate = extractLatestDateFromText(sampleText);
            expect(latestDate).toBe('2026-09-27');

            // 2. Kiểm tra logic hết hạn theo quy tắc: Chọn 27/09/2026 => Qua 28/09/2026 mới hết hạn
            expect(isDateExpired('2026-09-27', '2026-09-26')).toBe(false);
            expect(isDateExpired('2026-09-27', '2026-09-27')).toBe(false); // Trong ngày 27 vẫn còn hạn!
            expect(isDateExpired('2026-09-27', '2026-09-28')).toBe(true);  // Sang ngày 28 là ĐÃ HẾT HẠN!
            expect(isDateExpired('2026-09-27', '2026-09-29')).toBe(true);

            // 3. Kiểm tra parsePastedCouponList gán expiryDate
            const items = parsePastedCouponList(sampleText, 'Event', undefined, '2026-09-27');
            expect(items.length).toBe(2);
            expect(items[0].expiryDate).toBe('2026-09-27');
            expect(items[1].expiryDate).toBe('2026-09-27');

            // 4. Kiểm tra tin nhắn thông báo hết hạn
            const notifyMsg = formatExpiredCouponNotification('BOSS SƠN', 'Bếp gas đôi Sunhouse SHB3105MD', '2026-09-27');
            expect(notifyMsg).toContain('@BOSS SƠN');
            expect(notifyMsg).toContain('HẾT HẠN SỬ DỤNG');
            expect(notifyMsg).toContain('27/09/2026');
        });
    });

    describe('Help command ("hd") & Cancel coupon command ("huy")', () => {
        it('recognizes various forms of help command', () => {
            expect(isHelpCommand('hd')).toBe(true);
            expect(isHelpCommand('HD')).toBe(true);
            expect(isHelpCommand(' hd ')).toBe(true);
            expect(isHelpCommand('help')).toBe(true);
            expect(isHelpCommand('huong dan')).toBe(true);
            expect(isHelpCommand('hướng dẫn')).toBe(true);
            expect(isHelpCommand('/hd')).toBe(true);
            expect(isHelpCommand('/help')).toBe(true);
            expect(isHelpCommand('?')).toBe(true);

            expect(isHelpCommand('cp')).toBe(false);
            expect(isHelpCommand('cú pháp')).toBe(false);
            expect(isHelpCommand('tk')).toBe(false);
            expect(isHelpCommand('tk event')).toBe(false);
            expect(isHelpCommand('e1 12345678')).toBe(false);
            expect(isHelpCommand('huy 12345678')).toBe(false);
        });

        it('generates a detailed and structured help guide message', () => {
            const guide = formatHelpGuideMessage();
            expect(guide).toContain('HƯỚNG DẪN SỬ DỤNG BOT PMH ICT');
            expect(guide).toContain('tk');
            expect(guide).toContain('tk event');
            expect(guide).toContain('tk gvgs');
            expect(guide).toContain('Chọn trực tiếp vào sản phẩm cần lấy Coupon');
            expect(guide).toContain('huy [Mã coupon]');
            expect(guide).not.toContain('• "cp"');
            expect(guide).not.toContain('check [MĐH]');
            expect(guide).not.toContain('FORM MẪU');
            expect(guide).not.toContain('CÁCH 2');
        });

        it('parses cancel coupon commands correctly', () => {
            // Test cancel with coupon code
            const res1 = parseCancelCouponCommand('huy 6W43J4BI2S');
            expect(res1.isCancel).toBe(true);
            expect(res1.target).toBe('6W43J4BI2S');

            const res2 = parseCancelCouponCommand('hủy PL47X3N9T8');
            expect(res2.isCancel).toBe(true);
            expect(res2.target).toBe('PL47X3N9T8');

            const res3 = parseCancelCouponCommand('/cancel 59LCGSPUR7BY');
            expect(res3.isCancel).toBe(true);
            expect(res3.target).toBe('59LCGSPUR7BY');

            // Test cancel with order ID (MĐH)
            const res4 = parseCancelCouponCommand('huy 12345678');
            expect(res4.isCancel).toBe(true);
            expect(res4.target).toBe('12345678');

            const res5 = parseCancelCouponCommand('huymã 88291029');
            expect(res5.isCancel).toBe(true);
            expect(res5.target).toBe('88291029');

            // Non-cancel commands
            expect(parseCancelCouponCommand('hd').isCancel).toBe(false);
            expect(parseCancelCouponCommand('tk event').isCancel).toBe(false);
            expect(parseCancelCouponCommand('e1 12345678').isCancel).toBe(false);
        });
    });

    describe('Product matching & Silence for unmanaged products like MM700', () => {
        const sampleIctCoupons = [
            { productName: 'Bếp gas đôi Sunhouse SHB3105MD', syntax: 'SHB3105MD', type: 'Event' },
            { productName: 'Bếp điện từ đơn Kangaroo KG20IH10N', syntax: 'KG20IH10N', type: 'Event' },
            { productName: 'Máy lọc nước RO nóng lạnh tủ đứng Sunhouse UltraX SHA76601S', syntax: 'SHA76601S', type: 'Giờ Vàng Giá Sốc' },
            { productName: 'Nồi chiên không dầu Kangaroo 6.5L KGAF65M1G', syntax: 'KGAF65M1G', type: 'Event' }
        ];

        it('strictly returns false for unmanaged coupon types like MM700, MM300, ML200', () => {
            // Test MM700 - Người dùng gửi form xin MM700 bot ICT không được nhận bừa
            for (const c of sampleIctCoupons) {
                expect(matchesProductSearch(c, 'MM700')).toBe(false);
                expect(matchesProductSearch(c, 'MM300')).toBe(false);
                expect(matchesProductSearch(c, 'ML200')).toBe(false);
                expect(matchesProductSearch(c, 'ML700')).toBe(false);
                expect(matchesProductSearch(c, 'MOTO1500')).toBe(false);
            }

            // Kiểm tra không có bất kỳ sản phẩm nào trong kho khớp với MM700
            const isAnyMatch = sampleIctCoupons.some(c => matchesProductSearch(c, 'MM700'));
            expect(isAnyMatch).toBe(false);
        });

        it('correctly matches valid ICT products by syntax, model or product name', () => {
            const bepGas = sampleIctCoupons[0];
            expect(matchesProductSearch(bepGas, 'SHB3105MD')).toBe(true);
            expect(matchesProductSearch(bepGas, 'Bếp gas đôi Sunhouse SHB3105MD')).toBe(true);
            expect(matchesProductSearch(bepGas, 'Bếp gas')).toBe(true);
            expect(matchesProductSearch(bepGas, 'Sunhouse SHB3105MD')).toBe(true);

            const mayLocNuoc = sampleIctCoupons[2];
            expect(matchesProductSearch(mayLocNuoc, 'SHA76601S')).toBe(true);
            expect(matchesProductSearch(mayLocNuoc, 'Sunhouse UltraX')).toBe(true);
            expect(matchesProductSearch(mayLocNuoc, 'Máy lọc nước RO')).toBe(true);
        });

        it('parses form with MM700 and ensures bot can verify it does not belong to ICT catalog', () => {
            const rawForm = `FORM MẪU LẤY PMH
Loại PMH : MM700
Mã Kho Áp Dụng:910
MĐH Áp Dụng: 00910SO26090335446`;

            const parsed = parseCouponForm(rawForm);
            expect(parsed.isValid).toBe(true);
            expect(parsed.couponType).toBe('MM700');
            expect(parsed.orderId).toBe('00910SO26090335446');
            expect(parsed.warehouse).toBe('910');

            // Xác minh kiểm tra danh mục: MM700 hoàn toàn không thuộc sản phẩm của bot
            const isBelongsToBot = sampleIctCoupons.some(c => matchesProductSearch(c, parsed.couponType));
            expect(isBelongsToBot).toBe(false);
            // -> Khi isBelongsToBot === false, Bot sẽ TUYỆT ĐỐI IM LẶNG!
        });
    });

    describe('createInventoryReportFlexMessage (Giao diện Thẻ tương tác LINE Flex Message)', () => {
        it('tạo cấu hình Flex Bubble chuẩn cho danh sách dưới hoặc bằng 10 sản phẩm', async () => {
            const { createInventoryReportFlexMessage } = await import('../../features/line-bot/services/couponParser');
            const sampleProducts = [
                { index: 1, productName: 'Bếp điện từ đôi Sunhouse', total: 20, unused: 20 },
                { index: 2, productName: 'Máy xay thịt Bear', total: 30, unused: 29 },
                { index: 3, productName: 'Quạt đứng Midea', total: 10, unused: 0 }
            ];

            const flex = createInventoryReportFlexMessage({
                category: 'EVENT',
                totalAll: 60,
                totalUnused: 49,
                products: sampleProducts
            });

            expect(flex.type).toBe('flex');
            const bubble = flex.contents as any;
            expect(bubble.type).toBe('bubble');
            expect(bubble.header.contents[0].contents[0].text).toContain('📊 TỒN KHO PMH EVENT');
            
            // Dòng thứ 2 (Máy xay Bear) phải có action gửi lệnh e2 khi chạm vào
            const row2 = bubble.body.contents[1].contents[1];
            expect(row2.action).toEqual({
                type: 'message',
                label: 'e2',
                text: 'e2'
            });

            // Không được chứa quoteToken
            expect((flex as any).quoteToken).toBeUndefined();
        });

        it('tự động phân trang Carousel khi danh sách có trên 10 sản phẩm để vừa màn hình', async () => {
            const { createInventoryReportFlexMessage } = await import('../../features/line-bot/services/couponParser');
            const sampleProducts = Array.from({ length: 15 }, (_, i) => ({
                index: i + 1,
                productName: `Sản phẩm số ${i + 1}`,
                total: 30,
                unused: 30
            }));

            const flex = createInventoryReportFlexMessage({
                category: 'GVGS',
                totalAll: 450,
                totalUnused: 450,
                products: sampleProducts
            });

            expect(flex.type).toBe('flex');
            const carousel = flex.contents as any;
            expect(carousel.type).toBe('carousel');
            expect(carousel.contents.length).toBe(2); // 15 sản phẩm chia 2 slide (10 và 5)
            expect(carousel.contents[0].header.contents[0].contents[0].text).toContain('(1/2)');
            expect(carousel.contents[1].header.contents[0].contents[0].text).toContain('(2/2)');
        });
    });
});


