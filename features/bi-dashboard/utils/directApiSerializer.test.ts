import { describe, it, expect } from 'vitest';
import { parseSummaryData, parseCompetitionDataBySupermarket, parseIndustryRealtimeData } from './dashboardHelpers';
import { parseRevenueData } from './nhanVienHelpers';

// Mô phỏng serializer
export function serializeSummaryRealtime(cardData: any, rowsData: any[]) {
    const revenueKfactor = Math.round(Number(cardData?.revenue_kfactor || 0));
    const targetKfactor = Math.round(Number(cardData?.target_kfactor || 0));
    const htTargetQD = targetKfactor > 0 
        ? ((Number(cardData?.revenue_kfactor_cum || cardData?.revenue_kfactor || 0) / targetKfactor) * 100).toFixed(1) + '%'
        : '0.0%';
    const avg3mKfactor = Number(cardData?.avg3month_kfactor || 0);
    const ttDiff = avg3mKfactor > 0 
        ? (((Number(cardData?.revenue_kfactor || 0) - avg3mKfactor) / avg3mKfactor) * 100).toFixed(1)
        : '0.0';
    const ttTb3t = ttDiff.startsWith('-') ? `${ttDiff}%` : `+${ttDiff}%`;
    const numdayCum = Number(cardData?.numday_cum || 0);
    const numdayMonth = Number(cardData?.numday_month || 30);
    const dtDuKien = numdayCum > 0 
        ? Math.round((Number(cardData?.revenue_kfactor_cum || cardData?.revenue_kfactor || 0) / numdayCum) * numdayMonth)
        : revenueKfactor;
    const visitors = Number(cardData?.svc_visitors || 0);
    const bills = Number(cardData?.svc_bills || 0);
    const tlpv = visitors > 0 ? ((bills / visitors) * 100).toFixed(1) + '%' : '0.0%';
    const revThuc = Number(cardData?.revenue || 0);
    const revTg = Number(cardData?.revenue_tragop || 0);
    const tyTrongTg = revThuc > 0 ? ((revTg / revThuc) * 100).toFixed(1) + '%' : '0.0%';

    const rowLines: string[] = [];
    let sumSl = 0, sumQd = 0, sumThuc = 0, sumTarget = 0, sumTb3t = 0, sumTg = 0;

    for (const row of rowsData) {
        const storeName = `${row.rowcode || ''} - ${row.rowname || ''}`.replace(/^[-\s]+/, '');
        const sl = Math.round(Number(row.quantity || 0));
        const qd = Math.round(Number(row.revenue_kfactor || 0));
        const thuc = Math.round(Number(row.revenue || 0));
        const target = Math.round(Number(row.target_kfactor || row.target || 0));
        const ht = target > 0 ? ((Number(row.revenue_kfactor_cum || row.revenue_kfactor || 0) / target) * 100).toFixed(1) + '%' : '0.0%';
        const tb3t = Math.round(Number(row.avg3month_kfactor || row.avg3month || 0));
        const rowTtDiff = tb3t > 0 ? (((Number(row.revenue_kfactor || 0) - tb3t) / tb3t) * 100).toFixed(1) : '0.0';
        const tt = rowTtDiff.startsWith('-') ? `${rowTtDiff}%` : `+${rowTtDiff}%`;
        const tg = Math.round(Number(row.revenue_tragop || 0));
        const pctTg = thuc > 0 ? ((tg / thuc) * 100).toFixed(1) + '%' : '0.0%';

        sumSl += sl; sumQd += qd; sumThuc += thuc; sumTarget += target; sumTb3t += tb3t; sumTg += tg;
        rowLines.push(`${storeName}\t${sl.toLocaleString('en-US')}\t${qd.toLocaleString('en-US')}\t100.0%\t${thuc.toLocaleString('en-US')}\t${target.toLocaleString('en-US')}\t${ht}\t${tb3t.toLocaleString('en-US')}\t${tt}\t${tg.toLocaleString('en-US')}\t${pctTg}`);
    }

    const totalHt = sumTarget > 0 ? ((sumQd / sumTarget) * 100).toFixed(1) + '%' : '0.0%';
    const totalTtDiff = sumTb3t > 0 ? (((sumQd - sumTb3t) / sumTb3t) * 100).toFixed(1) : '0.0';
    const totalTt = totalTtDiff.startsWith('-') ? `${totalTtDiff}%` : `+${totalTtDiff}%`;
    const totalPctTg = sumThuc > 0 ? ((sumTg / sumThuc) * 100).toFixed(1) + '%' : '0.0%';

    return [
        'Dashboards',
        'Doanh thu hợp nhất',
        'DT quy đổi',
        revenueKfactor.toLocaleString('en-US'),
        '% HT target (LK)',
        htTargetQD,
        `Target trọn kỳ ${targetKfactor.toLocaleString('en-US')}`,
        'TT vs TB 3 tháng',
        ttTb3t,
        'DT dự kiến',
        dtDuKien.toLocaleString('en-US'),
        'TLPVTC hôm nay',
        tlpv,
        `${bills.toLocaleString('en-US')} bill / ${visitors.toLocaleString('en-US')} khách`,
        'Tỉ trọng trả góp',
        tyTrongTg,
        'Siêu thị\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET (LK)\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP',
        ...rowLines,
        `Tổng (1 dòng)\t${sumSl.toLocaleString('en-US')}\t${sumQd.toLocaleString('en-US')}\t100.0%\t${sumThuc.toLocaleString('en-US')}\t${sumTarget.toLocaleString('en-US')}\t${totalHt}\t${sumTb3t.toLocaleString('en-US')}\t${totalTt}\t${sumTg.toLocaleString('en-US')}\t${totalPctTg}`
    ].join('\n');
}

