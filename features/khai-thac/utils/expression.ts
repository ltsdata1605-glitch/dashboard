/**
 * Ô "Tổng doanh thu" cho phép gõ phép tính (yêu cầu chủ dự án 2026-09-21): "5+ 3+ 4" → 12.
 * Chỉ nhận chữ số, dấu thập phân (. hoặc ,), khoảng trắng và + - * / ( ).
 * Tự viết bộ phân tích đệ quy nhỏ — KHÔNG dùng eval()/Function() (nội dung là chuỗi người dùng gõ).
 */

const ALLOWED = /[0-9.,+\-*/() ]/;

/** Lọc ký tự không hợp lệ khỏi chuỗi đang gõ (dán từ nơi khác cũng qua đây). */
export function sanitizeExpressionInput(raw: string): string {
    let out = '';
    for (const ch of raw) if (ALLOWED.test(ch)) out += ch;
    return out;
}

export function hasOperator(s: string): boolean {
    return /[+\-*/()]/.test(s);
}

type Tok = { t: 'num'; v: number } | { t: 'op'; v: '+' | '-' | '*' | '/' | '(' | ')' };

function tokenize(s: string): Tok[] | null {
    const toks: Tok[] = [];
    let i = 0;
    while (i < s.length) {
        const ch = s[i];
        if (ch === ' ') { i++; continue; }
        if (/[0-9.,]/.test(ch)) {
            let j = i;
            while (j < s.length && /[0-9.,]/.test(s[j])) j++;
            const numStr = s.slice(i, j).replace(',', '.');
            if (!/^\d*\.?\d*$/.test(numStr) || numStr === '.' || numStr === '') return null;
            toks.push({ t: 'num', v: parseFloat(numStr) });
            i = j;
            continue;
        }
        if ('+-*/()'.includes(ch)) { toks.push({ t: 'op', v: ch as '+' | '-' | '*' | '/' | '(' | ')' }); i++; continue; }
        return null;
    }
    return toks;
}

/**
 * Tính giá trị biểu thức. Trả `null` nếu chuỗi rỗng, sai cú pháp hoặc chưa hoàn chỉnh
 * (vd "5+" khi đang gõ dở) — người gọi tự quyết định hiển thị gì.
 */
export function evaluateExpression(input: string): number | null {
    const toks = tokenize(input.trim());
    if (!toks || toks.length === 0) return null;
    let pos = 0;
    const peek = () => toks[pos];
    const take = () => toks[pos++];

    // expr := term (('+'|'-') term)*
    const parseExpr = (): number | null => {
        let left = parseTerm();
        if (left === null) return null;
        while (pos < toks.length) {
            const k = peek();
            if (k.t !== 'op' || (k.v !== '+' && k.v !== '-')) break;
            take();
            const right = parseTerm();
            if (right === null) return null;
            left = k.v === '+' ? left + right : left - right;
        }
        return left;
    };
    // term := factor (('*'|'/') factor)*
    const parseTerm = (): number | null => {
        let left = parseFactor();
        if (left === null) return null;
        while (pos < toks.length) {
            const k = peek();
            if (k.t !== 'op' || (k.v !== '*' && k.v !== '/')) break;
            take();
            const right = parseFactor();
            if (right === null) return null;
            if (k.v === '/') {
                if (right === 0) return null;
                left = left / right;
            } else {
                left = left * right;
            }
        }
        return left;
    };
    // factor := num | '(' expr ')' | ('+'|'-') factor
    const parseFactor = (): number | null => {
        const k = peek();
        if (!k) return null;
        if (k.t === 'num') { take(); return k.v; }
        if (k.v === '(') {
            take();
            const inner = parseExpr();
            if (inner === null) return null;
            const close = peek();
            if (!close || close.t !== 'op' || close.v !== ')') return null;
            take();
            return inner;
        }
        if (k.v === '-' || k.v === '+') {
            take();
            const f = parseFactor();
            if (f === null) return null;
            return k.v === '-' ? -f : f;
        }
        return null;
    };

    const result = parseExpr();
    if (result === null || pos !== toks.length || !Number.isFinite(result)) return null;
    // Bỏ sai số nhị phân kiểu 0.1+0.2 = 0.30000000000000004
    return Math.round(result * 1e6) / 1e6;
}
