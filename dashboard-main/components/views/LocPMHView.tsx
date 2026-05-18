import React, { useState, useRef } from 'react';
import { Filter, Copy } from 'lucide-react';
import { useIndexedDBState } from '../../bi-module/hooks/useIndexedDBState';

export default function LocPMHView() {
    const [textData, setTextData] = useState('');
    const [targetUsers, setTargetUsers] = useIndexedDBState<string>('filter-pmh-target-users', '21707, 22094, 21453');
    const [resultsText, setResultsText] = useState('');
    const [resultCount, setResultCount] = useState(0);
    const [toastMessage, setToastMessage] = useState('');
    const [isToastVisible, setIsToastVisible] = useState(false);
    
    const textDataRef = useRef(textData);
    textDataRef.current = textData;

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setIsToastVisible(true);
        setTimeout(() => setIsToastVisible(false), 2500);
    };

    const performFilter = (currentText: string, usersString: string) => {
        if (!currentText.trim()) return;

        const targetUsersArray = usersString.split(',')
                                            .map(id => id.trim())
                                            .filter(id => id !== '');

        if (targetUsersArray.length === 0) {
            showToast('Vui lòng nhập ít nhất 1 ID!');
            return;
        }

        const blocks = currentText.split('━━━━━━');
        const results: string[] = [];

        blocks.forEach(block => {
            const containsTargetUser = targetUsersArray.some(userId => block.includes(userId));
            
            if (containsTargetUser) {
                const pmhMatch = block.match(/(PMH\s+[^\n]+Của Bạn Là\s*:)/);
                const codeMatch = block.match(/PMH[^\n]+\n\s*\n([A-Z0-9]+)/);

                if (pmhMatch && codeMatch) {
                    const pmhType = pmhMatch[1].trim();
                    const pmhCode = codeMatch[1].trim();
                    results.push(`${pmhType} ${pmhCode}`);
                }
            }
        });

        if (results.length > 0) {
            const joinedResults = results.join('\n');
            setResultsText(joinedResults);
            setResultCount(results.length);
            
            // Auto copy
            copyToClipboard(joinedResults, true);
        } else {
            setResultsText('Không tìm thấy kết quả nào phù hợp với các ID đã nhập.');
            setResultCount(0);
            showToast('Đã lọc: Không có mã nào.');
        }

        // Xoá nội dung văn bản sau khi lọc
        setTextData('');
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        const pastedText = e.clipboardData.getData('text');
        
        // Cập nhật textData ngay lập tức để UI không bị delay
        setTextData(pastedText);

        setTimeout(() => {
            performFilter(pastedText, targetUsers);
        }, 50);
    };

    const copyToClipboard = (text: string, isAuto = false) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showToast(isAuto ? 'Đã lọc và tự động sao chép!' : 'Đã sao chép kết quả!');
            } else {
                showToast('Không thể sao chép tự động.');
            }
        } catch (err) {
            console.error('Lỗi khi copy', err);
            showToast('Lỗi khi sao chép.');
        }

        document.body.removeChild(textArea);
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 font-sans absolute inset-0">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl md:rounded-2xl shadow-sm md:shadow-xl overflow-hidden border border-slate-200 dark:border-slate-700 flex flex-col h-full max-h-full">
                
                <header className="bg-blue-600 dark:bg-blue-700 text-white p-4 flex items-center justify-between shrink-0">
                    <h1 className="text-xl font-bold tracking-wide">Trình Lọc PMH</h1>
                    <Filter className="h-6 w-6" />
                </header>

                <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                    <div className="flex flex-col gap-1">
                        <label htmlFor="targetUsers" className="text-sm font-semibold text-slate-600 dark:text-slate-400">ID Người Dùng (Cách nhau bởi dấu phẩy):</label>
                        <input 
                            type="text" 
                            id="targetUsers" 
                            value={targetUsers}
                            onChange={(e) => setTargetUsers(e.target.value)}
                            className="w-full p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-mono" 
                            placeholder="VD: 21707, 22094, 21453" 
                        />
                    </div>

                    <div className="flex flex-col gap-1">
                        <label htmlFor="textData" className="text-sm font-semibold text-slate-600 dark:text-slate-400">Văn bản chứa mã (Dán từ tin nhắn):</label>
                        <textarea 
                            id="textData" 
                            rows={3} 
                            value={textData}
                            onChange={(e) => setTextData(e.target.value)}
                            onPaste={handlePaste}
                            className="w-full p-2.5 sm:p-3 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none text-sm" 
                            placeholder="Dán văn bản có chứa PMH vào đây. Hệ thống sẽ tự lọc và xoá sau khi xử lý..."
                        />
                    </div>

                    <div className="flex flex-col gap-1 flex-1 min-h-[150px] mt-2">
                        <div className="flex justify-between items-end mb-1">
                            <label className="text-sm font-semibold text-slate-600 dark:text-slate-400">Kết quả:</label>
                            <span className="text-xs text-slate-500 dark:text-slate-500 font-medium">{resultCount} mã được tìm thấy</span>
                        </div>
                        <div className="flex-1 w-full p-3 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto font-mono text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                            {resultsText || 'Chưa có dữ liệu. Hãy dán mã vào ô trên để lọc.'}
                        </div>
                    </div>
                </main>

                <footer className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700 shrink-0">
                    <button 
                        onClick={() => copyToClipboard(resultsText, false)}
                        disabled={resultCount === 0}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-3 px-4 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Copy className="h-5 w-5" />
                        Sao Chép Kết Quả
                    </button>
                </footer>
            </div>

            {/* Toast Notification */}
            <div className={`fixed bottom-[100px] left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm font-medium transition-opacity duration-300 z-[100] ${isToastVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {toastMessage}
            </div>
        </div>
    );
}