export function serializeCompetitionRealtime(compData: any[]) {
    const blocks: string[] = [];
    for (const item of compData) {
        const pName = item.programname || 'Chương trình';
        const sName = item.salegroupname || 'Siêu thị';
        const isQtyOnly = Number(item.quantity || 0) > 0 && Number(item.revenue || 0) === 0;
        const metricHeader = isQtyOnly ? 'SLLK' : 'DOANH THU';
        const metricVal = isQtyOnly ? Math.round(Number(item.quantity || 0)) : Math.round(Number(item.revenue || 0));
        const targetVal = Math.round(Number(item.target || 0));
        const htVal = Math.round(Number(item.targetpercent_month || 0));
        blocks.push(`${pName}\n${metricHeader}\tTARGET\t% HT THÁNG\n${sName}\t${metricVal}\t${targetVal}\t${htVal}`);
    }
    return blocks.join('\n');
}

export function serializeIndustryRealtime(industryRows: any[]) {
    const lines = [
        'NGÀNH HÀNG / NHÓM HÀNG\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET (LK)\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP'
    ];
    let sumSl = 0, sumQd = 0, sumThuc = 0, sumTb3t = 0, sumTg = 0;

    for (const item of industryRows) {
        const name = `${item.rowcode || ''} - ${item.rowname || ''}`.replace(/^[-\s]+/, '');
        const sl = Math.round(Number(item.quantity || 0));
        const qd = Math.round(Number(item.revenue_kfactor || 0));
        const thuc = Math.round(Number(item.revenue || 0));
        const tb3t = Math.round(Number(item.avg3month_kfactor || item.avg3month || 0));
        const rowTtDiff = tb3t > 0 ? (((Number(item.revenue_kfactor || 0) - tb3t) / tb3t) * 100).toFixed(1) : '0.0';
        const tt = rowTtDiff.startsWith('-') ? `${rowTtDiff}%` : `+${rowTtDiff}%`;
        const tg = Math.round(Number(item.revenue_tragop || 0));
        const pctTg = thuc > 0 ? ((tg / thuc) * 100).toFixed(1) + '%' : '0.0%';

        if (item.rowlevel === 'BICAT') {
            sumSl += sl; sumQd += qd; sumThuc += thuc; sumTb3t += tb3t; sumTg += tg;
        }

        lines.push(`${name}\t${sl.toLocaleString('en-US')}\t${qd.toLocaleString('en-US')}\t100.0%\t${thuc.toLocaleString('en-US')}\t—\t—\t${tb3t.toLocaleString('en-US')}\t${tt}\t${tg.toLocaleString('en-US')}\t${pctTg}`);
    }

    const totalTtDiff = sumTb3t > 0 ? (((sumQd - sumTb3t) / sumTb3t) * 100).toFixed(1) : '0.0';
    const totalTt = totalTtDiff.startsWith('-') ? `${totalTtDiff}%` : `+${totalTtDiff}%`;
    const totalPctTg = sumThuc > 0 ? ((sumTg / sumThuc) * 100).toFixed(1) + '%' : '0.0%';

    lines.push(`Tổng\t${sumSl.toLocaleString('en-US')}\t${sumQd.toLocaleString('en-US')}\t100.0%\t${sumThuc.toLocaleString('en-US')}\t—\t—\t${sumTb3t.toLocaleString('en-US')}\t${totalTt}\t${sumTg.toLocaleString('en-US')}\t${totalPctTg}`);
    return lines.join('\n');
}

