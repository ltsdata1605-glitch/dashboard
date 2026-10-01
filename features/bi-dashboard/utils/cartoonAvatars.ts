// 50 Fun & Colorful Cartoon Avatars for Employee Profiles
// Built with pure inline SVGs for zero latency, offline capability, and 100% CORS-safe canvas export.

export interface CartoonAvatar {
    id: number;
    name: string;
    category: 'animal' | 'character' | 'fun_object';
    svg: string;
    dataUrl: string;
}

function svgToDataUrl(svg: string): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// 50 Handcrafted Crisp 64x64 Vector Cartoon Avatars
const RAW_AVATARS: Array<{ id: number; name: string; category: CartoonAvatar['category']; svg: string }> = [
    // 1. Cáo Tinh Nghịch (Fox)
    {
        id: 1,
        name: 'Cáo Tinh Nghịch',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#FF7849"/>
            <polygon points="14,14 26,30 12,32" fill="#E05322"/>
            <polygon points="50,14 38,30 52,32" fill="#E05322"/>
            <polygon points="16,18 24,28 14,30" fill="#FFD1BA"/>
            <polygon points="48,18 40,28 50,30" fill="#FFD1BA"/>
            <circle cx="32" cy="36" r="20" fill="#FFA573"/>
            <path d="M16 38 C16 48 24 54 32 54 C40 54 48 48 48 38 C48 32 40 34 32 37 C24 34 16 32 16 38 Z" fill="#FFFFFF"/>
            <circle cx="24" cy="34" r="3.5" fill="#2D2320"/>
            <circle cx="25" cy="33" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="40" cy="34" rx="4" ry="1.5" fill="#2D2320" transform="rotate(-10 40 34)"/>
            <polygon points="29,42 35,42 32,46" fill="#2D2320"/>
            <ellipse cx="19" cy="42" rx="3" ry="1.5" fill="#FFA9A9"/>
            <ellipse cx="45" cy="42" rx="3" ry="1.5" fill="#FFA9A9"/>
        </svg>`
    },
    // 2. Mèo May Mắn (Lucky Cat)
    {
        id: 2,
        name: 'Mèo May Mắn',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#10B981"/>
            <polygon points="14,12 24,26 12,28" fill="#FFFFFF"/>
            <polygon points="50,12 40,26 52,28" fill="#FFFFFF"/>
            <polygon points="16,16 22,24 14,26" fill="#FDA4AF"/>
            <polygon points="48,16 42,24 50,26" fill="#FDA4AF"/>
            <circle cx="32" cy="36" r="21" fill="#FFFFFF"/>
            <path d="M22 34 Q25 31 28 34" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M36 34 Q39 31 42 34" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <polygon points="30,38 34,38 32,41" fill="#FB7185"/>
            <path d="M32 41 Q29 44 26 43 M32 41 Q35 44 38 43" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="12" y1="38" x2="20" y2="40" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="12" y1="43" x2="20" y2="43" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="52" y1="38" x2="44" y2="40" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="52" y1="43" x2="44" y2="43" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="21" cy="41" r="3" fill="#FECDD3"/>
            <circle cx="43" cy="41" r="3" fill="#FECDD3"/>
        </svg>`
    },
    // 3. Cún Shiba Vui Vẻ (Shiba Dog)
    {
        id: 3,
        name: 'Cún Shiba Vui Vẻ',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F59E0B"/>
            <polygon points="12,14 26,26 14,32" fill="#D97706"/>
            <polygon points="52,14 38,26 50,32" fill="#D97706"/>
            <polygon points="16,18 24,24 16,28" fill="#FEF3C7"/>
            <polygon points="48,18 40,24 48,28" fill="#FEF3C7"/>
            <circle cx="32" cy="36" r="21" fill="#FBBF24"/>
            <ellipse cx="23" cy="28" rx="3.5" ry="2" fill="#FFFBEB"/>
            <ellipse cx="41" cy="28" rx="3.5" ry="2" fill="#FFFBEB"/>
            <path d="M19 40 C19 51 25 54 32 54 C39 54 45 51 45 40 C45 36 38 38 32 38 C26 38 19 36 19 40 Z" fill="#FFFBEB"/>
            <circle cx="24" cy="35" r="3.2" fill="#1F2937"/>
            <circle cx="25" cy="34" r="1.2" fill="#FFFFFF"/>
            <circle cx="40" cy="35" r="3.2" fill="#1F2937"/>
            <circle cx="41" cy="34" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="32" cy="42" rx="3.5" ry="2.5" fill="#1F2937"/>
            <path d="M30 45 C30 49 34 49 34 45 Z" fill="#F43F5E"/>
        </svg>`
    },
    // 4. Gấu Trúc Cute (Cute Panda)
    {
        id: 4,
        name: 'Gấu Trúc Cute',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#06B6D4"/>
            <circle cx="16" cy="18" r="9" fill="#1E293B"/>
            <circle cx="48" cy="18" r="9" fill="#1E293B"/>
            <circle cx="32" cy="36" r="21" fill="#FFFFFF"/>
            <ellipse cx="23" cy="34" rx="5.5" ry="7" fill="#1E293B" transform="rotate(-15 23 34)"/>
            <ellipse cx="41" cy="34" rx="5.5" ry="7" fill="#1E293B" transform="rotate(15 41 34)"/>
            <circle cx="24" cy="34" r="2.2" fill="#FFFFFF"/>
            <circle cx="24" cy="34" r="1.2" fill="#0EA5E9"/>
            <circle cx="40" cy="34" r="2.2" fill="#FFFFFF"/>
            <circle cx="40" cy="34" r="1.2" fill="#0EA5E9"/>
            <ellipse cx="32" cy="42" rx="3.2" ry="2" fill="#1E293B"/>
            <path d="M32 44 Q30 47 27 46 M32 44 Q34 47 37 46" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="17" cy="42" r="3" fill="#FDA4AF"/>
            <circle cx="47" cy="42" r="3" fill="#FDA4AF"/>
        </svg>`
    },
    // 5. Sư Tử Dũng Mãnh (Brave Lion)
    {
        id: 5,
        name: 'Sư Tử Dũng Mãnh',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#EA580C"/>
            <circle cx="32" cy="34" r="24" fill="#C2410C"/>
            <circle cx="20" cy="18" r="6" fill="#D97706"/>
            <circle cx="44" cy="18" r="6" fill="#D97706"/>
            <circle cx="32" cy="36" r="18" fill="#FBBF24"/>
            <ellipse cx="25" cy="34" rx="3" ry="4" fill="#1E293B"/>
            <circle cx="26" cy="33" r="1" fill="#FFFFFF"/>
            <ellipse cx="39" cy="34" rx="3" ry="4" fill="#1E293B"/>
            <circle cx="40" cy="33" r="1" fill="#FFFFFF"/>
            <polygon points="29,39 35,39 32,43" fill="#9A3412"/>
            <path d="M32 43 Q29 46 26 44 M32 43 Q35 46 38 44" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
            <circle cx="19" cy="41" r="2.5" fill="#F87171"/>
            <circle cx="45" cy="41" r="2.5" fill="#F87171"/>
        </svg>`
    },
    // 6. Hổ Vàng Nhanh Nhẹn (Energetic Tiger)
    {
        id: 6,
        name: 'Hổ Vàng Nhanh Nhẹn',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F97316"/>
            <circle cx="16" cy="18" r="8" fill="#EA580C"/>
            <circle cx="16" cy="18" r="4.5" fill="#FED7AA"/>
            <circle cx="48" cy="18" r="8" fill="#EA580C"/>
            <circle cx="48" cy="18" r="4.5" fill="#FED7AA"/>
            <circle cx="32" cy="36" r="21" fill="#FB923C"/>
            <path d="M32 18 L30 25 L34 25 Z M27 22 L24 28 L28 28 Z M37 22 L40 28 L36 28 Z" fill="#1E293B"/>
            <ellipse cx="24" cy="35" rx="3.5" ry="4.5" fill="#1E293B"/>
            <circle cx="25" cy="33" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="40" cy="35" rx="3.5" ry="4.5" fill="#1E293B"/>
            <circle cx="41" cy="33" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="32" cy="44" rx="7" ry="5" fill="#FFFFFF"/>
            <polygon points="30,41 34,41 32,44" fill="#EA580C"/>
            <path d="M32 44 Q30 47 28 46 M32 44 Q34 47 36 46" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    },
    // 7. Thỏ Hồng Đáng Yêu (Cute Bunny)
    {
        id: 7,
        name: 'Thỏ Hồng Đáng Yêu',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#EC4899"/>
            <ellipse cx="23" cy="17" rx="6" ry="15" fill="#FFFFFF"/>
            <ellipse cx="23" cy="17" rx="3" ry="11" fill="#F472B6"/>
            <ellipse cx="41" cy="17" rx="6" ry="15" fill="#FFFFFF"/>
            <ellipse cx="41" cy="17" rx="3" ry="11" fill="#F472B6"/>
            <circle cx="32" cy="38" r="19" fill="#FFFFFF"/>
            <circle cx="24" cy="36" r="3.5" fill="#1E293B"/>
            <circle cx="25" cy="34" r="1.5" fill="#FFFFFF"/>
            <circle cx="40" cy="36" r="3.5" fill="#1E293B"/>
            <circle cx="41" cy="34" r="1.5" fill="#FFFFFF"/>
            <ellipse cx="32" cy="41" rx="2.5" ry="1.8" fill="#FB7185"/>
            <path d="M32 43 Q30 46 27 45 M32 43 Q34 46 37 45" stroke="#1E293B" stroke-width="1.5" stroke-linecap="round"/>
            <circle cx="18" cy="42" r="3" fill="#FDA4AF"/>
            <circle cx="46" cy="42" r="3" fill="#FDA4AF"/>
        </svg>`
    },
    // 8. Gấu Nâu Ấm Áp (Warm Bear)
    {
        id: 8,
        name: 'Gấu Nâu Ấm Áp',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#38BDF8"/>
            <circle cx="17" cy="18" r="8" fill="#854D0E"/>
            <circle cx="17" cy="18" r="4.5" fill="#CA8A04"/>
            <circle cx="47" cy="18" r="8" fill="#854D0E"/>
            <circle cx="47" cy="18" r="4.5" fill="#CA8A04"/>
            <circle cx="32" cy="36" r="21" fill="#A16207"/>
            <circle cx="24" cy="33" r="3" fill="#1E293B"/>
            <circle cx="25" cy="32" r="1" fill="#FFFFFF"/>
            <circle cx="40" cy="33" r="3" fill="#1E293B"/>
            <circle cx="41" cy="32" r="1" fill="#FFFFFF"/>
            <ellipse cx="32" cy="42" rx="9" ry="7" fill="#FEF08A"/>
            <ellipse cx="32" cy="40" rx="3.5" ry="2.5" fill="#1E293B"/>
            <path d="M29 44 Q32 47 35 44" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 9. Cánh Cụt Khăn Len (Penguin)
    {
        id: 9,
        name: 'Cánh Cụt Khăn Len',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#60A5FA"/>
            <circle cx="32" cy="34" r="21" fill="#1E293B"/>
            <ellipse cx="32" cy="38" rx="15" ry="17" fill="#FFFFFF"/>
            <ellipse cx="25" cy="33" rx="3" ry="4" fill="#0F172A"/>
            <circle cx="26" cy="32" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="39" cy="33" rx="3" ry="4" fill="#0F172A"/>
            <circle cx="40" cy="32" r="1.2" fill="#FFFFFF"/>
            <polygon points="28,38 36,38 32,43" fill="#F97316"/>
            <path d="M16 50 C16 46 48 46 48 50 L46 54 L18 54 Z" fill="#EF4444"/>
            <rect x="36" y="50" width="8" height="10" rx="2" fill="#DC2626"/>
            <circle cx="20" cy="39" r="2.5" fill="#FECDD3"/>
            <circle cx="44" cy="39" r="2.5" fill="#FECDD3"/>
        </svg>`
    },
    // 10. Koala Mơ Màng (Dreamy Koala)
    {
        id: 10,
        name: 'Koala Mơ Màng',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#34D399"/>
            <circle cx="15" cy="20" r="10" fill="#94A3B8"/>
            <circle cx="15" cy="20" r="6" fill="#F1F5F9"/>
            <circle cx="49" cy="20" r="10" fill="#94A3B8"/>
            <circle cx="49" cy="20" r="6" fill="#F1F5F9"/>
            <circle cx="32" cy="36" r="20" fill="#CBD5E1"/>
            <ellipse cx="24" cy="34" rx="2.5" ry="3.5" fill="#1E293B"/>
            <ellipse cx="40" cy="34" rx="2.5" ry="3.5" fill="#1E293B"/>
            <ellipse cx="32" cy="38" rx="5" ry="8" fill="#1E293B"/>
            <ellipse cx="31" cy="36" rx="1.5" ry="2.5" fill="#475569"/>
            <circle cx="18" cy="42" r="3" fill="#FDA4AF"/>
            <circle cx="46" cy="42" r="3" fill="#FDA4AF"/>
        </svg>`
    },
    // 11. Khỉ Con Nhanh Nhí (Cheeky Monkey)
    {
        id: 11,
        name: 'Khỉ Con Nhanh Nhí',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#FBBF24"/>
            <circle cx="13" cy="32" r="8" fill="#B45309"/>
            <circle cx="13" cy="32" r="5" fill="#FDE68A"/>
            <circle cx="51" cy="32" r="8" fill="#B45309"/>
            <circle cx="51" cy="32" r="5" fill="#FDE68A"/>
            <circle cx="32" cy="35" r="20" fill="#B45309"/>
            <path d="M18 30 C18 24 25 24 32 28 C39 24 46 24 46 30 C46 44 18 44 18 30 Z" fill="#FDE68A"/>
            <ellipse cx="32" cy="43" rx="11" ry="8" fill="#FDE68A"/>
            <circle cx="26" cy="32" r="3" fill="#1E293B"/>
            <circle cx="38" cy="32" r="3" fill="#1E293B"/>
            <ellipse cx="30" cy="41" rx="1" ry="1.5" fill="#78350F"/>
            <ellipse cx="34" cy="41" rx="1" ry="1.5" fill="#78350F"/>
            <path d="M26 45 Q32 50 38 45" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 12. Ếch Xanh Vui Vẻ (Happy Frog)
    {
        id: 12,
        name: 'Ếch Xanh Vui Vẻ',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#22C55E"/>
            <circle cx="20" cy="18" r="9" fill="#4ADE80"/>
            <circle cx="20" cy="18" r="5" fill="#FFFFFF"/>
            <circle cx="20" cy="18" r="2.5" fill="#1E293B"/>
            <circle cx="44" cy="18" r="9" fill="#4ADE80"/>
            <circle cx="44" cy="18" r="5" fill="#FFFFFF"/>
            <circle cx="44" cy="18" r="2.5" fill="#1E293B"/>
            <ellipse cx="32" cy="38" rx="22" ry="17" fill="#4ADE80"/>
            <path d="M18 38 Q32 54 46 38" stroke="#166534" stroke-width="3" stroke-linecap="round" fill="none"/>
            <circle cx="16" cy="38" r="3.5" fill="#F87171"/>
            <circle cx="48" cy="38" r="3.5" fill="#F87171"/>
        </svg>`
    },
    // 13. Kỳ Lân Thần Thoại (Magical Unicorn)
    {
        id: 13,
        name: 'Kỳ Lân Thần Thoại',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#A855F7"/>
            <polygon points="32,6 28,24 36,24" fill="#FACC15"/>
            <polygon points="17,14 26,26 15,30" fill="#FFFFFF"/>
            <polygon points="47,14 38,26 49,30" fill="#FFFFFF"/>
            <circle cx="32" cy="38" r="20" fill="#FFFFFF"/>
            <path d="M22 36 Q26 31 30 36" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M34 36 Q38 31 42 36" stroke="#1E293B" stroke-width="2.5" stroke-linecap="round"/>
            <ellipse cx="32" cy="46" rx="8" ry="5" fill="#FCE7F3"/>
            <circle cx="29" cy="45" r="1.2" fill="#EC4899"/>
            <circle cx="35" cy="45" r="1.2" fill="#EC4899"/>
            <circle cx="18" cy="42" r="3" fill="#FDA4AF"/>
            <circle cx="46" cy="42" r="3" fill="#FDA4AF"/>
            <path d="M20 20 Q24 26 21 32" stroke="#F472B6" stroke-width="3" stroke-linecap="round"/>
        </svg>`
    },
    // 14. Rồng Lửa Tí Hon (Baby Dragon)
    {
        id: 14,
        name: 'Rồng Lửa Tí Hon',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#EF4444"/>
            <polygon points="18,12 24,24 14,24" fill="#FACC15"/>
            <polygon points="46,12 50,24 40,24" fill="#FACC15"/>
            <circle cx="32" cy="36" r="21" fill="#F87171"/>
            <ellipse cx="23" cy="33" rx="4" ry="5" fill="#1E293B"/>
            <circle cx="24" cy="31" r="1.5" fill="#FFFFFF"/>
            <ellipse cx="41" cy="33" rx="4" ry="5" fill="#1E293B"/>
            <circle cx="42" cy="31" r="1.5" fill="#FFFFFF"/>
            <ellipse cx="32" cy="44" rx="10" ry="7" fill="#FEE2E2"/>
            <circle cx="29" cy="43" r="1.5" fill="#B91C1C"/>
            <circle cx="35" cy="43" r="1.5" fill="#B91C1C"/>
            <path d="M28 47 Q32 50 36 47" stroke="#B91C1C" stroke-width="2" stroke-linecap="round"/>
            <circle cx="17" cy="40" r="3" fill="#FCA5A5"/>
            <circle cx="47" cy="40" r="3" fill="#FCA5A5"/>
        </svg>`
    },
    // 15. Cú Mèo Thông Thái (Wise Owl)
    {
        id: 15,
        name: 'Cú Mèo Thông Thái',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#6366F1"/>
            <polygon points="16,14 26,26 14,28" fill="#4338CA"/>
            <polygon points="48,14 38,26 50,28" fill="#4338CA"/>
            <circle cx="32" cy="36" r="21" fill="#818CF8"/>
            <circle cx="23" cy="34" r="9" fill="#FFFFFF"/>
            <circle cx="23" cy="34" r="5" fill="#F59E0B"/>
            <circle cx="23" cy="34" r="2.5" fill="#1E293B"/>
            <circle cx="24" cy="33" r="1" fill="#FFFFFF"/>
            <circle cx="41" cy="34" r="9" fill="#FFFFFF"/>
            <circle cx="41" cy="34" r="5" fill="#F59E0B"/>
            <circle cx="41" cy="34" r="2.5" fill="#1E293B"/>
            <circle cx="42" cy="33" r="1" fill="#FFFFFF"/>
            <polygon points="29,38 35,38 32,46" fill="#F59E0B"/>
        </svg>`
    },
    // 16. Hươu Cao Cổ (Giraffe)
    {
        id: 16,
        name: 'Hươu Cao Cổ',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#FACC15"/>
            <line x1="24" y1="12" x2="26" y2="22" stroke="#78350F" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="24" cy="11" r="3" fill="#78350F"/>
            <line x1="40" y1="12" x2="38" y2="22" stroke="#78350F" stroke-width="2.5" stroke-linecap="round"/>
            <circle cx="40" cy="11" r="3" fill="#78350F"/>
            <ellipse cx="14" cy="24" rx="5" ry="3" fill="#FEF08A" transform="rotate(-30 14 24)"/>
            <ellipse cx="50" cy="24" rx="5" ry="3" fill="#FEF08A" transform="rotate(30 50 24)"/>
            <circle cx="32" cy="37" r="20" fill="#FEF08A"/>
            <circle cx="24" cy="33" r="3" fill="#1E293B"/>
            <circle cx="25" cy="32" r="1" fill="#FFFFFF"/>
            <circle cx="40" cy="33" r="3" fill="#1E293B"/>
            <circle cx="41" cy="32" r="1" fill="#FFFFFF"/>
            <ellipse cx="32" cy="44" rx="10" ry="7" fill="#FDE047"/>
            <ellipse cx="29" cy="42" rx="1.5" ry="2" fill="#78350F"/>
            <ellipse cx="35" cy="42" rx="1.5" ry="2" fill="#78350F"/>
            <path d="M28 46 Q32 49 36 46" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
            <circle cx="32" cy="26" r="3" fill="#CA8A04"/>
        </svg>`
    },
    // 17. Voi Con Tinh Nghịch (Playful Elephant)
    {
        id: 17,
        name: 'Voi Con Tinh Nghịch',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#818CF8"/>
            <circle cx="12" cy="34" r="11" fill="#93C5FD"/>
            <circle cx="52" cy="34" r="11" fill="#93C5FD"/>
            <circle cx="32" cy="36" r="19" fill="#BFDBFE"/>
            <circle cx="24" cy="32" r="3" fill="#1E293B"/>
            <circle cx="25" cy="31" r="1" fill="#FFFFFF"/>
            <circle cx="40" cy="32" r="3" fill="#1E293B"/>
            <circle cx="41" cy="31" r="1" fill="#FFFFFF"/>
            <path d="M30 38 Q32 49 28 50 Q25 50 25 45" stroke="#93C5FD" stroke-width="5" stroke-linecap="round" fill="none"/>
            <circle cx="19" cy="38" r="3" fill="#F472B6"/>
            <circle cx="45" cy="38" r="3" fill="#F472B6"/>
        </svg>`
    },
    // 18. Gấu Mèo Quậy Phá (Bandit Raccoon)
    {
        id: 18,
        name: 'Gấu Mèo Quậy Phá',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#8B5CF6"/>
            <polygon points="14,14 26,26 12,30" fill="#475569"/>
            <polygon points="50,14 38,26 52,30" fill="#475569"/>
            <circle cx="32" cy="36" r="21" fill="#94A3B8"/>
            <path d="M13 32 Q32 38 51 32 L49 40 Q32 44 15 40 Z" fill="#1E293B"/>
            <circle cx="23" cy="35" r="3" fill="#FFFFFF"/>
            <circle cx="23" cy="35" r="1.8" fill="#38BDF8"/>
            <circle cx="41" cy="35" r="3" fill="#FFFFFF"/>
            <circle cx="41" cy="35" r="1.8" fill="#38BDF8"/>
            <ellipse cx="32" cy="43" rx="6" ry="4" fill="#FFFFFF"/>
            <ellipse cx="32" cy="41" rx="2.5" ry="1.5" fill="#1E293B"/>
            <path d="M30 44 Q32 46 34 44" stroke="#1E293B" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`
    },
    // 19. Hamster Phúng Phính (Chubby Hamster)
    {
        id: 19,
        name: 'Hamster Phúng Phính',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F472B6"/>
            <circle cx="16" cy="18" r="6" fill="#FDBA74"/>
            <circle cx="16" cy="18" r="3.5" fill="#FDA4AF"/>
            <circle cx="48" cy="18" r="6" fill="#FDBA74"/>
            <circle cx="48" cy="18" r="3.5" fill="#FDA4AF"/>
            <circle cx="32" cy="36" r="20" fill="#FED7AA"/>
            <circle cx="23" cy="32" r="3" fill="#1E293B"/>
            <circle cx="24" cy="31" r="1" fill="#FFFFFF"/>
            <circle cx="41" cy="32" r="3" fill="#1E293B"/>
            <circle cx="42" cy="31" r="1" fill="#FFFFFF"/>
            <circle cx="17" cy="40" r="6.5" fill="#FDA4AF"/>
            <circle cx="47" cy="40" r="6.5" fill="#FDA4AF"/>
            <polygon points="30,37 34,37 32,39" fill="#FB7185"/>
            <rect x="30" y="40" width="2" height="3" fill="#FFFFFF"/>
            <rect x="32" y="40" width="2" height="3" fill="#FFFFFF"/>
            <ellipse cx="32" cy="48" rx="3" ry="4.5" fill="#78350F" transform="rotate(15 32 48)"/>
        </svg>`
    },
    // 20. Rái Cá Dễ Thương (Cute Otter)
    {
        id: 20,
        name: 'Rái Cá Dễ Thương',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#14B8A6"/>
            <circle cx="16" cy="22" r="5" fill="#78350F"/>
            <circle cx="48" cy="22" r="5" fill="#78350F"/>
            <circle cx="32" cy="36" r="20" fill="#9A3412"/>
            <ellipse cx="32" cy="42" rx="14" ry="11" fill="#FFEDD5"/>
            <circle cx="24" cy="33" r="3" fill="#1E293B"/>
            <circle cx="25" cy="32" r="1" fill="#FFFFFF"/>
            <circle cx="40" cy="33" r="3" fill="#1E293B"/>
            <circle cx="41" cy="32" r="1" fill="#FFFFFF"/>
            <ellipse cx="32" cy="39" rx="3.5" ry="2.2" fill="#1E293B"/>
            <path d="M30 42 Q32 45 34 42" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="20" cy="41" r="2.5" fill="#FCA5A5"/>
            <circle cx="44" cy="41" r="2.5" fill="#FCA5A5"/>
        </svg>`
    },
    // 21. Cá Voi Đại Dương (Ocean Whale)
    {
        id: 21,
        name: 'Cá Voi Đại Dương',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#0284C7"/>
            <path d="M32 18 C32 10 30 8 26 12 M32 18 C32 10 34 8 38 12 M32 18 L32 14" stroke="#E0F2FE" stroke-width="2" stroke-linecap="round"/>
            <path d="M12 40 C12 24 24 22 40 22 C52 22 54 36 50 44 C42 46 22 46 12 40 Z" fill="#38BDF8"/>
            <path d="M16 41 C22 46 36 46 48 42 C44 48 24 49 16 41 Z" fill="#FFFFFF"/>
            <circle cx="26" cy="32" r="2.8" fill="#0F172A"/>
            <circle cx="27" cy="31" r="1" fill="#FFFFFF"/>
            <path d="M22 38 Q26 41 30 38" stroke="#0F172A" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="18" cy="36" r="2.5" fill="#F472B6"/>
        </svg>`
    },
    // 22. Bạch Tuộc Nhí Nhảnh (Bubbly Octopus)
    {
        id: 22,
        name: 'Bạch Tuộc Nhí Nhảnh',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#FB7185"/>
            <ellipse cx="32" cy="30" rx="19" ry="17" fill="#FDA4AF"/>
            <circle cx="24" cy="28" r="3.5" fill="#1E293B"/>
            <circle cx="25" cy="27" r="1.2" fill="#FFFFFF"/>
            <circle cx="40" cy="28" r="3.5" fill="#1E293B"/>
            <circle cx="41" cy="27" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="32" cy="36" rx="2.5" ry="3.5" fill="#BE123C"/>
            <circle cx="18" cy="34" r="3" fill="#F43F5E"/>
            <circle cx="46" cy="34" r="3" fill="#F43F5E"/>
            <path d="M16 45 Q19 54 22 45 Q25 54 28 45 Q31 54 34 45 Q37 54 40 45 Q43 54 46 45" stroke="#FDA4AF" stroke-width="5" stroke-linecap="round"/>
        </svg>`
    },
    // 23. Vịt Vàng Cao Su (Rubber Duck)
    {
        id: 23,
        name: 'Vịt Vàng Cao Su',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#0EA5E9"/>
            <circle cx="32" cy="33" r="20" fill="#FDE047"/>
            <circle cx="25" cy="29" r="3" fill="#1E293B"/>
            <circle cx="26" cy="28" r="1" fill="#FFFFFF"/>
            <ellipse cx="32" cy="38" rx="8" ry="4" fill="#FB923C"/>
            <ellipse cx="32" cy="40" rx="5" ry="2" fill="#EA580C"/>
            <circle cx="18" cy="34" r="3" fill="#FCA5A5"/>
            <path d="M28 14 Q32 10 36 14" stroke="#FACC15" stroke-width="3" stroke-linecap="round"/>
        </svg>`
    },
    // 24. Gà Con Vỏ Trứng (Shell Chick)
    {
        id: 24,
        name: 'Gà Con Vỏ Trứng',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F59E0B"/>
            <circle cx="32" cy="30" r="18" fill="#FEF08A"/>
            <polygon points="32,10 30,15 34,15" fill="#F59E0B"/>
            <circle cx="24" cy="28" r="3" fill="#1E293B"/>
            <circle cx="25" cy="27" r="1" fill="#FFFFFF"/>
            <circle cx="40" cy="28" r="3" fill="#1E293B"/>
            <circle cx="41" cy="27" r="1" fill="#FFFFFF"/>
            <polygon points="29,32 35,32 32,36" fill="#F97316"/>
            <path d="M14 42 L20 36 L26 42 L32 36 L38 42 L44 36 L50 42 C50 54 14 54 14 42 Z" fill="#FFFFFF"/>
            <circle cx="18" cy="33" r="2.5" fill="#FCA5A5"/>
            <circle cx="46" cy="33" r="2.5" fill="#FCA5A5"/>
        </svg>`
    },
    // 25. Nhím Nhỏ Gai Nhọn (Hedgehog)
    {
        id: 25,
        name: 'Nhím Nhỏ Gai Nhọn',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#4ADE80"/>
            <path d="M12 28 L18 16 L26 22 L32 12 L38 22 L46 16 L52 28 L54 38 L48 48 L16 48 Z" fill="#78350F"/>
            <circle cx="32" cy="38" r="16" fill="#FED7AA"/>
            <circle cx="25" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="39" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="32" cy="42" r="2.5" fill="#1E293B"/>
            <circle cx="19" cy="41" r="2.5" fill="#FCA5A5"/>
            <circle cx="45" cy="41" r="2.5" fill="#FCA5A5"/>
        </svg>`
    },
    // 26. Lười Chill Kính Râm (Chill Sloth)
    {
        id: 26,
        name: 'Lười Chill Kính Râm',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#D97706"/>
            <circle cx="32" cy="35" r="21" fill="#A8A29E"/>
            <circle cx="32" cy="36" r="17" fill="#F5F5F4"/>
            <ellipse cx="23" cy="35" rx="5" ry="3" fill="#78716C" transform="rotate(-15 23 35)"/>
            <ellipse cx="41" cy="35" rx="5" ry="3" fill="#78716C" transform="rotate(15 41 35)"/>
            <rect x="18" y="32" width="12" height="7" rx="3" fill="#1E293B"/>
            <rect x="34" y="32" width="12" height="7" rx="3" fill="#1E293B"/>
            <line x1="30" y1="35" x2="34" y2="35" stroke="#1E293B" stroke-width="2"/>
            <ellipse cx="32" cy="43" rx="3" ry="2" fill="#1E293B"/>
            <path d="M29 47 Q32 49 35 47" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    },
    // 27. Lạc Đà Llama Xinh (Sweet Llama)
    {
        id: 27,
        name: 'Lạc Đà Llama Xinh',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F43F5E"/>
            <polygon points="20,12 25,24 16,24" fill="#FFFFFF"/>
            <polygon points="44,12 48,24 39,24" fill="#FFFFFF"/>
            <circle cx="32" cy="36" r="19" fill="#FFFFFF"/>
            <path d="M23 33 Q26 30 29 33" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            <path d="M35 33 Q38 30 41 33" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            <ellipse cx="32" cy="41" rx="5" ry="3.5" fill="#FFE4E6"/>
            <circle cx="30" cy="40" r="1" fill="#1E293B"/>
            <circle cx="34" cy="40" r="1" fill="#1E293B"/>
            <circle cx="18" cy="39" r="3" fill="#FDA4AF"/>
            <circle cx="46" cy="39" r="3" fill="#FDA4AF"/>
            <circle cx="32" cy="51" r="3" fill="#FACC15"/>
            <circle cx="25" cy="50" r="2.5" fill="#38BDF8"/>
            <circle cx="39" cy="50" r="2.5" fill="#A855F7"/>
        </svg>`
    },
    // 28. Ong Vàng Chăm Chỉ (Worker Bee)
    {
        id: 28,
        name: 'Ong Vàng Chăm Chỉ',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#EAB308"/>
            <ellipse cx="20" cy="20" rx="8" ry="5" fill="#E0F2FE" transform="rotate(-30 20 20)"/>
            <ellipse cx="44" cy="20" rx="8" ry="5" fill="#E0F2FE" transform="rotate(30 44 20)"/>
            <circle cx="32" cy="36" r="20" fill="#FACC15"/>
            <path d="M14 34 L50 34" stroke="#1E293B" stroke-width="4"/>
            <path d="M16 43 L48 43" stroke="#1E293B" stroke-width="4"/>
            <circle cx="25" cy="28" r="3" fill="#1E293B"/>
            <circle cx="26" cy="27" r="1" fill="#FFFFFF"/>
            <circle cx="39" cy="28" r="3" fill="#1E293B"/>
            <circle cx="40" cy="27" r="1" fill="#FFFFFF"/>
            <path d="M29 38 Q32 41 35 38" stroke="#1E293B" stroke-width="2" stroke-linecap="round"/>
            <line x1="28" y1="18" x2="24" y2="10" stroke="#1E293B" stroke-width="2"/>
            <circle cx="24" cy="10" r="2" fill="#1E293B"/>
            <line x1="36" y1="18" x2="40" y2="10" stroke="#1E293B" stroke-width="2"/>
            <circle cx="40" cy="10" r="2" fill="#1E293B"/>
        </svg>`
    },
    // 29. Khủng Long Nhí (Baby Dino)
    {
        id: 29,
        name: 'Khủng Long Nhí',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#15803D"/>
            <polygon points="18,14 24,20 18,24" fill="#FACC15"/>
            <polygon points="28,10 34,16 28,20" fill="#FACC15"/>
            <polygon points="38,12 44,18 38,22" fill="#FACC15"/>
            <circle cx="32" cy="36" r="20" fill="#4ADE80"/>
            <circle cx="24" cy="33" r="3.5" fill="#1E293B"/>
            <circle cx="25" cy="31" r="1.2" fill="#FFFFFF"/>
            <circle cx="40" cy="33" r="3.5" fill="#1E293B"/>
            <circle cx="41" cy="31" r="1.2" fill="#FFFFFF"/>
            <ellipse cx="32" cy="43" rx="10" ry="6" fill="#BBF7D0"/>
            <polygon points="30,41 32,44 34,41" fill="#FFFFFF"/>
            <circle cx="18" cy="39" r="2.5" fill="#F87171"/>
            <circle cx="46" cy="39" r="2.5" fill="#F87171"/>
        </svg>`
    },
    // 30. Cá Mập Thân Thiện (Baby Shark)
    {
        id: 30,
        name: 'Cá Mập Thân Thiện',
        category: 'animal',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#0891B2"/>
            <polygon points="32,8 26,20 38,20" fill="#06B6D4"/>
            <circle cx="32" cy="36" r="20" fill="#67E8F9"/>
            <circle cx="23" cy="32" r="3.5" fill="#0F172A"/>
            <circle cx="24" cy="30" r="1.2" fill="#FFFFFF"/>
            <circle cx="41" cy="32" r="3.5" fill="#0F172A"/>
            <circle cx="42" cy="30" r="1.2" fill="#FFFFFF"/>
            <path d="M22 41 Q32 50 42 41 Z" fill="#0F172A"/>
            <polygon points="25,41 27,44 29,41 31,44 33,41 35,44 37,41 39,44" fill="#FFFFFF"/>
            <circle cx="16" cy="38" r="2.5" fill="#F472B6"/>
            <circle cx="48" cy="38" r="2.5" fill="#F472B6"/>
        </svg>`
    },
    // 31. Phi Hành Gia (Astronaut)
    {
        id: 31,
        name: 'Phi Hành Gia',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#1E1B4B"/>
            <rect x="14" y="16" width="36" height="34" rx="14" fill="#F1F5F9"/>
            <rect x="18" y="20" width="28" height="24" rx="10" fill="#0F172A"/>
            <ellipse cx="25" cy="27" rx="4" ry="2" fill="#38BDF8" transform="rotate(-20 25 27)"/>
            <circle cx="38" cy="30" r="1" fill="#FACC15"/>
            <circle cx="34" cy="36" r="0.8" fill="#FFFFFF"/>
            <rect x="26" y="47" width="12" height="4" rx="2" fill="#64748B"/>
            <circle cx="12" cy="33" r="3" fill="#94A3B8"/>
            <circle cx="52" cy="33" r="3" fill="#94A3B8"/>
        </svg>`
    },
    // 32. Siêu Anh Hùng (Superhero)
    {
        id: 32,
        name: 'Siêu Anh Hùng',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#DC2626"/>
            <circle cx="32" cy="34" r="20" fill="#FED7AA"/>
            <path d="M16 26 C16 18 24 16 32 16 C40 16 48 18 48 26 L48 30 L16 30 Z" fill="#1E293B"/>
            <path d="M14 30 L50 30 L46 38 L38 34 L32 38 L26 34 L18 38 Z" fill="#DC2626"/>
            <ellipse cx="24" cy="34" rx="3" ry="1.8" fill="#FFFFFF"/>
            <ellipse cx="40" cy="34" rx="3" ry="1.8" fill="#FFFFFF"/>
            <circle cx="24" cy="34" r="1.2" fill="#1E293B"/>
            <circle cx="40" cy="34" r="1.2" fill="#1E293B"/>
            <path d="M28 44 Q32 48 36 44" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 33. Ninja Siêu Đẳng (Ninja)
    {
        id: 33,
        name: 'Ninja Siêu Đẳng',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#334155"/>
            <circle cx="32" cy="34" r="20" fill="#0F172A"/>
            <ellipse cx="32" cy="33" rx="14" ry="6" fill="#FED7AA"/>
            <rect x="12" y="24" width="40" height="5" fill="#EF4444"/>
            <circle cx="32" cy="26.5" r="2" fill="#FFFFFF"/>
            <ellipse cx="25" cy="33" rx="2.5" ry="1.2" fill="#0F172A"/>
            <ellipse cx="39" cy="33" rx="2.5" ry="1.2" fill="#0F172A"/>
        </svg>`
    },
    // 34. Cao Bồi Viễn Tây (Cowboy)
    {
        id: 34,
        name: 'Cao Bồi Viễn Tây',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#B45309"/>
            <circle cx="32" cy="37" r="18" fill="#FED7AA"/>
            <path d="M8 26 C12 20 52 20 56 26 C48 24 16 24 8 26 Z" fill="#78350F"/>
            <path d="M20 25 C20 12 44 12 44 25 Z" fill="#92400E"/>
            <rect x="20" y="23" width="24" height="3" fill="#DC2626"/>
            <circle cx="25" cy="35" r="2.5" fill="#1E293B"/>
            <ellipse cx="39" cy="35" rx="3" ry="1" fill="#1E293B" transform="rotate(-10 39 35)"/>
            <path d="M28 43 Q32 46 36 43" stroke="#78350F" stroke-width="2" stroke-linecap="round"/>
            <polygon points="26,48 38,48 32,54" fill="#EF4444"/>
        </svg>`
    },
    // 35. Phù Thủy Quyền Năng (Wizard)
    {
        id: 35,
        name: 'Phù Thủy Quyền Năng',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#7C3AED"/>
            <polygon points="32,6 18,28 46,28" fill="#4C1D95"/>
            <ellipse cx="32" cy="28" rx="18" ry="4" fill="#5B21B6"/>
            <circle cx="32" cy="18" r="1.5" fill="#FACC15"/>
            <circle cx="32" cy="38" r="16" fill="#FED7AA"/>
            <circle cx="26" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="38" cy="36" r="2.5" fill="#1E293B"/>
            <path d="M22 42 C22 54 42 54 42 42 Z" fill="#FFFFFF"/>
        </svg>`
    },
    // 36. Hoàng Tử Nhí (Little Prince)
    {
        id: 36,
        name: 'Hoàng Tử Nhí',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F59E0B"/>
            <circle cx="32" cy="36" r="19" fill="#FED7AA"/>
            <path d="M16 30 C18 20 46 20 48 30 Z" fill="#78350F"/>
            <polygon points="22,20 26,10 32,18 38,10 42,20" fill="#FACC15"/>
            <circle cx="26" cy="10" r="1.5" fill="#EF4444"/>
            <circle cx="38" cy="10" r="1.5" fill="#3B82F6"/>
            <circle cx="32" cy="18" r="1.5" fill="#10B981"/>
            <circle cx="25" cy="35" r="2.8" fill="#1E293B"/>
            <circle cx="39" cy="35" r="2.8" fill="#1E293B"/>
            <path d="M28 43 Q32 47 36 43" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
            <circle cx="20" cy="40" r="2.5" fill="#FCA5A5"/>
            <circle cx="44" cy="40" r="2.5" fill="#FCA5A5"/>
        </svg>`
    },
    // 37. Công Chúa Ngọt Ngào (Princess)
    {
        id: 37,
        name: 'Công Chúa Ngọt Ngào',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#EC4899"/>
            <circle cx="32" cy="37" r="18" fill="#FED7AA"/>
            <path d="M14 26 C16 16 48 16 50 26 C52 40 48 48 48 48 L16 48 Z" fill="#FDE047"/>
            <polygon points="25,20 28,14 32,18 36,14 39,20" fill="#EC4899"/>
            <circle cx="32" cy="14" r="1.5" fill="#FFFFFF"/>
            <circle cx="25" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="39" cy="36" r="2.5" fill="#1E293B"/>
            <path d="M29 43 Q32 46 35 43" stroke="#E11D48" stroke-width="2" stroke-linecap="round"/>
            <circle cx="20" cy="41" r="3" fill="#FDA4AF"/>
            <circle cx="44" cy="41" r="3" fill="#FDA4AF"/>
        </svg>`
    },
    // 38. Chàng Trai Cool Ngầu (Cool Guy)
    {
        id: 38,
        name: 'Chàng Trai Cool Ngầu',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#3B82F6"/>
            <circle cx="32" cy="36" r="19" fill="#FED7AA"/>
            <path d="M16 26 C20 14 44 14 48 26 Z" fill="#1E293B"/>
            <path d="M16 31 L30 31 L28 39 L18 39 Z M34 31 L48 31 L46 39 L36 39 Z" fill="#0F172A"/>
            <line x1="30" y1="33" x2="34" y2="33" stroke="#0F172A" stroke-width="2.5"/>
            <line x1="19" y1="33" x2="27" y2="33" stroke="#38BDF8" stroke-width="1.2"/>
            <line x1="37" y1="33" x2="45" y2="33" stroke="#38BDF8" stroke-width="1.2"/>
            <path d="M28 44 Q33 48 36 43" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 39. DJ Sành Điệu (DJ Producer)
    {
        id: 39,
        name: 'DJ Sành Điệu',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#A21CAF"/>
            <path d="M16 28 C16 14 48 14 48 28" stroke="#F43F5E" stroke-width="4" stroke-linecap="round" fill="none"/>
            <rect x="10" y="24" width="8" height="14" rx="4" fill="#06B6D4"/>
            <rect x="46" y="24" width="8" height="14" rx="4" fill="#06B6D4"/>
            <circle cx="32" cy="36" r="18" fill="#FED7AA"/>
            <path d="M18 26 C24 18 40 18 46 26 Z" fill="#701A75"/>
            <circle cx="26" cy="35" r="2.8" fill="#1E293B"/>
            <circle cx="38" cy="35" r="2.8" fill="#1E293B"/>
            <path d="M28 43 Q32 47 36 43" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 40. Họa Sĩ Sáng Tạo (Artist)
    {
        id: 40,
        name: 'Họa Sĩ Sáng Tạo',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#0D9488"/>
            <circle cx="32" cy="37" r="18" fill="#FED7AA"/>
            <ellipse cx="32" cy="22" rx="18" ry="8" fill="#E11D48" transform="rotate(-10 32 22)"/>
            <circle cx="28" cy="14" r="2" fill="#E11D48"/>
            <circle cx="25" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="39" cy="36" r="2.5" fill="#1E293B"/>
            <path d="M28 44 Q32 47 36 44" stroke="#9A3412" stroke-width="2" stroke-linecap="round"/>
            <circle cx="20" cy="42" r="2" fill="#38BDF8"/>
            <circle cx="43" cy="41" r="2" fill="#FACC15"/>
        </svg>`
    },
    // 41. Đầu Bếp 5 Sao (Master Chef)
    {
        id: 41,
        name: 'Đầu Bếp 5 Sao',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#E11D48"/>
            <path d="M20 22 C16 14 24 6 32 10 C40 6 48 14 44 22 Z" fill="#FFFFFF"/>
            <rect x="22" y="20" width="20" height="5" fill="#F1F5F9"/>
            <circle cx="32" cy="38" r="17" fill="#FED7AA"/>
            <circle cx="26" cy="35" r="2.5" fill="#1E293B"/>
            <circle cx="38" cy="35" r="2.5" fill="#1E293B"/>
            <path d="M24 41 Q28 38 32 41 Q36 38 40 41" stroke="#78350F" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <path d="M29 45 Q32 48 35 45" stroke="#9A3412" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    },
    // 42. Thám Tử Sherlock (Detective)
    {
        id: 42,
        name: 'Thám Tử Sherlock',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#78716C"/>
            <circle cx="32" cy="38" r="18" fill="#FED7AA"/>
            <ellipse cx="32" cy="22" rx="20" ry="6" fill="#57534E"/>
            <path d="M18 22 C18 12 46 12 46 22 Z" fill="#78716C"/>
            <circle cx="26" cy="36" r="2.5" fill="#1E293B"/>
            <circle cx="38" cy="36" r="2.5" fill="#1E293B"/>
            <path d="M29 44 Q32 46 35 44" stroke="#9A3412" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="43" cy="44" r="5" stroke="#F59E0B" stroke-width="2" fill="none"/>
            <line x1="47" y1="48" x2="52" y2="53" stroke="#F59E0B" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`
    },
    // 43. Robot Tương Lai (Futuristic Bot)
    {
        id: 43,
        name: 'Robot Tương Lai',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#0284C7"/>
            <line x1="32" y1="8" x2="32" y2="18" stroke="#94A3B8" stroke-width="3" stroke-linecap="round"/>
            <circle cx="32" cy="8" r="3" fill="#EF4444"/>
            <rect x="16" y="18" width="32" height="28" rx="8" fill="#E2E8F0"/>
            <rect x="20" y="24" width="24" height="12" rx="4" fill="#0F172A"/>
            <rect x="23" y="27" width="5" height="5" rx="1" fill="#38BDF8"/>
            <rect x="36" y="27" width="5" height="5" rx="1" fill="#38BDF8"/>
            <line x1="24" y1="40" x2="40" y2="40" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
            <circle cx="12" cy="32" r="3" fill="#64748B"/>
            <circle cx="52" cy="32" r="3" fill="#64748B"/>
        </svg>`
    },
    // 44. Quái Vật Pixel (Retro Alien)
    {
        id: 44,
        name: 'Quái Vật Pixel',
        category: 'character',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#7E22CE"/>
            <circle cx="32" cy="36" r="19" fill="#A855F7"/>
            <circle cx="20" cy="18" r="4" fill="#C084FC"/>
            <line x1="20" y1="22" x2="24" y2="28" stroke="#C084FC" stroke-width="2.5"/>
            <circle cx="44" cy="18" r="4" fill="#C084FC"/>
            <line x1="44" y1="22" x2="40" y2="28" stroke="#C084FC" stroke-width="2.5"/>
            <circle cx="22" cy="34" r="4" fill="#FFFFFF"/>
            <circle cx="22" cy="34" r="2" fill="#1E293B"/>
            <circle cx="32" cy="30" r="4.5" fill="#FFFFFF"/>
            <circle cx="32" cy="30" r="2.2" fill="#1E293B"/>
            <circle cx="42" cy="34" r="4" fill="#FFFFFF"/>
            <circle cx="42" cy="34" r="2" fill="#1E293B"/>
            <path d="M26 44 Q32 49 38 44" stroke="#581C87" stroke-width="2.5" stroke-linecap="round"/>
        </svg>`
    },
    // 45. Ngôi Sao May Mắn (Lucky Star)
    {
        id: 45,
        name: 'Ngôi Sao May Mắn',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#F59E0B"/>
            <polygon points="32,8 37,23 53,23 40,33 45,49 32,39 19,49 24,33 11,23 27,23" fill="#FDE047"/>
            <circle cx="28" cy="28" r="2.5" fill="#1E293B"/>
            <circle cx="29" cy="27" r="0.8" fill="#FFFFFF"/>
            <circle cx="36" cy="28" r="2.5" fill="#1E293B"/>
            <circle cx="37" cy="27" r="0.8" fill="#FFFFFF"/>
            <path d="M29 33 Q32 36 35 33" stroke="#B45309" stroke-width="1.8" stroke-linecap="round"/>
            <circle cx="24" cy="32" r="2" fill="#F472B6"/>
            <circle cx="40" cy="32" r="2" fill="#F472B6"/>
        </svg>`
    },
    // 46. Quả Táo Vui Vẻ (Happy Apple)
    {
        id: 46,
        name: 'Quả Táo Vui Vẻ',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#E11D48"/>
            <path d="M32 14 C32 10 36 8 36 8" stroke="#78350F" stroke-width="2.5" stroke-linecap="round"/>
            <ellipse cx="38" cy="11" rx="4" ry="2" fill="#22C55E" transform="rotate(-20 38 11)"/>
            <path d="M22 18 C14 18 12 30 16 42 C20 54 28 52 32 48 C36 52 44 54 48 42 C52 30 50 18 42 18 C36 18 34 22 32 22 C30 22 28 18 22 18 Z" fill="#EF4444"/>
            <circle cx="25" cy="32" r="2.8" fill="#1E293B"/>
            <circle cx="26" cy="31" r="1" fill="#FFFFFF"/>
            <circle cx="39" cy="32" r="2.8" fill="#1E293B"/>
            <circle cx="40" cy="31" r="1" fill="#FFFFFF"/>
            <path d="M28 38 Q32 42 36 38" stroke="#7F1D1D" stroke-width="2" stroke-linecap="round"/>
            <circle cx="20" cy="36" r="2.5" fill="#FDA4AF"/>
            <circle cx="44" cy="36" r="2.5" fill="#FDA4AF"/>
        </svg>`
    },
    // 47. Quả Bơ Siêu Cool (Cool Avocado)
    {
        id: 47,
        name: 'Quả Bơ Siêu Cool',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#15803D"/>
            <path d="M32 12 C24 12 20 20 18 30 C16 42 22 52 32 52 C42 52 48 42 46 30 C44 20 40 12 32 12 Z" fill="#84CC16"/>
            <path d="M32 16 C26 16 23 22 21 30 C19 40 24 48 32 48 C40 48 45 40 43 30 C41 22 38 16 32 16 Z" fill="#D9F99D"/>
            <circle cx="32" cy="37" r="9" fill="#78350F"/>
            <rect x="23" y="24" width="8" height="5" rx="2" fill="#1E293B"/>
            <rect x="33" y="24" width="8" height="5" rx="2" fill="#1E293B"/>
            <line x1="31" y1="26" x2="33" y2="26" stroke="#1E293B" stroke-width="2"/>
            <path d="M29 39 Q32 42 35 39" stroke="#FEF08A" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    },
    // 48. Miếng Pizza Vui Nhộn (Pizza Slice)
    {
        id: 48,
        name: 'Miếng Pizza Vui Nhộn',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#D97706"/>
            <polygon points="32,54 12,20 52,20" fill="#FACC15"/>
            <path d="M10 20 Q32 14 54 20" stroke="#B45309" stroke-width="5" stroke-linecap="round"/>
            <circle cx="24" cy="28" r="3.5" fill="#DC2626"/>
            <circle cx="40" cy="28" r="3.5" fill="#DC2626"/>
            <circle cx="32" cy="42" r="3" fill="#DC2626"/>
            <circle cx="28" cy="34" r="2.2" fill="#1E293B"/>
            <circle cx="36" cy="34" r="2.2" fill="#1E293B"/>
            <path d="M29 38 Q32 40 35 38" stroke="#1E293B" stroke-width="1.8" stroke-linecap="round"/>
        </svg>`
    },
    // 49. Donut Cầu Vồng (Rainbow Donut)
    {
        id: 49,
        name: 'Donut Cầu Vồng',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#DB2777"/>
            <circle cx="32" cy="32" r="21" fill="#FDE047"/>
            <path d="M12 32 C12 21 21 12 32 12 C43 12 52 21 52 32 C50 36 46 32 42 36 C38 40 36 34 32 36 C28 38 26 34 22 36 C18 38 14 34 12 32 Z" fill="#F472B6"/>
            <circle cx="32" cy="32" r="8" fill="#DB2777"/>
            <line x1="22" y1="20" x2="25" y2="22" stroke="#38BDF8" stroke-width="2" stroke-linecap="round"/>
            <line x1="39" y1="20" x2="42" y2="22" stroke="#4ADE80" stroke-width="2" stroke-linecap="round"/>
            <line x1="20" y1="28" x2="23" y2="29" stroke="#FACC15" stroke-width="2" stroke-linecap="round"/>
            <line x1="42" y1="28" x2="45" y2="27" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>
            <line x1="31" y1="16" x2="33" y2="18" stroke="#A855F7" stroke-width="2" stroke-linecap="round"/>
        </svg>`
    },
    // 50. Cà Phê Năng Lượng (Energy Coffee)
    {
        id: 50,
        name: 'Cà Phê Năng Lượng',
        category: 'fun_object',
        svg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="32" fill="#78350F"/>
            <path d="M26 12 Q28 8 26 6 M32 14 Q34 10 32 7 M38 12 Q40 8 38 6" stroke="#FED7AA" stroke-width="1.8" stroke-linecap="round"/>
            <path d="M18 20 L22 48 C22 51 42 51 42 48 L46 20 Z" fill="#FFFFFF"/>
            <rect x="18" y="28" width="28" height="12" fill="#15803D"/>
            <circle cx="28" cy="34" r="1.8" fill="#FFFFFF"/>
            <circle cx="36" cy="34" r="1.8" fill="#FFFFFF"/>
            <path d="M30 38 Q32 40 34 38" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
            <rect x="16" y="18" width="32" height="4" rx="2" fill="#E2E8F0"/>
        </svg>`
    }
];

export const CARTOON_AVATARS: CartoonAvatar[] = RAW_AVATARS.map(avatar => ({
    ...avatar,
    dataUrl: svgToDataUrl(avatar.svg)
}));

/**
 * Hash string (employee ID or name) to a deterministic number from 1 to 50
 */
export function hashStringToAvatarId(str?: string | null): number {
    if (!str) return 1;
    // Tách mã nhân viên nếu có (ví dụ "158089 - H.Duy" -> "158089")
    const match = str.match(/\b\d{4,8}\b/);
    const target = (match ? match[0] : str).trim().toLowerCase();

    let hash = 0;
    for (let i = 0; i < target.length; i++) {
        hash = ((hash << 5) - hash) + target.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 50) + 1;
}

/**
 * Lấy avatar hoạt hình mặc định dựa theo ID hoặc tên nhân viên
 */
export function getCartoonAvatar(idOrName?: string | null): CartoonAvatar {
    const avatarId = hashStringToAvatarId(idOrName);
    return CARTOON_AVATARS[avatarId - 1] || CARTOON_AVATARS[0];
}

/**
 * Lấy avatar hoạt hình theo ID chính xác (1 -> 50)
 */
export function getCartoonAvatarById(id: number): CartoonAvatar {
    const safeIndex = Math.max(0, Math.min(49, id - 1));
    return CARTOON_AVATARS[safeIndex];
}

/**
 * Lấy trực tiếp data URL của avatar hoạt hình
 */
export function getCartoonAvatarDataUrl(idOrName?: string | null): string {
    return getCartoonAvatar(idOrName).dataUrl;
}
