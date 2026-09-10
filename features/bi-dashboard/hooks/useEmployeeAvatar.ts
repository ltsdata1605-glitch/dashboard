import { useState, useEffect, useCallback, useMemo } from 'react';
import { useIndexedDBState } from './useIndexedDBState';
import { standardizeEmployeeName, extractEmployeeId, isSameEmployee } from '../utils/nhanVienHelpers';
import * as db from '../utils/db';

export interface UseEmployeeAvatarOptions {
    employeeName?: string;
    originalName?: string;
    fallbackEmployees?: Array<{ name?: string; originalName?: string }>;
}

/**
 * Hook tìm và quản lý Avatar nhân viên thông minh:
 * - Tìm theo tên gốc, tên chuẩn hóa
 * - Tìm theo mã nhân viên (Employee ID)
 * - Tự động đối soát chéo với danh sách nhân viên (fallbackEmployees) từ doanh thu/thưởng
 * - Quét tìm kiếm theo mã số nhân viên trong IndexedDB nếu key trực tiếp khác tên
 * - Hỗ trợ hàm nén và cập nhật avatar đồng bộ cho mọi bảng
 */
export function useEmployeeAvatar(options: UseEmployeeAvatarOptions | string) {
    const { employeeName, originalName, fallbackEmployees } = useMemo(() => {
        if (typeof options === 'string') {
            return { employeeName: options, originalName: options, fallbackEmployees: [] };
        }
        return {
            employeeName: options.employeeName || options.originalName || '',
            originalName: options.originalName || options.employeeName || '',
            fallbackEmployees: options.fallbackEmployees || []
        };
    }, [options]);

    const primaryKey = `avatar-${originalName || employeeName}`;
    const [directSrc, setDirectSrc] = useIndexedDBState<string | null>(primaryKey, null);
    const [fallbackSrc, setFallbackSrc] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const empId = useMemo(() => {
        return extractEmployeeId(originalName) || extractEmployeeId(employeeName);
    }, [originalName, employeeName]);

    // Tìm kiếm avatar từ các nguồn biến thể khác nhau
    useEffect(() => {
        if (directSrc) {
            setFallbackSrc(null);
            return;
        }

        if (!employeeName && !originalName) return;

        let isMounted = true;
        setIsLoading(true);

        (async () => {
            try {
                // 1. Thu thập tất cả các candidate keys khả dĩ
                const candidateKeys: string[] = [];
                const addKey = (k?: string) => {
                    if (k && !candidateKeys.includes(`avatar-${k}`)) {
                        candidateKeys.push(`avatar-${k}`);
                    }
                };

                addKey(originalName);
                addKey(standardizeEmployeeName(originalName));
                addKey(employeeName);
                addKey(standardizeEmployeeName(employeeName));

                // Thử các biến thể đảo chiều "106637 - V.Minh" <-> "V.Minh - 106637"
                const checkVariants = (str?: string) => {
                    if (!str || !str.includes(' - ')) return;
                    const parts = str.split(' - ').map(p => p.trim());
                    if (parts.length >= 2) {
                        addKey(`${parts[1]} - ${parts[0]}`);
                        addKey(parts[0]);
                        addKey(parts[1]);
                    }
                };
                checkVariants(originalName);
                checkVariants(employeeName);

                // Thêm theo Employee ID trực tiếp
                if (empId) {
                    addKey(empId);
                }

                // Tìm trong danh sách fallbackEmployees (từ sheet Doanh thu/Thưởng) xem ai trùng ID hoặc tên
                if (fallbackEmployees && fallbackEmployees.length > 0) {
                    for (const fEmp of fallbackEmployees) {
                        const fOrig = fEmp.originalName || '';
                        const fName = fEmp.name || '';
                        if (
                            (empId && (extractEmployeeId(fOrig) === empId || extractEmployeeId(fName) === empId)) ||
                            isSameEmployee(fOrig, originalName) ||
                            isSameEmployee(fName, employeeName)
                        ) {
                            addKey(fOrig);
                            addKey(standardizeEmployeeName(fOrig));
                            addKey(fName);
                            addKey(standardizeEmployeeName(fName));
                            checkVariants(fOrig);
                            checkVariants(fName);
                        }
                    }
                }

                // 2. Thử truy vấn các candidate keys
                for (const k of candidateKeys) {
                    const val = await db.get<string>(k as any);
                    if (val && isMounted) {
                        setFallbackSrc(val);
                        setIsLoading(false);
                        // Tự động cache lại cho key chính và empId để lần sau load O(1) tức thì
                        if (primaryKey && primaryKey !== k) {
                            await db.set(primaryKey as any, val);
                        }
                        if (empId) {
                            await db.set(`avatar-${empId}` as any, val);
                        }
                        return;
                    }
                }

                // 3. Nếu vẫn chưa thấy và có empId hợp lệ (>= 3 ký tự số):
                // Quét IndexedDB tìm key avatar nào có chứa empId này
                if (empId && empId.length >= 3) {
                    const allItems = await db.getAll();
                    for (const item of allItems) {
                        if (item.key.startsWith('avatar-')) {
                            const keyContent = item.key.slice('avatar-'.length);
                            const itemEmpId = extractEmployeeId(keyContent);
                            if (itemEmpId === empId || keyContent.includes(empId)) {
                                const val = item.value as string;
                                if (val && isMounted) {
                                    setFallbackSrc(val);
                                    setIsLoading(false);
                                    // Cache lại cho key hiện tại
                                    await db.set(primaryKey as any, val);
                                    await db.set(`avatar-${empId}` as any, val);
                                    return;
                                }
                            }
                        }
                    }
                }
            } catch (err) {
                console.warn('[useEmployeeAvatar] Lỗi tra cứu avatar:', err);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [directSrc, originalName, employeeName, empId, fallbackEmployees, primaryKey]);

    // Nén ảnh bằng HTML5 Canvas và lưu vào IndexedDB
    const uploadAvatar = useCallback(async (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = reject;
            reader.onloadend = () => {
                const img = new Image();
                img.onerror = reject;
                img.onload = async () => {
                    const canvas = document.createElement('canvas');
                    const MAX_DIMENSION = 160;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_DIMENSION) {
                            height = Math.round(height * (MAX_DIMENSION / width));
                            width = MAX_DIMENSION;
                        }
                    } else {
                        if (height > MAX_DIMENSION) {
                            width = Math.round(width * (MAX_DIMENSION / height));
                            height = MAX_DIMENSION;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Canvas context không khả dụng'));
                        return;
                    }

                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/webp', 0.85);

                    // Lưu vào key chính của view hiện tại
                    await setDirectSrc(compressedBase64);

                    // Đồng thời lưu vào các biến thể để các tab khác (Doanh thu, Thưởng, Thi đua) đều đọc được ngay
                    const keysToSync = new Set<string>();
                    if (originalName) {
                        keysToSync.add(`avatar-${originalName}`);
                        keysToSync.add(`avatar-${standardizeEmployeeName(originalName)}`);
                    }
                    if (employeeName) {
                        keysToSync.add(`avatar-${employeeName}`);
                        keysToSync.add(`avatar-${standardizeEmployeeName(employeeName)}`);
                    }
                    if (empId) {
                        keysToSync.add(`avatar-${empId}`);
                    }
                    if (fallbackEmployees) {
                        for (const fEmp of fallbackEmployees) {
                            if (
                                (empId && (extractEmployeeId(fEmp.originalName || '') === empId || extractEmployeeId(fEmp.name || '') === empId)) ||
                                isSameEmployee(fEmp.originalName, originalName)
                            ) {
                                if (fEmp.originalName) {
                                    keysToSync.add(`avatar-${fEmp.originalName}`);
                                    keysToSync.add(`avatar-${standardizeEmployeeName(fEmp.originalName)}`);
                                }
                                if (fEmp.name) {
                                    keysToSync.add(`avatar-${fEmp.name}`);
                                    keysToSync.add(`avatar-${standardizeEmployeeName(fEmp.name)}`);
                                }
                            }
                        }
                    }

                    for (const k of keysToSync) {
                        try {
                            await db.set(k as any, compressedBase64);
                        } catch (e) {
                            // ignore
                        }
                    }

                    setFallbackSrc(null);
                    resolve(compressedBase64);
                };
                img.src = reader.result as string;
            };
            reader.readAsDataURL(file);
        });
    }, [originalName, employeeName, empId, fallbackEmployees, setDirectSrc]);

    return {
        avatarSrc: directSrc || fallbackSrc,
        isLoading,
        uploadAvatar
    };
}