export function serializeStaffRealtime(staffRows: any[]) {
    const lines = [
        'NHÂN VIÊN\tSỐ LƯỢNG\tDOANH THU QĐ\t% TỈ TRỌNG\tDOANH THU\tTARGET\t% HT TARGET\tTB 3 THÁNG\t% TT\tDT TRẢ GÓP\t% TRẢ GÓP'
    ];
    let sumSl = 0, sumQd = 0, sumThuc = 0, sumTg = 0;

    for (const item of staffRows) {
        const name = `${item.rowcode || ''} - ${item.rowname || ''}`.replace(/^[-\s]+/, '');
        const sl = Math.round(Number(item.quantity || 0));
        const qd = Math.round(Number(item.revenue_kfactor || 0));
        const thuc = Math.round(Number(item.revenue || 0));
        const tg = Math.round(Number(item.revenue_tragop || 0));
        const pctTg = thuc > 0 ? ((tg / thuc) * 100).toFixed(1) + '%' : '0.0%';

        sumSl += sl; sumQd += qd; sumThuc += thuc; sumTg += tg;
        lines.push(`${name}\t${sl.toLocaleString('en-US')}\t${qd.toLocaleString('en-US')}\t—\t${thuc.toLocaleString('en-US')}\t—\t—\t—\t—\t${tg.toLocaleString('en-US')}\t${pctTg}`);
    }

    const totalPctTg = sumThuc > 0 ? ((sumTg / sumThuc) * 100).toFixed(1) + '%' : '0.0%';
    lines.push(`Tổng\t${sumSl.toLocaleString('en-US')}\t${sumQd.toLocaleString('en-US')}\t100.0%\t${sumThuc.toLocaleString('en-US')}\t—\t—\t—\t—\t${sumTg.toLocaleString('en-US')}\t${totalPctTg}`);
    return lines.join('\n');
}

