import { Bank } from '../types/tax.types';

export const BANKS: Bank[] = [
    { name: "Ngân hàng TMCP Ngoại thương Việt Nam", code: "VCB", bin: "970436", short_name: "Vietcombank" },
    { name: "Ngân hàng TMCP Công thương Việt Nam", code: "CTG", bin: "970415", short_name: "VietinBank" },
    { name: "Ngân hàng TMCP Đầu tư và Phát triển Việt Nam", code: "BIDV", bin: "970418", short_name: "BIDV" },
    { name: "Ngân hàng Nông nghiệp và Phát triển Nông thôn Việt Nam", code: "VBA", bin: "970405", short_name: "Agribank" },
    { name: "Ngân hàng TMCP Quân đội", code: "MBB", bin: "970422", short_name: "MBBank" },
    { name: "Ngân hàng TMCP Kỹ thương Việt Nam", code: "TCB", bin: "970407", short_name: "Techcombank" },
    { name: "Ngân hàng TMCP Á Châu", code: "ACB", bin: "970416", short_name: "ACB" },
    { name: "Ngân hàng TMCP Việt Nam Thịnh Vượng", code: "VPB", bin: "970432", short_name: "VPBank" },
    { name: "Ngân hàng TMCP Sài Gòn Thương Tín", code: "STB", bin: "970403", short_name: "Sacombank" },
    { name: "Ngân hàng TMCP Quốc tế Việt Nam", code: "VIB", bin: "970441", short_name: "VIB" },
    { name: "Ngân hàng TMCP Tiên Phong", code: "TPB", bin: "970423", short_name: "TPBank" },
    { name: "Ngân hàng TMCP Phát triển Thành phố Hồ Chí Minh", code: "HDB", bin: "970437", short_name: "HDBank" },
    { name: "Ngân hàng TMCP Phương Đông", code: "OCB", bin: "970448", short_name: "OCB" },
    { name: "Ngân hàng TMCP Đông Nam Á", code: "SEAB", bin: "970440", short_name: "SeABank" },
    { name: "Ngân hàng TMCP Sài Gòn - Hà Nội", code: "SHB", bin: "970443", short_name: "SHB" },
    { name: "Ngân hàng TNHH MTV Shinhan Việt Nam", code: "SHBVN", bin: "970424", short_name: "ShinhanBank" },
    { name: "Ngân hàng TMCP Bản Việt", code: "VCCB", bin: "970454", short_name: "VietCapitalBank" },
    { name: "Ngân hàng TMCP Bắc Á", code: "BAB", bin: "970409", short_name: "BacABank" },
    { name: "Ngân hàng TMCP An Bình", code: "ABB", bin: "970425", short_name: "ABBANK" },
    { name: "Ngân hàng TMCP Xuất Nhập khẩu Việt Nam", code: "EIB", bin: "970431", short_name: "Eximbank" },
    { name: "Ngân hàng TMCP Kiên Long", code: "KLB", bin: "970452", short_name: "KienLongBank" },
];

export const VIETNAMESE_BANKS = BANKS;

export const BANK_OPTIONS = BANKS.map(b => ({
    value: b.short_name,
    label: `${b.short_name} - ${b.name}`,
    bank: b
})).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
