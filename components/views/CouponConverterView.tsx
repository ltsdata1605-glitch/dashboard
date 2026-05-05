import React, { useState, useCallback, useEffect, useRef } from 'react';
import { transformCouponText } from '../../utils/couponFormatter';
import { SAMPLE_TITLE, SAMPLE_OUTPUT } from '../../utils/couponSampleData';
import { Icon } from '../common/Icon';

export default function CouponConverterView() {
    const [title, setTitle] = useState<string>('');
    const [inputText, setInputText] = useState<string>('');
    const [outputText, setOutputText] = useState<string>('');
    const [isCopied, setIsCopied] = useState<boolean>(false);
    const [lastUpdated, setLastUpdated] = useState<string>('');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [showGuide, setShowGuide] = useState<boolean>(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // --- Helpers ---
    const copyToClipboard = useCallback(async (text: string) => {
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.error('Clipboard API failed', err);
            throw new Error('Không thể sao chép. Vui lòng kiểm tra quyền trình duyệt.');
        }
    }, []);

    const showCopySuccessFeedback = useCallback(() => {
        setIsCopied(true);
        const timer = setTimeout(() => setIsCopied(false), 2500);
        return () => clearTimeout(timer);
    }, []);

    const updateOutput = useCallback((input: string, titleVal: string) => {
         const newOutput = transformCouponText(input, titleVal);
         setOutputText(newOutput);
    }, []);

    // --- Event Handlers ---
    const handleManualCopyClick = async () => {
        if (!outputText) return;
        setErrorMessage('');
        try {
            await copyToClipboard(outputText);
            showCopySuccessFeedback();
        } catch (err) {
            setErrorMessage('Sao chép không thành công. Vui lòng thử lại.');
        }
    };

    const handlePasteClick = async () => {
        try {
            await navigator.clipboard.readText();
            // Just clear and focus to prepare for paste
            setInputText('');
            setErrorMessage('');
            textareaRef.current?.focus();
        } catch (e) {
            setInputText('');
            setErrorMessage('');
            textareaRef.current?.focus();
        }
    };

    const handleClearAll = () => {
        setTitle('');
        setInputText('');
        setOutputText('');
        setErrorMessage('');
        textareaRef.current?.focus();
    };
    
    const handleClearContent = () => {
        setInputText('');
        setOutputText(transformCouponText('', title));
        setErrorMessage('');
        textareaRef.current?.focus();
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newTitle = e.target.value;
        setTitle(newTitle);
        updateOutput(inputText, newTitle);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newInput = e.target.value;
        setInputText(newInput);
        updateOutput(newInput, title);
    };
    
    const handleTitlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
        e.preventDefault();
        const pastedTitle = e.clipboardData.getData('text/plain');
        if (!pastedTitle) return;

        const newOutput = transformCouponText(inputText, pastedTitle);
        setTitle(pastedTitle);
        setOutputText(newOutput);

        if (newOutput) {
            copyToClipboard(newOutput)
                .then(showCopySuccessFeedback)
                .catch(() => setErrorMessage('Sao chép tự động thất bại.'));
        }
        textareaRef.current?.focus();
    };
    
    const handleContentPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
        e.preventDefault();
        const pastedText = e.clipboardData.getData('text/plain');
        if (!pastedText) return;

        const transformedText = transformCouponText(pastedText, title);
        setOutputText(transformedText);

        if (transformedText) {
            copyToClipboard(transformedText)
                .then(showCopySuccessFeedback)
                .catch(() => setErrorMessage('Tự động sao chép thất bại.'));
        }
        
        setInputText(''); 
        textareaRef.current?.focus();
    };
    
    useEffect(() => {
        if (inputText || title || outputText) {
            setLastUpdated(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute:'2-digit' }));
        } else {
            setLastUpdated('');
        }
    }, [inputText, title, outputText]);

    return (
        <main className="h-full w-full flex flex-col items-center p-4 sm:p-6 lg:p-8 font-sans bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 overflow-y-auto">
            <div className="w-full max-w-[960px] mx-auto relative z-10 flex flex-col h-full min-h-[600px]">
                <header className="text-center mb-10 shrink-0">
                    <h1 className="text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 tracking-tight py-2 leading-tight">
                        Chuyển đổi coupon GVGS, EVENT
                    </h1>
                    <div className="text-sm text-slate-500 dark:text-slate-400 max-w-3xl mx-auto font-medium space-y-1">
                        <p>Hỗ trợ chuyển đổi COUPON từ báo cáo Anh 3169 - Phạm Nguyên Vũ gửi Event, GVGS:</p>
                        <p>Mã COUPON Áp Dụng Cho Máy lọc nước Giờ vàng giá sốc ngày 1/5 - 3/5/2026</p>
                        <p>Mã COUPON Áp Dụng Cho Tivi - Loa Karaoke Giờ vàng giá sốc ngày 1/5 - 3/5/2026</p>
                    </div>

                    <button 
                        onClick={() => setShowGuide(!showGuide)}
                        className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors py-2 px-4 rounded-full bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 hover:shadow-sm"
                    >
                        <Icon name={showGuide ? "chevron-up" : "help-circle"} size={4} />
                        {showGuide ? "Ẩn hướng dẫn sử dụng" : "Xem hướng dẫn sử dụng"}
                    </button>
                    
                    {showGuide && (
                        <div className="mt-6 max-w-4xl mx-auto rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                            <img 
                                src="/Tuts/Coupon.png" 
                                alt="Hướng dẫn sử dụng" 
                                className="w-full h-auto object-contain bg-slate-100 dark:bg-slate-800 block" 
                            />
                        </div>
                    )}
                </header>

                {errorMessage && (
                    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 mb-8 flex justify-between items-start shadow-sm shrink-0">
                        <div className="flex items-center gap-3">
                            <Icon name="alert-triangle" size={6} className="text-red-500" />
                            <div>
                                <p className="font-semibold text-sm">Lỗi xử lý</p>
                                <p className="text-sm mt-0.5 opacity-90">{errorMessage}</p>
                            </div>
                        </div>
                        <button 
                            onClick={() => setErrorMessage('')} 
                            className="text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors p-1 hover:bg-red-100 dark:hover:bg-red-900/40"
                        >
                            <Icon name="x" size={5} />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 flex-grow">
                    {/* Input Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md">
                         <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 bg-indigo-500" />
                                  Nguồn Dữ Liệu
                              </h2>
                              <div className="flex items-center gap-2">
                                  <button
                                      onClick={handlePasteClick}
                                      className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 transition-all hover:scale-105 active:scale-95"
                                      title="Làm mới và chuẩn bị dán"
                                  >
                                      <Icon name="clipboard-paste" size={4} /> <span className="hidden sm:inline">Dán</span>
                                  </button>
                                  <button
                                      onClick={handleClearContent}
                                      className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-amber-50 dark:bg-amber-900/30 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-800 transition-all hover:scale-105 active:scale-95"
                                      title="Xóa nội dung, giữ tiêu đề"
                                  >
                                      <Icon name="trash-2" size={4} /> <span className="hidden sm:inline">Nội dung</span>
                                  </button>
                                  <button
                                      onClick={handleClearAll}
                                      className="flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 bg-red-50 dark:bg-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800 transition-all hover:scale-105 active:scale-95"
                                      title="Xóa toàn bộ"
                                  >
                                      <Icon name="trash-2" size={4} /> <span className="hidden sm:inline">Tất cả</span>
                                  </button>
                              </div>
                         </div>
                         <div className="p-5 flex-grow flex flex-col gap-4">
                              <div>
                                  <label htmlFor="title-input" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                      Tiêu đề (Tùy chọn)
                                  </label>
                                  <input
                                      id="title-input"
                                      type="text"
                                      value={title}
                                      onChange={handleTitleChange}
                                      onPaste={handleTitlePaste}
                                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                      placeholder={SAMPLE_TITLE}
                                  />
                              </div>
                              <div className="flex-grow flex flex-col">
                                  <label htmlFor="input-text" className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex justify-between items-end">
                                      <span>Nội dung thô</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hỗ trợ dán (Ctrl+V)</span>
                                  </label>
                                  <textarea
                                      ref={textareaRef}
                                      id="input-text"
                                      value={inputText}
                                      onChange={handleInputChange}
                                      onPaste={handleContentPaste}
                                      className="w-full h-full min-h-[200px] bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm font-mono text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none custom-scrollbar"
                                      placeholder="Dán dữ liệu thô vào đây...&#10;Hệ thống sẽ tự động định dạng và sao chép kết quả."
                                  />
                              </div>
                         </div>
                    </div>

                    {/* Output Section */}
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col overflow-hidden transition-all duration-300 hover:shadow-md relative group">
                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 relative z-10">
                            <div className="flex items-center gap-4">
                                <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 bg-emerald-500" />
                                    Kết Quả
                                </h2>
                                {lastUpdated && (
                                    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 px-2 py-1 border border-slate-200 dark:border-slate-700">
                                        <Icon name="clock" size={3.5} /> {lastUpdated}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={handleManualCopyClick}
                                disabled={!outputText}
                                className={`flex items-center gap-2 text-sm font-bold py-1.5 px-4 transition-all duration-300 ${
                                    isCopied
                                        ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                        : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-600'
                                } disabled:bg-slate-100 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:dark:text-slate-500 disabled:border-slate-200 disabled:dark:border-slate-700 disabled:shadow-none hover:scale-105 active:scale-95`}
                            >
                                {isCopied ? (
                                    <>
                                        <Icon name="check-circle" size={4} />
                                        <span>Đã lưu!</span>
                                    </>
                                ) : (
                                    <>
                                        <Icon name="copy" size={4} />
                                        <span>Sao chép</span>
                                    </>
                                )}
                            </button>
                        </div>
                        
                        <div className="relative flex-grow m-6 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden z-10">
                            <div className="absolute inset-0 overflow-auto p-5 custom-scrollbar">
                                <pre className="text-sm font-mono text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                                    {outputText ? (
                                        outputText
                                    ) : (!inputText && !title) ? (
                                        <div className="opacity-40 pointer-events-none select-none">
                                            {SAMPLE_OUTPUT}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 dark:text-slate-500 select-none italic flex flex-col items-center justify-center h-full text-center">
                                            <Icon name="code" size={12} className="mb-4 opacity-40" />
                                            Kết quả hiển thị tại đây...
                                        </span>
                                    )}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