describe('Direct API Serializer Integration Tests', () => {
    it('serializeSummaryRealtime parse thành công qua parseSummaryData', () => {
        const cardMock = {
            quantity: "1190.0000",
            revenue: "496.7375",
            revenue_kfactor: "863.5577",
            revenue_tragop: "195.2380",
            revenue_cum: "19325.0276",
            revenue_kfactor_cum: "29235.3852",
            avg3month_kfactor: "947.8718",
            target_kfactor: "28562.1414",
            numday_window: 1,
            numday_cum: 29,
            numday_month: 30,
            svc_visitors: "39608",
            svc_bills: "8115"
        };
        const rowsMock = [
            {
                rowlevel: "STORE",
                rowcode: "910",
                rowname: "ĐML_STR_STR - 99 Hùng Vương",
                quantity: "1190.0000",
                revenue: "496.7375",
                revenue_kfactor: "863.5577",
                revenue_tragop: "195.2380",
                revenue_cum: "19325.0276",
                revenue_kfactor_cum: "29235.3852",
                avg3month_kfactor: "947.8718",
                target_kfactor: "28562.1414"
            }
        ];

        const text = serializeSummaryRealtime(cardMock, rowsMock);
        const parsed = parseSummaryData(text);
        expect(parsed.kpis.dtqd).toBe('864');
        expect(parsed.kpis.targetQD).toBe('28,562');
        expect(parsed.kpis.lbill).toBe('8,115');
        expect(parsed.kpis.lkhach).toBe('39,608');
        expect(parsed.table.rows.length).toBeGreaterThan(0);
        expect(parsed.table.rows[0][0]).toContain('910 - ĐML_STR_STR - 99 Hùng Vương');
    });

    it('serializeCompetitionRealtime parse thành công qua parseCompetitionDataBySupermarket', () => {
        const compMock = [
            {
                programid: 865,
                programname: "Bảo hiểm tổng",
                salegroupname: "ĐML_STR_STR - 99 Hùng Vương",
                quantity: 485.0,
                revenue: 1588.72,
                target: 2086.05,
                targetpercent_month: 76.16
            },
            {
                programid: 867,
                programname: "SIM MOBIFONE",
                salegroupname: "ĐML_STR_STR - 99 Hùng Vương",
                quantity: 247.0,
                revenue: 0.0,
                target: 103.0,
                targetpercent_month: 239.81
            }
        ];

        const text = serializeCompetitionRealtime(compMock);
        const parsed = parseCompetitionDataBySupermarket(text);
        expect(parsed['ĐML_STR_STR - 99 Hùng Vương']).toBeDefined();
        expect(parsed['ĐML_STR_STR - 99 Hùng Vương'].programs.length).toBe(2);
        expect(parsed['ĐML_STR_STR - 99 Hùng Vương'].programs[0].name).toBe('Bảo hiểm tổng');
    });

    it('serializeIndustryRealtime parse thành công qua parseIndustryRealtimeData', () => {
        const indMock = [
            {
                rowlevel: "BICAT",
                rowcode: "11",
                rowname: "NH Tận Tâm",
                quantity: 10,
                revenue: 1.15,
                revenue_kfactor: 3.35,
                avg3month_kfactor: 2.5,
                revenue_tragop: 0.5
            },
            {
                rowlevel: "BISUB",
                rowcode: "50",
                rowname: "Phụ kiện lắp đặt",
                quantity: 10,
                revenue: 1.12,
                revenue_kfactor: 3.32,
                avg3month_kfactor: 2.5,
                revenue_tragop: 0.5
            }
        ];

        const text = serializeIndustryRealtime(indMock);
        const parsed = parseIndustryRealtimeData(text);
        expect(parsed.tree.length).toBeGreaterThan(0);
        expect(parsed.tree[0].name).toContain('11 - NH Tận Tâm');
    });

    it('serializeStaffRealtime parse thành công qua parseRevenueData', () => {
        const staffMock = [
            {
                rowlevel: "STAFF",
                rowcode: "107617",
                rowname: "Phạm Anh Nhân",
                quantity: "544.0000",
                revenue: "1408.2597",
                revenue_kfactor: "2083.0163",
                revenue_tragop: "691.3972"
            }
        ];

        const text = serializeStaffRealtime(staffMock);
        const parsed = parseRevenueData(text);
        expect(parsed.length).toBeGreaterThan(0);
        const p1 = parsed.find(x => x.name.includes('107617'));
        expect(p1).toBeDefined();
        expect(p1?.dtqd).toBe(2083);
    });
});
