import React, { useState, useEffect } from 'react';
import { Settings, Save, Plus, Trash2, CheckCircle2, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button } from '../../../components/shared/ui/Button';
import type { GroupFeatureConfig, LineGroup } from '../types/lineBot.types';
import { lineBotFirestoreService } from '../services/lineBotFirestoreService';

interface GroupFeaturesTabProps {
    userId: string;
    groups: LineGroup[];
}

type FeatureKey = keyof GroupFeatureConfig['features'];

const FEATURE_LIST: Array<{ key: FeatureKey; label: string; description: string }> = [
    { key: 'filterCoupon', label: 'Lọc PMH', description: 'Tự động lọc mã coupon khi paste danh sách + lệnh "loc csd"' },
    { key: 'issueCoupon', label: 'Cấp mã PMH', description: 'Form xin PMH và lệnh lấy mã nhanh (e1, gv2, số trần)' },
    { key: 'syntax_tk', label: 'Cú pháp "tk"', description: 'Lệnh thống kê tồn kho (tk, tk event, tk gvgs)' },
    { key: 'syntax_cancel', label: 'Cú pháp "huy"', description: 'Lệnh huỷ/thu hồi mã coupon' },
    { key: 'syntax_search', label: 'Tra cứu mã', description: 'Dán 1 mã coupon vào chat để xem đã dùng hay chưa' },
    { key: 'keywordReply', label: 'Trả lời Keyword', description: 'Tự động trả lời theo keyword được cấu hình' },
    { key: 'autoReply', label: 'Tin nhắn tự động', description: 'Các tin nhắn tự động khác (hướng dẫn, v.v.)' }
];

export const GroupFeaturesTab: React.FC<GroupFeaturesTabProps> = ({ userId, groups }) => {
    const [configs, setConfigs] = useState<GroupFeatureConfig[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadConfigs();
    }, [userId]);

    // Auto-add config vào state khi chọn nhóm mới (để toggle hoạt động)
    useEffect(() => {
        if (!selectedGroupId) return;
        const existing = configs.find(c => c.groupId === selectedGroupId);
        if (!existing) {
            const group = groups.find(g => g.groupId === selectedGroupId);
            const newConfig: GroupFeatureConfig = {
                id: `${userId}_${selectedGroupId}`,
                userId,
                groupId: selectedGroupId,
                groupName: group?.groupName,
                features: {
                    filterCoupon: true,
                    issueCoupon: true,
                    syntax_tk: true,
                    syntax_cancel: true,
                    syntax_search: true,
                    keywordReply: true,
                    autoReply: true
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            setConfigs(prev => [...prev, newConfig]);
        }
    }, [selectedGroupId, configs, userId, groups]);

    const loadConfigs = async () => {
        try {
            setIsLoading(true);
            const data = await lineBotFirestoreService.getGroupFeatureConfigs(userId);
            setConfigs(data);
            if (data.length === 0 && groups.length > 0) {
                setSelectedGroupId(groups[0].groupId);
            } else if (data.length > 0) {
                setSelectedGroupId(data[0].groupId);
            }
        } catch (error) {
            console.error('Lỗi tải cấu hình nhóm:', error);
            toast.error('Không thể tải cấu hình nhóm');
        } finally {
            setIsLoading(false);
        }
    };

    const getOrCreateConfig = (groupId: string): GroupFeatureConfig => {
        const existing = configs.find(c => c.groupId === groupId);
        if (existing) return existing;
        
        const group = groups.find(g => g.groupId === groupId);
        return {
            id: `${userId}_${groupId}`,
            userId,
            groupId,
            groupName: group?.groupName,
            features: {
                filterCoupon: true,
                issueCoupon: true,
                syntax_tk: true,
                syntax_cancel: true,
                syntax_search: true,
                keywordReply: true,
                autoReply: true
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
    };

    const currentConfig = selectedGroupId ? getOrCreateConfig(selectedGroupId) : null;
    const currentGroup = groups.find(g => g.groupId === selectedGroupId);

    const handleToggleFeature = (featureKey: FeatureKey) => {
        if (!currentConfig) return;
        setConfigs(prev => prev.map(c => 
            c.groupId === currentConfig.groupId 
                ? { ...c, features: { ...c.features, [featureKey]: !c.features[featureKey] } }
                : c
        ));
    };

    const handleSave = async () => {
        if (!currentConfig) return;
        try {
            setIsSaving(true);
            await lineBotFirestoreService.saveGroupFeatureConfig(currentConfig);
            toast.success(`✅ Lưu cấu hình nhóm ${currentGroup?.groupName || 'này'} thành công`);
        } catch (error) {
            console.error('Lỗi lưu cấu hình:', error);
            toast.error('Không thể lưu cấu hình nhóm');
        } finally {
            setIsSaving(false);
        }
    };

    const handleReset = (groupId: string) => {
        setConfigs(prev => prev.filter(c => c.groupId !== groupId));
        toast.success('Đã reset cấu hình nhóm về mặc định');
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-slate-400">Đang tải cấu hình nhóm...</div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            {/* Group Selector */}
            <div className="p-4 bg-white dark:bg-slate-800/80 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center gap-2">
                    <Settings size={18} className="text-slate-600 dark:text-slate-400" />
                    <h3 className="font-bold text-slate-900 dark:text-white">Chọn Nhóm để Cấu Hình</h3>
                </div>
                <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                    <option value="">-- Chọn nhóm --</option>
                    {groups.map(group => (
                        <option key={group.groupId} value={group.groupId}>
                            {group.groupName} ({group.memberCount || 0} thành viên)
                        </option>
                    ))}
                </select>
            </div>

            {/* Feature Toggles */}
            {currentConfig && currentGroup && (
                <div className="space-y-3">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200 dark:border-emerald-900/40">
                        <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                            📌 Nhóm: <span className="font-bold">{currentGroup.groupName}</span>
                        </p>
                    </div>

                    <div className="grid gap-2">
                        {FEATURE_LIST.map(feature => (
                            <div
                                key={feature.key}
                                className="p-3.5 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl flex items-start justify-between gap-3"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                            {feature.label}
                                        </span>
                                        {currentConfig.features[feature.key] ? (
                                            <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        ) : (
                                            <XCircle size={16} className="text-slate-400 dark:text-slate-500 shrink-0" />
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                        {feature.description}
                                    </p>
                                </div>
                                <button
                                    onClick={() => handleToggleFeature(feature.key)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-all shrink-0 hover:shadow-sm ${
                                        currentConfig.features[feature.key]
                                            ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                                            : 'bg-slate-100 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/60'
                                    }`}
                                >
                                    {currentConfig.features[feature.key] ? 'BẬT' : 'TẮT'}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex-1 flex items-center justify-center gap-2"
                        >
                            <Save size={16} />
                            {isSaving ? 'Đang lưu...' : 'Lưu Cấu Hình'}
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={() => handleReset(currentConfig.groupId)}
                            className="px-4"
                        >
                            <Trash2 size={16} />
                        </Button>
                    </div>
                </div>
            )}

            {!selectedGroupId && (
                <div className="p-8 text-center text-slate-400">
                    <p className="text-sm">Chọn một nhóm để bắt đầu cấu hình</p>
                </div>
            )}
        </div>
    );
};
