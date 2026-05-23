import { useState, useEffect, useCallback, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { getValue, setValue } from '../services/dbService';

export const COLS = {
    KENH: 3,
    SIÊU_THỊ: 4,
    NGANH_HANG: 5,
    PERCENT_DU_KIEN: 6,
    DU_KIEN_VUOT: 7,
    LAY_TOP_10: 8,
    HANG_VUOT_Uu: 9,
    HANG_PERCENT_TARGET: 10,
    THUONG_VUOT_Uu: 11,
    THUONG_TOP_PERCENT: 12,
    TONG_THUONG: 13
};

const EXPECTED_HEADERS = ['siêu thị', 'ngành hàng', 'thưởng'];

export const parseNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    // Remove any dots/commas unless it's a decimal
    let str = String(val).trim();
    if (str.includes(',')) {
        if (str.split(',').length > 2 || str.match(/,\d{3}$/)) {
            str = str.replace(/,/g, '');
        } else {
            str = str.replace(/,/g, '.');
        }
    } else if (str.includes('.')) {
        if (str.split('.').length > 2 || str.match(/\.\d{3}$/)) {
            str = str.replace(/\./g, '');
        }
    }
    return parseFloat(str) || 0;
};

export const formatCurrencySimple = (value: any): string => {
    const num = parseNumber(value);
    if (!num || num === 0) return '0';
    const absVal = Math.abs(num);
    if (absVal >= 1000000) {
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(num / 1000000) + 'tr';
    } else if (absVal >= 1000) {
        return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(num / 1000) + 'k';
    }
    return new Intl.NumberFormat('vi-VN').format(num);
};

export const formatCurrencyFull = (value: any): string => {
    const num = parseNumber(value);
    return new Intl.NumberFormat('vi-VN').format(Math.floor(num));
};

export const formatNumber = (value: any): string => {
    const num = parseNumber(value);
    return (num > 0 ? Math.floor(num) : Math.ceil(num)).toLocaleString('vi-VN');
};

export const formatPercent = (value: any): string => {
    return Math.floor(parseNumber(value) * 100) + '%';
};

export function validateDataStructure(headerRow: any[]): boolean {
    if (!headerRow) return false;
    const headerString = headerRow.join(',').toLowerCase();
    return EXPECTED_HEADERS.every(header => headerString.includes(header));
}

export const isMatchStore = (row: any[], targetCode: string): boolean => {
    if (!row[COLS.NGANH_HANG] || String(row[COLS.NGANH_HANG]).trim() === '') return false;
    const storeStr = String(row[COLS.SIÊU_THỊ] || '').trim().toLowerCase();
    const searchCode = String(targetCode).trim().toLowerCase();
    if (!searchCode) return false;
    if (storeStr === searchCode) return true;
    const codeMatch = storeStr.match(/^(\d+)/);
    if (codeMatch && codeMatch[1] === searchCode) return true;
    try {
        const escapedCode = searchCode.replace(/[-/\\^\$*+?.()|[\]{}]/g, '\\$&');
        const regex = new RegExp(`(^|[^a-zA-Z0-9])${escapedCode}([^a-zA-Z0-9]|$)`, 'i');
        if (regex.test(storeStr)) return true;
    } catch (e) {}
    if (!/^\d+$/.test(searchCode) && storeStr.includes(searchCode)) return true;
    return false;
};

export interface CheckThuongState {
    competitionData: any[][];
    fileName: string;
    uploadTime: string | null;
    code1: string;
    code2: string;
    singleViewMode: 'list' | 'card';
}

