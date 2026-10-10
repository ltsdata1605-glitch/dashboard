import { beforeEach, describe, expect, it, vi } from 'vitest';
import rht from 'react-hot-toast';
import { toast, getToastMeta, TOAST_DURATION, type ToastMeta } from './toast';

vi.mock('react-hot-toast', () => {
    const base = vi.fn(() => 'id-blank');
    return {
        default: Object.assign(base, {
            success: vi.fn(() => 'id-success'),
            error: vi.fn(() => 'id-error'),
            loading: vi.fn(() => 'id-loading'),
            custom: vi.fn(() => 'id-custom'),
            dismiss: vi.fn(),
            remove: vi.fn(),
            promise: vi.fn(),
        }),
    };
});

type Opts = { duration?: number; icon?: unknown; ycx: ToastMeta; ariaProps?: { role: string }; id?: string };
const m = rht as unknown as ReturnType<typeof vi.fn> & Record<'success' | 'error' | 'loading' | 'custom' | 'dismiss' | 'remove', ReturnType<typeof vi.fn>>;
const optsOf = (fn: ReturnType<typeof vi.fn>, call = 0) => fn.mock.calls[call][1] as Opts;

describe('toast dùng chung — tương thích react-hot-toast + phần mở rộng', () => {
    beforeEach(() => vi.clearAllMocks());

    it('toast(msg) = loại info, 3 giây, đi qua toast "blank" của thư viện', () => {
        expect(toast('Xin chào')).toBe('id-blank');
        const o = optsOf(m);
        expect(o.ycx.kind).toBe('info');
        expect(o.duration).toBe(TOAST_DURATION.info);
    });

    it('success/error/loading gọi đúng hàm thư viện với thời gian mặc định của dự án', () => {
        toast.success('ok');
        toast.error('hỏng');
        toast.loading('đang tải');
        expect(optsOf(m.success).duration).toBe(2500);
        expect(optsOf(m.error).duration).toBe(6000);
        expect(optsOf(m.error).ariaProps?.role).toBe('alert');
        expect(optsOf(m.loading).duration).toBe(Infinity);
    });

    it('giữ nguyên duration và id của lời gọi cũ', () => {
        toast.error('hỏng', { duration: 8000, id: 'x' });
        expect(optsOf(m.error).duration).toBe(8000);
        expect(optsOf(m.error).id).toBe('x');
    });

    it('warning là toast "blank" mang loại warning, 5 giây', () => {
        toast.warning('cẩn thận');
        expect(optsOf(m).ycx.kind).toBe('warning');
        expect(optsOf(m).duration).toBe(5000);
    });

    it('icon emoji kiểu cũ quy đổi sang icon chuẩn; tên icon giữ nguyên; emoji lạ bỏ qua', () => {
        toast('a', { icon: 'ℹ️' });
        toast('b', { icon: '☁️' });
        toast('c', { icon: 'cloud' });
        toast('d', { icon: '🦄' });
        expect(optsOf(m, 0).ycx.iconName).toBe('info');
        expect(optsOf(m, 0).icon).toBeUndefined();
        expect(optsOf(m, 1).ycx.iconName).toBe('cloud');
        expect(optsOf(m, 2).ycx.iconName).toBe('cloud');
        expect(optsOf(m, 3).ycx.iconName).toBeUndefined();
    });

    it('icon là phần tử React thì giữ nguyên (không quy đổi)', () => {
        const el = { type: 'span', props: {} };
        toast.success('ok', { icon: el as never });
        expect(optsOf(m.success).icon).toBe(el);
    });

    it('có nút bấm → mặc định không tự tắt', () => {
        const onClick = vi.fn();
        toast('Ảnh đã sẵn sàng', { actions: [{ label: 'Chia sẻ', onClick }] });
        expect(optsOf(m).duration).toBe(Infinity);
        expect(optsOf(m).ycx.actions?.[0].label).toBe('Chia sẻ');
    });

    it('toast.action: tiêu đề + mô tả + nút, đúng loại', () => {
        toast.action({ title: 'Dữ liệu đám mây mới', description: '945 dòng', kind: 'success', actions: [{ label: 'Nạp', onClick: () => undefined }] });
        expect(m.success.mock.calls[0][0]).toBe('Dữ liệu đám mây mới');
        const o = optsOf(m.success);
        expect(o.ycx.description).toBe('945 dòng');
        expect(o.duration).toBe(Infinity);
    });

    it('cập nhật toast cùng id: phần mở rộng cũ không bị "dính" sang (thư viện gộp object khi trùng id)', () => {
        toast.loading('Đang lưu…', { id: 'luu', description: 'cũ', actions: [{ label: 'Huỷ', onClick: () => undefined }] });
        toast.success('Đã lưu', { id: 'luu' });
        const o = optsOf(m.success);
        expect('description' in o.ycx).toBe(true);
        expect(o.ycx.description).toBeUndefined();
        expect(o.ycx.actions).toBeUndefined();
    });

    it('getToastMeta suy loại từ type khi toast không đi qua bộ bọc (vd bên trong promise)', () => {
        expect(getToastMeta({ type: 'success' } as never).kind).toBe('success');
        expect(getToastMeta({ type: 'blank' } as never).kind).toBe('info');
        expect(getToastMeta({ type: 'loading' } as never).kind).toBe('loading');
    });

    it('dismiss/remove chuyển tiếp id', () => {
        toast.dismiss('abc');
        toast.remove('def');
        toast.dismissAll();
        expect(m.dismiss).toHaveBeenCalledWith('abc');
        expect(m.remove).toHaveBeenCalledWith('def');
        expect(m.dismiss.mock.calls.at(-1)).toEqual([]); // dismissAll = dismiss() không id → tắt hết
    });
});
