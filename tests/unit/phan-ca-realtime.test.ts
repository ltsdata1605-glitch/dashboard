import { describe, it, expect } from 'vitest';
import { quyetDinhNhanTuCloud as q } from '../../features/phan-ca/services/firestoreSync';

describe('Phân Ca — nhận bản Cloud từ thiết bị khác', () => {
    it('máy khác vừa lưu, máy này không sửa gì → áp ngay', () => {
        expect(q({ cloud: '"moi"', daDongBo: '"cu"', trenMay: '"cu"' })).toBe('ap');
    });
    it('tiếng vọng / trùng bản đã đồng bộ → bỏ qua', () => {
        expect(q({ cloud: '"cu"', daDongBo: '"cu"', trenMay: '"cu"' })).toBe('bo-qua');
        expect(q({ cloud: '"x"', daDongBo: '"cu"', trenMay: '"x"' })).toBe('bo-qua');
    });
    it('máy này đang có sửa chưa đẩy → giữ bản máy (mới hơn, sắp đẩy)', () => {
        expect(q({ cloud: '"may-khac"', daDongBo: '"cu"', trenMay: '"may-nay-sua"' })).toBe('giu-may');
    });
    it('chưa từng đồng bộ khoá này → áp bản Cloud', () => {
        expect(q({ cloud: '"c"', daDongBo: undefined, trenMay: '[]' })).toBe('ap');
    });
});
