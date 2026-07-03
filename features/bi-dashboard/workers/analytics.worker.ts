import { 
    parseSummaryData, 
    parseCompetitionDataBySupermarket, 
    parseIndustryRealtimeData, 
    parseIndustryLuyKeData 
} from '../utils/dashboardHelpers';
import { 
    parseRevenueData, 
    parseInstallmentData, 
    parseCrossSellingData,
    parseCompetitionData
} from '../utils/nhanVienHelpers';
import { parseDetailData } from '../utils/detailDataParser';

self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;
    try {
        let result;
        switch (type) {
            case 'PARSE_SUMMARY':
                result = parseSummaryData(payload);
                break;
            case 'PARSE_COMPETITION_BY_SUPERMARKET':
                result = parseCompetitionDataBySupermarket(payload);
                break;
            case 'PARSE_INDUSTRY_REALTIME':
                result = parseIndustryRealtimeData(payload.text, payload.industryBiMap);
                break;
            case 'PARSE_INDUSTRY_LUYKE':
                result = parseIndustryLuyKeData(payload.text, payload.industryBiMap);
                break;
            case 'PARSE_REVENUE':
                result = parseRevenueData(payload);
                break;
            case 'PARSE_INSTALLMENT':
                result = parseInstallmentData(payload.text, payload.employeeDepartmentMap);
                break;
            case 'PARSE_CROSS_SELLING':
                result = parseCrossSellingData(payload.text, payload.employeeDepartmentMap);
                break;
            case 'PARSE_COMPETITION':
                result = parseCompetitionData(payload.text, payload.employeeDepartmentMap);
                break;
            case 'PARSE_DETAIL':
                result = parseDetailData(payload);
                break;
            default:
                throw new Error(`Unknown worker task type: ${type}`);
        }
        self.postMessage({ id, type: 'SUCCESS', result });
    } catch (error: any) {
        self.postMessage({ id, type: 'ERROR', error: error.message });
    }
};