export const useCheckThuongData = () => {
    const [competitionData, setCompetitionData] = useState<any[][]>([]);
    const [fileName, setFileName] = useState<string>('');
    const [uploadTime, setUploadTime] = useState<string | null>(null);
    const [code1, setCode1] = useState<string>('910');
    const [code2, setCode2] = useState<string>('');
    const [singleViewMode, setSingleViewMode] = useState<'list' | 'card'>('list');
    const [error, setError] = useState<string | null>(null);
    const [isLoaded, setIsLoaded] = useState<boolean>(false);

    const dbKey = 'bi_checkthuong_data';

    // Save state helper
    const saveState = useCallback((
        data: any[][],
        name: string,
        time: string | null,
        c1: string,
        c2: string,
        mode: 'list' | 'card'
    ) => {
        if (data && data.length > 0) {
            setValue(dbKey, {
                competitionData: data,
                fileName: name.replace('Đã tải: ', '').replace(' (từ bộ nhớ tạm)', ''),
                uploadTime: time,
                code1: c1,
                code2: c2,
                singleViewMode: mode
            }).catch(e => console.warn('IDB Save Error:', e));
        }
    }, []);

    // Load saved state on init
    useEffect(() => {
        getValue<CheckThuongState>(dbKey).then(savedData => {
            if (savedData) {
                if (savedData.code1) setCode1(savedData.code1);
                if (savedData.code2) setCode2(savedData.code2);
                if (savedData.singleViewMode) setSingleViewMode(savedData.singleViewMode);
                if (savedData.competitionData && savedData.competitionData.length > 0) {
                    setCompetitionData(savedData.competitionData);
                    setUploadTime(savedData.uploadTime);
                    setFileName(savedData.fileName || 'file_cu.xlsx');
                }
            }
            setIsLoaded(true);
        }).catch(e => {
            console.error('Failed to load check thuong state:', e);
            setIsLoaded(true);
        });
    }, []);

    // Sync input changes to database
    useEffect(() => {
        if (isLoaded && competitionData.length > 0) {
            saveState(competitionData, fileName, uploadTime, code1, code2, singleViewMode);
        }
    }, [code1, code2, singleViewMode, competitionData, fileName, uploadTime, isLoaded, saveState]);

    const changeFile = useCallback(() => {
        setCompetitionData([]);
        setFileName('');
        setUploadTime(null);
        setCode1('910');
        setCode2('');
        setValue(dbKey, null).catch(e => console.warn('IDB Clear Error:', e));
    }, []);

    const handleFileSelect = useCallback(async (file: File) => {
        setError(null);
        const time = new Date().toISOString();
        setUploadTime(time);
        
        return new Promise<void>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
                    let dataArray: any[][];
                    
                    if (isExcel) {
                        const arrayBuffer = e.target?.result as ArrayBuffer;
                        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                        const sheetName = workbook.SheetNames[0];
                        const sheet = workbook.Sheets[sheetName];
                        
                        // Force range to start at A1 to preserve exact column indices
                        if (sheet['!ref']) {
                            const range = XLSX.utils.decode_range(sheet['!ref']);
                            range.s.c = 0; // Start at column A
                            sheet['!ref'] = XLSX.utils.encode_range(range);
                        }
                        dataArray = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: "" });
                    } else { // Handle CSV and other text files
                        const textContent = e.target?.result as string;
                        const rows = textContent.split(/\r\n|\n|\r/);
                        let delimiter = ',';
                        const sampleRow = rows.length > 2 ? rows[2] : (rows[0] || '');
                        if (sampleRow.includes('\t')) delimiter = '\t';
                        else if (sampleRow.includes(';')) delimiter = ';';
                        dataArray = rows.map(row => row.split(delimiter));
                    }

                    let headerRowIndex = -1;
                    for (let i = 0; i < Math.min(10, dataArray.length); i++) {
                        if (validateDataStructure(dataArray[i])) {
                            headerRowIndex = i;
                            break;
                        }
                    }

                    if (headerRowIndex === -1) {
                        console.warn("Không tìm thấy dòng tiêu đề chuẩn. Sẽ đọc toàn bộ dữ liệu.");
                    }

                    const dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
                    const parsedData = dataArray.slice(dataStartIndex).filter(row => 
                        row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== '')
                    );

                    if (parsedData.length === 0) {
                        throw new Error("File không có dữ liệu hợp lệ.");
                    }

                    setCompetitionData(parsedData);
                    setFileName(file.name);
                    saveState(parsedData, file.name, time, code1, code2, singleViewMode);
                    resolve();
                } catch (err: any) {
                    const message = err instanceof Error ? err.message : String(err);
                    setError(message);
                    reject(err);
                }
            };

            reader.onerror = () => {
                setError('Không thể đọc file đã chọn.');
                reject(new Error('File reading failed.'));
            };

            const fileExtension = file.name.split('.').pop()?.toLowerCase();
            if (fileExtension && ['xlsx', 'xls'].includes(fileExtension)) {
                reader.readAsArrayBuffer(file);
            } else {
                reader.readAsText(file, 'UTF-8');
            }
        });
    }, [code1, code2, singleViewMode, saveState]);

    // Computed states
    const fundStatusByGroup = useMemo(() => {
        const status: Record<string, boolean> = {};
        competitionData.forEach(row => {
            const nganhHang = row[COLS.NGANH_HANG];
            const kenh = row[COLS.KENH] || 'N/A';
            if (!nganhHang) return;
            const key = `${kenh}|${nganhHang}`;
            if (parseNumber(row[COLS.TONG_THUONG]) > 0) {
                status[key] = true;
            }
        });
        return status;
    }, [competitionData]);

    const noFundGroups = useMemo(() => {
        const allGroups = new Set(competitionData.map(row => {
            if (!row[COLS.NGANH_HANG]) return null;
            return `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
        }).filter(Boolean) as string[]);
        
        return new Set([...allGroups].filter(group => !fundStatusByGroup[group]));
    }, [competitionData, fundStatusByGroup]);

    const bottom50MedianMap = useMemo(() => {
        const groups: Record<string, number[]> = {};
        competitionData.forEach(row => {
            const key = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG] || 'N/A'}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(parseNumber(row[COLS.PERCENT_DU_KIEN]));
        });

        const medianMap: Record<string, number> = {};
        for (const key in groups) {
            const percentages = groups[key].sort((a, b) => a - b);
            const mid = Math.floor(percentages.length / 2);
            medianMap[key] = percentages.length % 2 !== 0 
                ? percentages[mid] 
                : (percentages[mid - 1] + percentages[mid]) / 2;
        }
        return medianMap;
    }, [competitionData]);

    const getPotentialBonus = useCallback((row: any[]) => {
        try {
            const groupName = row[COLS.NGANH_HANG];
            const groupChannel = row[COLS.KENH];
            
            const awardedCompetitors = competitionData.filter(r => 
                r[COLS.NGANH_HANG] === groupName && 
                r[COLS.KENH] === groupChannel &&
                parseNumber(r[COLS.TONG_THUONG]) > 0
            );

            if (awardedCompetitors.length === 0) {
                return { vuot: 0, top: 0 };
            }

            const lastAwarded = awardedCompetitors.reduce((last, current) => {
                const lastRank = parseInt(last[COLS.HANG_PERCENT_TARGET], 10) || 0;
                const currentRank = parseInt(current[COLS.HANG_PERCENT_TARGET], 10) || 0;
                return currentRank > lastRank ? current : last;
            });
            
            return {
                vuot: parseNumber(lastAwarded[COLS.THUONG_VUOT_Uu]),
                top: parseNumber(lastAwarded[COLS.THUONG_TOP_PERCENT]),
            };
        } catch (e) {
            console.error("Error calculating potential bonus:", e);
            return { vuot: 0, top: 0 };
        }
    }, [competitionData]);

    const getGroupDefinitions = useCallback((data: any[][]) => {
        return [
            { 
                key: 'achieved', 
                title: 'Đạt thưởng', 
                color: 'bg-emerald-600 dark:bg-emerald-500', 
                data: data.filter(row => parseNumber(row[COLS.TONG_THUONG]) > 0) 
            },
            { 
                key: 'nearly', 
                title: 'Sắp có', 
                color: 'bg-amber-500', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    if (noFundGroups.has(groupKey)) return false;
                    if (parseNumber(row[COLS.TONG_THUONG]) > 0) return false;
                    const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10);
                    if (isNaN(cutoffRank)) return false;
                    const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10);
                    const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10);
                    const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20;
                    const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20;
                    return isNearlyVuot || isNearlyTarget;
                }) 
            },
            { 
                key: 'achieved100', 
                title: 'Đạt 100%', 
                color: 'bg-teal-600 dark:bg-teal-500', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    if (noFundGroups.has(groupKey)) return false;
                    return parseNumber(row[COLS.PERCENT_DU_KIEN]) >= 1;
                }) 
            },
            { 
                key: 'notAchieved100', 
                title: '<100%', 
                color: 'bg-orange-500', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    if (noFundGroups.has(groupKey)) return false;
                    return parseNumber(row[COLS.PERCENT_DU_KIEN]) < 1;
                }) 
            },
            { 
                key: 'bottom50', 
                title: 'Bottom 50%', 
                color: 'bg-rose-600 dark:bg-rose-500', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    if (noFundGroups.has(groupKey)) return false;
                    const key = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG] || 'N/A'}`;
                    const median = bottom50MedianMap[key];
                    return median !== undefined && parseNumber(row[COLS.PERCENT_DU_KIEN]) <= median;
                }) 
            },
            { 
                key: 'noFund', 
                title: 'Không Quỹ', 
                color: 'bg-violet-600 dark:bg-violet-500', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    return noFundGroups.has(groupKey);
                }) 
            },
            { 
                key: 'noSale', 
                title: 'No Sale', 
                color: 'bg-slate-500 dark:bg-slate-400', 
                data: data.filter(row => {
                    const groupKey = `${row[COLS.KENH] || 'N/A'}|${row[COLS.NGANH_HANG]}`;
                    if (noFundGroups.has(groupKey)) return false;
                    return parseNumber(row[COLS.PERCENT_DU_KIEN]) === 0;
                }) 
            }
        ];
    }, [noFundGroups, bottom50MedianMap]);

    // Data for store 1
    const store1Data = useMemo(() => {
        if (!code1) return [];
        return competitionData.filter(row => isMatchStore(row, code1));
    }, [competitionData, code1]);

    // Data for store 2
    const store2Data = useMemo(() => {
        if (!code2) return [];
        return competitionData.filter(row => isMatchStore(row, code2));
    }, [competitionData, code2]);

    const stats1 = useMemo(() => {
        if (store1Data.length === 0) return null;
        const definitions = getGroupDefinitions(store1Data);
        return {
            totalBonus: store1Data.reduce((sum, row) => sum + parseNumber(row[COLS.TONG_THUONG]), 0),
            achieved: definitions.find(d => d.key === 'achieved')?.data.length || 0,
            nearly: definitions.find(d => d.key === 'nearly')?.data.length || 0,
            bottom50: definitions.find(d => d.key === 'bottom50')?.data.length || 0,
            noSale: definitions.find(d => d.key === 'noSale')?.data.length || 0,
        };
    }, [store1Data, getGroupDefinitions]);

    const stats2 = useMemo(() => {
        if (store2Data.length === 0) return null;
        const definitions = getGroupDefinitions(store2Data);
        return {
            totalBonus: store2Data.reduce((sum, row) => sum + parseNumber(row[COLS.TONG_THUONG]), 0),
            achieved: definitions.find(d => d.key === 'achieved')?.data.length || 0,
            nearly: definitions.find(d => d.key === 'nearly')?.data.length || 0,
            bottom50: definitions.find(d => d.key === 'bottom50')?.data.length || 0,
            noSale: definitions.find(d => d.key === 'noSale')?.data.length || 0,
        };
    }, [store2Data, getGroupDefinitions]);

    const allCategories = useMemo(() => {
        return [...new Set([...store1Data.map(r => r[COLS.NGANH_HANG]), ...store2Data.map(r => r[COLS.NGANH_HANG])])].filter(Boolean) as string[];
    }, [store1Data, store2Data]);

    const comparisonData = useMemo(() => {
        if (!code2 || store1Data.length === 0 || store2Data.length === 0) return [];
        
        return allCategories.map(category => {
            const row1 = store1Data.find(r => r[COLS.NGANH_HANG] === category);
            const row2 = store2Data.find(r => r[COLS.NGANH_HANG] === category);
            const bonus1 = parseNumber(row1?.[COLS.TONG_THUONG]);
            const bonus2 = parseNumber(row2?.[COLS.TONG_THUONG]);
            return {
                category,
                row1,
                row2,
                percent1: parseNumber(row1?.[COLS.PERCENT_DU_KIEN]),
                percent2: parseNumber(row2?.[COLS.PERCENT_DU_KIEN]),
                rankV1: parseInt(row1?.[COLS.HANG_VUOT_Uu], 10) || Infinity,
                rankV2: parseInt(row2?.[COLS.HANG_VUOT_Uu], 10) || Infinity,
                bonus1,
                bonus2,
                bonusDiff: bonus1 - bonus2
            };
        });
    }, [allCategories, store1Data, store2Data, code2]);

    return {
        competitionData,
        fileName,
        uploadTime,
        code1,
        code2,
        singleViewMode,
        error,
        isLoaded,
        setCode1,
        setCode2,
        setSingleViewMode,
        handleFileSelect,
        changeFile,
        noFundGroups,
        bottom50MedianMap,
        getPotentialBonus,
        getGroupDefinitions,
        store1Data,
        store2Data,
        stats1,
        stats2,
        comparisonData,
        allCategories
    };
};
