import { describe, it, expect } from 'vitest';
import { InteractedUser, LineAdmin } from '../../features/line-bot/types/lineBot.types';

describe('Interacted Users & Admin Selection Logic', () => {
    it('properly identifies existing admins from interacted user list', () => {
        const existingAdmins: LineAdmin[] = [
            {
                id: 'admin_1',
                lineUserId: 'U11111111111111111111111111111111',
                name: 'Sơn Admin',
                role: 'SUPER_ADMIN',
                active: true,
                createdAt: '2026-09-19T10:00:00Z',
                updatedAt: '2026-09-19T10:00:00Z'
            }
        ];

        const interactedUsers: InteractedUser[] = [
            {
                id: 'U11111111111111111111111111111111',
                lineUserId: 'U11111111111111111111111111111111',
                displayName: 'Sơn Admin',
                lastInteractionType: 'DIRECT',
                lastInteractedAt: '2026-09-20T10:00:00Z'
            },
            {
                id: 'U22222222222222222222222222222222',
                lineUserId: 'U22222222222222222222222222222222',
                displayName: 'Tuấn Quản Lý',
                lastInteractionType: 'GROUP',
                lastGroupName: 'Nhóm QL Miền Tây',
                lastInteractedAt: '2026-09-20T11:00:00Z'
            }
        ];

        const adminMap = new Map(existingAdmins.map(a => [a.lineUserId, a]));

        expect(adminMap.has(interactedUsers[0].lineUserId)).toBe(true);
        expect(adminMap.get(interactedUsers[0].lineUserId)?.role).toBe('SUPER_ADMIN');

        expect(adminMap.has(interactedUsers[1].lineUserId)).toBe(false);
    });

    it('filters interacted users by search keyword across name, ID, group, and message', () => {
        const users: InteractedUser[] = [
            {
                id: 'U1',
                lineUserId: 'U12345678901234567890123456789012',
                displayName: 'Trường Sơn',
                lastInteractionType: 'DIRECT',
                lastMessage: 'tk event',
                lastInteractedAt: '2026-09-20T10:00:00Z'
            },
            {
                id: 'U2',
                lineUserId: 'U98765432109876543210987654321098',
                displayName: 'Bảo Long',
                lastInteractionType: 'GROUP',
                lastGroupName: 'Kho 910 Rạch Giá',
                lastMessage: 'xin mã',
                lastInteractedAt: '2026-09-20T11:00:00Z'
            }
        ];

        const search = (term: string) => {
            const t = term.toLowerCase();
            return users.filter(u =>
                u.displayName.toLowerCase().includes(t) ||
                u.lineUserId.toLowerCase().includes(t) ||
                (u.lastGroupName || '').toLowerCase().includes(t) ||
                (u.lastMessage || '').toLowerCase().includes(t)
            );
        };

        expect(search('sơn').length).toBe(1);
        expect(search('910').length).toBe(1);
        expect(search('987654').length).toBe(1);
        expect(search('tk').length).toBe(1);
        expect(search('khong_ton_tai').length).toBe(0);
    });

    it('manages filterUserNames list: checks inclusion, toggles, and handles batch additions', () => {
        const filterNames = ['STR_ Trường_21453-TC', 'Str_Tuấn_22094-TC'];
        const filterSet = new Set(filterNames.map(n => n.trim().toLowerCase()));

        const isNameInFilter = (name: string) => filterSet.has(name.trim().toLowerCase());

        expect(isNameInFilter('STR_ Trường_21453-TC')).toBe(true);
        expect(isNameInFilter('str_ trường_21453-tc')).toBe(true); // case-insensitive
        expect(isNameInFilter('STR_BOSS SƠN_21707')).toBe(false);

        // Batch add new names
        const namesToAdd = ['STR_BOSS SƠN_21707', 'STR_ Trường_21453-TC', 'Lê Sơn'];
        const updated = [...filterNames];
        for (const n of namesToAdd) {
            const trimmed = n.trim();
            if (trimmed && !updated.some(existing => existing.toLowerCase() === trimmed.toLowerCase())) {
                updated.push(trimmed);
            }
        }

        expect(updated.length).toBe(4);
        expect(updated).toContain('STR_BOSS SƠN_21707');
        expect(updated).toContain('Lê Sơn');
    });
});

