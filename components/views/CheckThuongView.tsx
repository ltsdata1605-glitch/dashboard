import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useActiveTab } from '../../contexts/LayoutContext';
import { Icon } from '../common/Icon';

const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bảng Tra Cứu Thưởng Thi Đua</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/html-to-image@1.11.13/dist/html-to-image.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/idb-keyval@6/dist/umd.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; }
        body { 
            font-family: 'Inter', sans-serif; 
            background: #f8f9fc;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #c7d2fe; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #a5b4fc; }
        .sortable:hover { background-color: #f0f0f0; cursor: pointer; }
        .sort-asc::after { content: ' ▲'; font-size: 0.7em; color: #6366f1; }
        .sort-desc::after { content: ' ▼'; font-size: 0.7em; color: #6366f1; }
        .capture-fix { display: flex; align-items: center; }
        .app-shell { max-width: 960px; margin: 0 auto; padding: 0; }
        /* Landing hero */
        .landing-hero { background: linear-gradient(180deg, #eef1fb 0%, #f4ecf9 40%, #f8f9fc 100%); padding: 0 0 60px 0; text-align: center; }
        .nav-bar { max-width: 960px; margin: 0 auto; padding: 16px 24px; display: flex; align-items: center; justify-content: space-between; }
        .hero-content { max-width: 640px; margin: 0 auto; padding: 40px 24px 0; }
        /* Modern card */
        .mod-card { background: #fff; border-radius: 0; border: 1px solid rgba(0,0,0,0.06); box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
        /* Pastel group header colors */
        .pastel-green { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; }
        .pastel-amber { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
        .pastel-rose { background: linear-gradient(135deg, #fce7f3, #fbcfe8); color: #9d174d; }
        .pastel-violet { background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #5b21b6; }
        .pastel-slate { background: linear-gradient(135deg, #e2e8f0, #cbd5e1); color: #334155; }
        .pastel-teal { background: linear-gradient(135deg, #ccfbf1, #99f6e4); color: #115e59; }
        .pastel-orange { background: linear-gradient(135deg, #ffedd5, #fed7aa); color: #9a3412; }
        /* Pastel card title colors - for individual cards */
        .card-pastel-0 { background: linear-gradient(135deg, #dbeafe, #bfdbfe); color: #1e40af; }
        .card-pastel-1 { background: linear-gradient(135deg, #e0e7ff, #c7d2fe); color: #3730a3; }
        .card-pastel-2 { background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #5b21b6; }
        .card-pastel-3 { background: linear-gradient(135deg, #fce7f3, #fbcfe8); color: #9d174d; }
        .card-pastel-4 { background: linear-gradient(135deg, #ffe4e6, #fecdd3); color: #9f1239; }
        .card-pastel-5 { background: linear-gradient(135deg, #ffedd5, #fed7aa); color: #9a3412; }
        .card-pastel-6 { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #92400e; }
        .card-pastel-7 { background: linear-gradient(135deg, #ecfccb, #d9f99d); color: #3f6212; }
        .card-pastel-8 { background: linear-gradient(135deg, #d1fae5, #a7f3d0); color: #065f46; }
        .card-pastel-9 { background: linear-gradient(135deg, #ccfbf1, #99f6e4); color: #115e59; }
        .card-pastel-10 { background: linear-gradient(135deg, #cffafe, #a5f3fc); color: #155e75; }
        .card-pastel-11 { background: linear-gradient(135deg, #e0f2fe, #bae6fd); color: #075985; }
        .card-pastel-12 { background: linear-gradient(135deg, #f0fdf4, #bbf7d0); color: #166534; }
        .card-pastel-13 { background: linear-gradient(135deg, #fdf4ff, #f5d0fe); color: #86198f; }
        .card-pastel-14 { background: linear-gradient(135deg, #fff1f2, #fecdd3); color: #be123c; }
        /* Bonus row pastel */
        .bonus-row-pastel { background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border-radius: 0; padding: 6px 10px; }
        /* Stat mini card */
        .stat-mini { background: #ffffff; border-radius: 12px; padding: 14px 12px 14px 18px; border: 1px solid rgba(0,0,0,0.04); border-bottom: 2px solid rgba(0,0,0,0.06); display: flex; flex-direction: column; align-items: flex-start; justify-content: center; flex: 1 1 0; min-width: 90px; max-width: 150px; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 10px rgba(0,0,0,0.02); position: relative; overflow: hidden; cursor: pointer; }
        .stat-mini::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: var(--stat-color, #6366f1); opacity: 0.85; transition: all 0.3s ease; }
        .stat-mini:hover::before { opacity: 1; width: 6px; }
        .stat-mini:hover { transform: translateY(-4px); box-shadow: 0 12px 24px rgba(0,0,0,0.06); border-color: rgba(0,0,0,0.08); border-bottom-color: rgba(0,0,0,0.12); }
        /* Modern input */
        .mod-input { width: 100%; border: 1.5px solid #e5e7eb; border-radius: 0; padding: 8px 12px; font-size: 14px; font-weight: 600; outline: none; background: #fff; transition: all 0.2s; font-family: inherit; color: #111827; }
        .mod-input:focus { border-color: #818cf8; box-shadow: 0 0 0 3px rgba(129,140,248,0.15); }
        .mod-input::placeholder { color: #c7c7cc; font-weight: 400; }
        /* Modern button */
        .mod-btn { width: 38px; height: 38px; border-radius: 0; display: inline-flex; align-items: center; justify-content: center; border: none; cursor: pointer; transition: all 0.15s; }
        .mod-btn-primary { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; box-shadow: 0 2px 8px rgba(99,102,241,0.3); }
        .mod-btn-primary:hover { background: linear-gradient(135deg, #4f46e5, #6366f1); transform: translateY(-1px); }
        .mod-btn-ghost { background: #f3f4f6; color: #6b7280; }
        .mod-btn-ghost:hover { background: #e5e7eb; color: #374151; }
        /* Summary banner */
        .summary-banner { background: linear-gradient(135deg, #312e81 0%, #4338ca 40%, #6366f1 100%); border-radius: 0; color: #fff; padding: 20px 24px; position: relative; overflow: hidden; box-shadow: 0 8px 32px rgba(79,70,229,0.25); }
        .summary-banner::before { content: ''; position: absolute; top: -40%; right: -20%; width: 300px; height: 300px; border-radius: 50%; background: rgba(255,255,255,0.06); }
        .summary-banner::after { content: ''; position: absolute; bottom: -30%; left: -10%; width: 200px; height: 200px; border-radius: 50%; background: rgba(255,255,255,0.04); }
        /* Store card */
        .s-card { border: 1px solid rgba(0,0,0,0.06); border-radius: 0; overflow: hidden; display: flex; flex-direction: column; height: 100%; background: #fff; transition: all 0.15s; }
        .s-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        /* Filter pill */
        .filter-pill { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 0; font-size: 11px; font-weight: 600; cursor: pointer; border: 1.5px solid transparent; background: #f1f5f9; color: #475569; transition: all 0.2s; }
        .filter-pill:hover { background: #e2e8f0; }
        .filter-pill.active { background: linear-gradient(135deg, #6366f1, #818cf8); color: #fff; border-color: transparent; box-shadow: 0 2px 8px rgba(99,102,241,0.25); }
    </style>
</head>
<body>
    <!-- Landing Page -->
    <div id="landingPage" class="relative min-h-screen flex flex-col justify-center items-center overflow-hidden font-sans bg-[#F8FAFC] selection:bg-indigo-500/20 selection:text-indigo-600 pb-20">
        
        <!-- Ambient Background Grid -->
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none"></div>

        <!-- Animated Glow Orbs -->
        <div class="absolute top-[10%] left-[20%] w-[500px] h-[500px] bg-indigo-500/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse pointer-events-none"></div>
        <div class="absolute top-[10%] right-[20%] w-[500px] h-[500px] bg-purple-500/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse [animation-delay:2s] pointer-events-none"></div>
        <div class="absolute -bottom-[20%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/30 rounded-full mix-blend-multiply filter blur-[120px] opacity-60 animate-pulse [animation-delay:4s] pointer-events-none"></div>

        <div class="relative z-10 w-full max-w-[1000px] px-6 flex flex-col items-center text-center mt-8">
            
            <!-- Hero Typography -->
            <div class="mb-14">
                <h1 class="text-6xl sm:text-7xl lg:text-[5.5rem] font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-6 drop-shadow-sm">
                    Tra cứu thưởng.<br/>
                    <span class="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600">Phân tích tức thì.</span>
                </h1>
                <p class="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto font-medium leading-relaxed tracking-tight">
                    Tải file Luỹ Kế Thi Đua để tra cứu thưởng, phân tích cơ hội và so sánh giữa các siêu thị.<br class="hidden sm:block"/>
                    Xử lý cục bộ trực tiếp trên trình duyệt, không lưu trữ dữ liệu.
                </p>
            </div>

            <!-- Main Action Area - Glass Card -->
            <div class="w-full max-w-2xl">
                <div class="relative group">
                    <!-- Glow effect behind -->
                    <div class="absolute -inset-1 bg-gradient-to-r from-indigo-500/40 via-purple-500/40 to-blue-500/40 rounded-[32px] blur-2xl opacity-0 group-hover:opacity-100 transition duration-1000"></div>
                    
                    <div class="relative bg-white/70 backdrop-blur-3xl rounded-[30px] p-2 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.15)] ring-1 ring-white">
                        <div class="bg-white/90 backdrop-blur-xl rounded-[24px] overflow-hidden border border-slate-100 p-8">
                            
                            <!-- Upload Section -->
                            <div class="flex items-center gap-3 mb-6">
                                <div class="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100/50">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M3 5V19A9 3 0 0 0 21 19V5"></path><path d="M3 12A9 3 0 0 0 21 12"></path></svg>
                                </div>
                                <div class="text-left flex-1">
                                    <h3 class="font-bold text-slate-900 text-[15px]">Nhập dữ liệu</h3>
                                    <p class="text-[12px] font-medium text-slate-500">Hỗ trợ Excel (.xlsx, .xls)</p>
                                </div>
                                <div class="text-slate-300">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                                </div>
                            </div>

                            <label for="fileInput" class="relative group/dropzone flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-dashed border-slate-200 hover:border-blue-400/50 rounded-2xl cursor-pointer bg-slate-50/50 hover:bg-blue-50/30 transition-all duration-300 overflow-hidden">
                                <div class="absolute inset-0 bg-gradient-to-b from-transparent to-slate-50/50 pointer-events-none"></div>
                                <div class="flex flex-col items-center justify-center p-6 relative z-10">
                                    <div class="w-12 h-12 mb-4 rounded-full bg-white shadow-sm flex items-center justify-center border border-slate-100 group-hover/dropzone:scale-110 transition-transform duration-300 group-hover/dropzone:shadow-blue-100 group-hover/dropzone:border-blue-200 text-slate-400 group-hover/dropzone:text-blue-500">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                    </div>
                                    <p class="mb-2 text-[14px] font-medium text-slate-600">
                                        <span class="text-blue-600 font-semibold">Chọn file</span> hoặc thả các file Excel vào đây
                                    </p>
                                    <p class="text-[12px] text-slate-400 font-medium">Xử lý an toàn • Không tải lên máy chủ</p>
                                </div>
                                <input id="fileInput" type="file" class="hidden" accept=".csv, .xlsx, .xls, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" />
                            </label>
                            <p id="fileStatus" class="mt-4 text-[13px] font-medium text-slate-500 text-center">Chưa có file nào được chọn.</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Footer / Trust Indicators -->
            <div class="mt-16 grid grid-cols-3 gap-8 text-center">
                <div class="space-y-1">
                    <div class="flex justify-center text-slate-400 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><path d="m9 12 2 2 4-4"></path></svg></div>
                    <p class="text-xs font-bold text-slate-700">Local Processing</p>
                    <p class="text-[10px] text-slate-500">Dữ liệu không rời khỏi máy</p>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-center text-slate-400 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg></div>
                    <p class="text-xs font-bold text-slate-700">Instant Speed</p>
                    <p class="text-[10px] text-slate-500">Xử lý cực nhanh</p>
                </div>
                <div class="space-y-1">
                    <div class="flex justify-center text-slate-400 mb-2"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path><path d="M5 3v4"></path><path d="M19 17v4"></path><path d="M3 5h4"></path><path d="M17 19h4"></path></svg></div>
                    <p class="text-xs font-bold text-slate-700">Smart UI</p>
                    <p class="text-[10px] text-slate-500">Giao diện thông minh</p>
                </div>
            </div>

        </div>
    </div>

    <div class="app-shell">
        <!-- Search Section (shown after file load) -->
        <div id="searchSection" class="hidden" style="display: none !important;">
            <div class="mod-card" style="padding:16px 20px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.05)">
                <div style="display:flex;gap:16px;align-items:flex-end">
                    <div style="flex:1">
                        <label for="storeCodeInput1" style="display:block;font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Mã Kho 1 <span style="color:#9ca3af;font-weight:500;text-transform:none;letter-spacing:0">(Tra cứu chính)</span></label>
                        <div style="position:relative">
                            <div style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                            </div>
                            <input type="text" id="storeCodeInput1" placeholder="Nhập mã kho (VD: 910)..." class="mod-input" style="border-radius:10px;padding-left:38px;height:44px;font-size:15px">
                        </div>
                    </div>
                    <div style="width:1px;height:44px;background:#e5e7eb;flex-shrink:0"></div>
                    <div style="flex:1">
                        <label for="storeCodeInput2" style="display:block;font-size:11px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px">Mã Kho 2 <span style="color:#9ca3af;font-weight:500;text-transform:none;letter-spacing:0">(So sánh)</span></label>
                        <div style="position:relative">
                            <div style="position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#9ca3af;pointer-events:none">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/></svg>
                            </div>
                            <input type="text" id="storeCodeInput2" placeholder="Nhập mã kho so sánh..." class="mod-input" style="border-radius:10px;padding-left:38px;height:44px;font-size:15px">
                        </div>
                    </div>
                    <div style="display:flex;gap:8px;flex-shrink:0">
                        <button id="searchCompareButton" title="Tra cứu lại" class="mod-btn mod-btn-primary no-print" style="border-radius:10px;height:44px;width:44px">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
                        </button>
                        <button id="changeFileButton" title="Tải file khác" class="hidden mod-btn mod-btn-ghost no-print" style="border-radius:10px;height:44px;width:44px;background:#f1f5f9">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <!-- Messages -->
        <div id="message" class="hidden" style="text-align:center;color:#dc2626;background:#fef2f2;padding:14px;margin-bottom:14px;border-radius:12px;border:1px solid #fecaca;font-size:13px;font-weight:500"></div>

        <!-- Main Content Area (hidden until file is loaded) -->
        <div id="mainContent" class="hidden" style="padding:0 16px">
            <div style="display:flex;flex-direction:column;gap:14px">
                <div id="summaryReportArea">
                    <div id="summaryCard" class="summary-banner" style="margin-bottom:14px">
                        <!-- Content will be injected by JS -->
                    </div>
                    <div id="summaryFiltersSection" class="mod-card" style="padding:20px 24px;margin-bottom:16px;border-radius:16px;box-shadow:0 4px 20px rgba(0,0,0,0.03);border:1px solid rgba(0,0,0,0.05)">
                         <div style="display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:20px">
                             <div style="width:40px;height:2px;background:linear-gradient(to right,transparent,#818cf8);border-radius:2px"></div>
                             <span style="font-size:13px;font-weight:800;color:#1e293b;text-transform:uppercase;letter-spacing:0.08em">Tổng Hợp Nhóm Thi Đua</span>
                             <div style="width:40px;height:2px;background:linear-gradient(to left,transparent,#818cf8);border-radius:2px"></div>
                         </div>
                         <div id="groupSummaryContainer" style="display:flex;gap:12px;flex-wrap:nowrap;justify-content:center;overflow-x:auto;padding-bottom:4px;scrollbar-width:none"></div>
                    </div>
                    <div id="analysisSection" class="mod-card" style="padding:16px 18px;margin-bottom:14px"></div>
                </div>

                <div id="top10InfoCard" class="mod-card" style="padding:12px 16px;margin-bottom:14px;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px"></div>
                
                <!-- Results -->
                <div id="resultsContainer">
                    <div id="detailsGrid"></div>
                </div>
            </div>
        </div>
        
        <!-- Comparison Content Area -->
        <div id="comparisonContent" class="hidden"></div>
    </div>

    <!-- Loading Overlay -->
    <div id="loadingOverlay" class="hidden fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center transition-all duration-300">
        <div class="flex flex-col items-center bg-white/10 p-8 rounded-2xl backdrop-blur-md border border-white/20 shadow-2xl">
            <div class="animate-spin rounded-full h-14 w-14 border-4 border-indigo-500/30 border-t-indigo-500"></div>
            <p id="loadingText" class="text-white mt-5 text-lg font-bold tracking-wide drop-shadow-md"></p>
        </div>
    </div>


    <!-- Ranking Modal -->
    <div id="rankingModal" class="hidden fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
        <div class="bg-white shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 id="modalTitle" class="text-xl font-bold text-[#1d1d1f]">Bảng Xếp Hạng</h3>
                <div class="flex items-center gap-2 no-print">
                    <button id="exportRankingImageButton" title="Xuất ảnh bảng xếp hạng" class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 transition">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>
                    </button>
                    <button id="closeModalButton" class="text-gray-400 hover:text-gray-600">
                        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>
            </div>
            <div id="modalBody" class="p-4 sm:p-6 overflow-y-auto"></div>
        </div>
    </div>

    <!-- Version History Modal -->
    <div id="versionModal" class="hidden fixed inset-0 bg-black/30 backdrop-blur-sm overflow-y-auto h-full w-full flex items-center justify-center p-4 z-50">
        <div class="bg-white shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div class="flex justify-between items-center p-4 border-b">
                <h3 id="versionModalTitle" class="text-xl font-bold text-[#1d1d1f]">Lịch Sử Phiên Bản</h3>
                <button id="closeVersionModalButton" class="text-gray-400 hover:text-gray-600 no-print">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
            </div>
            <div id="versionModalBody" class="p-6 sm:p-8 overflow-y-auto space-y-6"></div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            // All element selectors
            const fileInput = document.getElementById('fileInput'), fileStatus = document.getElementById('fileStatus'), landingPage = document.getElementById('landingPage'), mainContent = document.getElementById('mainContent'), changeFileButton = document.getElementById('changeFileButton'), storeCodeInput1 = document.getElementById('storeCodeInput1'), storeCodeInput2 = document.getElementById('storeCodeInput2'), searchCompareButton = document.getElementById('searchCompareButton'), searchSection = document.getElementById('searchSection'), summaryCard = document.getElementById('summaryCard'), top10InfoCard = document.getElementById('top10InfoCard'), analysisSection = document.getElementById('analysisSection'), detailsGrid = document.getElementById('detailsGrid'), messageEl = document.getElementById('message'), groupSummaryContainer = document.getElementById('groupSummaryContainer'), rankingModal = document.getElementById('rankingModal'), modalTitle = document.getElementById('modalTitle'), modalBody = document.getElementById('modalBody'), closeModalButton = document.getElementById('closeModalButton'), versionInfo = document.getElementById('versionInfo'), versionModal = document.getElementById('versionModal'), versionModalBody = document.getElementById('versionModalBody'), closeVersionModalButton = document.getElementById('closeVersionModalButton'), loadingOverlay = document.getElementById('loadingOverlay'), loadingText = document.getElementById('loadingText'), comparisonContent = document.getElementById('comparisonContent');
            
            // State variables
            let competitionData = [], currentStoreData = [], noFundGroups = new Set(), bottom50MedianMap = {};
            let rankingDataForModal = [];
            let sortState = { key: null, direction: 'desc' };
            let comparisonSortState = { key: 'bonusDiff', direction: 'desc' };
            let singleViewMode = 'list';
            let fileUploadTime = null;

            const saveState = () => {
                if (competitionData && competitionData.length > 0) {
                    idbKeyval.set('checkthuong_data', {
                        competitionData: competitionData,
                        fileName: fileStatus.textContent.replace('Đã tải: ', '').replace(' (từ bộ nhớ tạm)', ''),
                        uploadTime: fileUploadTime,
                        code1: storeCodeInput1.value,
                        code2: storeCodeInput2.value,
                        singleViewMode: singleViewMode
                    }).catch(e => console.warn('IDB Save Error:', e));
                }
            };

            // Load saved state on init
            idbKeyval.get('checkthuong_data').then(savedData => {
                if (savedData && savedData.competitionData && savedData.competitionData.length > 0) {
                    competitionData = savedData.competitionData;
                    fileUploadTime = savedData.uploadTime || new Date().toISOString();
                    preProcessData(competitionData);
                    
                    if (savedData.fileName) {
                        fileStatus.textContent = \`Đã tải: \${savedData.fileName} (từ bộ nhớ tạm)\`;
                        fileStatus.className = 'mt-4 text-center text-sm font-medium text-green-600';
                        searchSection.classList.remove('hidden');
                        landingPage.classList.add('hidden');
                        changeFileButton.classList.remove('hidden');
                    }
                    
                    if (savedData.code1) storeCodeInput1.value = savedData.code1;
                    if (savedData.code2) storeCodeInput2.value = savedData.code2;
                    if (savedData.singleViewMode) singleViewMode = savedData.singleViewMode;
                    
                    window.parent.postMessage({ type: 'CHECK_THUONG_FILE_LOADED', code1: storeCodeInput1.value, code2: storeCodeInput2.value }, '*');
                    
                    if(storeCodeInput1.value) handleSearchOrCompare();
                }
            }).catch(e => console.warn('IDB Load Error:', e));

            const COLS = { KENH: 3, SIÊU_THỊ: 4, NGANH_HANG: 5, PERCENT_DU_KIEN: 6, DU_KIEN_VUOT: 7, LAY_TOP_10: 8, HANG_VUOT_Uu: 9, HANG_PERCENT_TARGET: 10, THUONG_VUOT_Uu: 11, THUONG_TOP_PERCENT: 12, TONG_THUONG: 13 };
            const EXPECTED_HEADERS = ['siêu thị', 'ngành hàng', 'thưởng'];
            
            // Formatters
            const parseNumber = (val) => {
                if (typeof val === 'number') return val;
                if (!val) return 0;
                let str = String(val).trim();
                if (str === '-' || str === '') return 0;
                // Remove spaces and currency symbols
                str = str.replace(/[^\d.,-]/g, '');
                // Handle Vietnamese format (1.000.000,50) vs US format (1,000,000.50)
                const lastDot = str.lastIndexOf('.');
                const lastComma = str.lastIndexOf(',');
                if (lastComma > lastDot) {
                    // Comma is decimal separator: 1.000.000,50 -> 1000000.50
                    str = str.replace(/\./g, '').replace(',', '.');
                } else if (lastDot > lastComma) {
                    // Dot is decimal separator: 1,000,000.50 -> 1000000.50
                    str = str.replace(/,/g, '');
                } else {
                    // Only one type of separator
                    if (str.includes(',')) {
                        // If multiple commas or 3 digits after comma, it's likely a thousand separator
                        if (str.split(',').length > 2 || str.match(/,\d{3}$/)) {
                            str = str.replace(/,/g, '');
                        } else {
                            str = str.replace(',', '.');
                        }
                    } else if (str.includes('.')) {
                        if (str.split('.').length > 2 || str.match(/\.\d{3}$/)) {
                            str = str.replace(/\./g, '');
                        }
                    }
                }
                return parseFloat(str) || 0;
            };

            const formatCurrencySimple = (value) => {
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
            const formatCurrency = formatCurrencySimple;
            const formatCurrencyFull = (value) => {
                const num = parseNumber(value);
                return new Intl.NumberFormat('vi-VN').format(Math.floor(num));
            };
            const formatNumber = (value) => {
                const num = parseNumber(value);
                return (num > 0 ? Math.floor(num) : Math.ceil(num)).toLocaleString('vi-VN');
            };
            const formatPercent = (value) => Math.floor(parseNumber(value) * 100) + '%';
            
            storeCodeInput1.value = '910';

            const versionHistory = [
                 {
                    version: "V10.6 - Sửa lỗi bộ lọc Đạt 100% và Không đạt 100%",
                    date: "20/03/2026 15:20:00",
                    changes: [
                        "Sửa lỗi thuật toán lọc Đạt 100% và Không đạt 100%: Điều chỉnh lại giá trị so sánh từ 100 thành 1.0 (do dữ liệu phần trăm trong Excel được đọc dưới dạng số thập phân, ví dụ 105% = 1.05)."
                    ]
                },
                 {
                    version: "V10.5 - Bổ sung tiêu chí Đạt 100% và Không đạt 100%",
                    date: "20/03/2026 15:15:00",
                    changes: [
                        "Bổ sung thêm 2 tiêu chí lọc mới: 'Đạt 100%' (tỉ lệ hoàn thành >= 100%) và 'Không đạt 100%' (tỉ lệ hoàn thành < 100%).",
                        "Hiển thị số lượng nhóm hàng tương ứng ngay trên các nút bấm bộ lọc (Ví dụ: Đạt 100% (5))."
                    ]
                },
                 {
                    version: "V10.4 - Tinh chỉnh tiêu chí Không có quỹ theo Kênh",
                    date: "20/03/2026 15:10:00",
                    changes: [
                        "Nâng cấp định nghĩa 'Không có quỹ': Hệ thống hiện tại sẽ kiểm tra chính xác theo từng Kênh (Ví dụ: Kênh siêu thị của mã 910).",
                        "Nếu cột N (Tổng thưởng) của nhóm hàng đó TRONG KÊNH ĐÓ bằng 0 trên toàn bộ các siêu thị cùng kênh, thì mới được liệt vào nhóm Không có quỹ."
                    ]
                },
                 {
                    version: "V10.3 - Cập nhật tiêu chí Không có quỹ",
                    date: "20/03/2026 15:00:00",
                    changes: [
                        "Cập nhật định nghĩa 'Không có quỹ': Nhóm hàng thi đua đó không có tiền thưởng (Cột N - Tổng thưởng có dữ liệu 0 trên toàn bộ các siêu thị).",
                        "Đảm bảo các nhóm hàng 'Không có quỹ' không bị tính trùng vào các nhóm 'Sắp có thưởng', 'Bottom 50%' hay 'No Sale'."
                    ]
                },
                 {
                    version: "V10.2 - Nâng cấp thuật toán tìm kiếm mã kho",
                    date: "20/03/2026 14:50:00",
                    changes: [
                        "Loại bỏ tính năng tìm kiếm 'fallback' (tìm trên tất cả các cột) để tránh tình trạng mã kho bị trùng với số tiền thưởng hoặc % dự kiến.",
                        "Nâng cấp thuật toán nhận diện: Chỉ khớp chính xác mã kho hoặc tên siêu thị, loại bỏ hoàn toàn các kết quả sai lệch (Ví dụ: tìm '12' không còn ra '123')."
                    ]
                },
                 {
                    version: "V10.1 - Lọc chuẩn dữ liệu Nhóm hàng",
                    date: "20/03/2026 14:45:00",
                    changes: [
                        "Khi tìm kiếm mã kho, hệ thống sẽ tự động loại bỏ các dòng trống hoặc không có thông tin 'Nhóm hàng thi đua'.",
                        "Đảm bảo chỉ hiển thị chính xác các nhóm hàng thi đua và tổng thưởng tương ứng của siêu thị đó."
                    ]
                },
                 {
                    version: "V10.0 - Sửa lỗi đọc dữ liệu & Định dạng số",
                    date: "20/03/2026 14:30:00",
                    changes: [
                        "Ép buộc thư viện đọc file Excel bắt đầu từ cột A (Index 0) để đảm bảo vị trí các cột D, E, F... luôn khớp chính xác với Index 3, 4, 5... ngay cả khi các cột đầu tiên bị trống.",
                        "Cải tiến bộ đọc số liệu: Hỗ trợ định dạng số kiểu Việt Nam (ví dụ: 1.000.000,50) và loại bỏ các ký tự thừa, giúp tính toán tổng thưởng chính xác tuyệt đối.",
                        "Tối ưu hóa thuật toán nhận diện dòng tiêu đề, đảm bảo không bỏ sót bất kỳ dòng dữ liệu nào."
                    ]
                },
                 {
                    version: "V9.9 - Xác nhận cấu trúc cột chuẩn",
                    date: "20/03/2026 14:30:00",
                    changes: [
                        "Khóa cứng vị trí các cột theo đúng yêu cầu: Kênh (D), Tên Siêu thị (E), Ngành hàng (F), % Dự kiến (G), Dự kiến vượt (H), Lấy Top 10 (I), Hạng vượt ưu (J), Hạng % Target (K), Thưởng vượt ưu (L), Thưởng Top % (M), Tổng thưởng (N).",
                        "Nâng cấp thuật toán trích xuất mã kho thông minh từ chuỗi Tên Siêu thị."
                    ]
                },
                 {
                    version: "V9.6 - Cập nhật cấu trúc file",
                    date: "17/03/2026 16:30:00",
                    changes: [
                        "Cập nhật cấu trúc cột theo chuẩn mới (Kênh, Tên Siêu thị, Ngành hàng...).",
                        "Lấy dữ liệu bắt đầu từ dòng 4."
                    ]
                },
                 {
                    version: "V9.5 - Tinh chỉnh xuất ảnh báo cáo",
                    date: "26/09/2025 13:30:00",
                    changes: [
                        "Cập nhật lại câu mô tả của công cụ.",
                        "Điều chỉnh phạm vi xuất ảnh của báo cáo 'So Sánh Trực Diện' để chỉ bao gồm phần tổng quan và phân tích nhanh.",
                        "Bổ sung nút xuất ảnh cho khu vực 'Phân Tích Nhanh'.",
                        "Tự động ẩn tất cả các nút bấm và icon khi xuất ảnh để báo cáo trông sạch sẽ, chuyên nghiệp hơn."
                    ]
                },
                 {
                    version: "V9.4 - Hoàn thiện xuất ảnh so sánh",
                    date: "26/09/2025 13:17:00",
                    changes: [
                        "Áp dụng quy tắc tăng chiều rộng khi xuất ảnh cho toàn bộ báo cáo 'So sánh trực diện'.",
                        "Bổ sung nút và chức năng xuất ảnh cho khu vực 'Phân Tích Nhanh: Điểm Mạnh Vượt Trội'."
                    ]
                },
                 {
                    version: "V9.3 - Sửa lỗi cắt chữ trong thẻ kết quả",
                    date: "26/09/2025 13:02:00",
                    changes: [
                        "Áp dụng quy tắc tăng chiều rộng và gỡ bỏ 'truncate' cho các thẻ kết quả khi xuất ảnh.",
                        "Đảm bảo tiêu đề dài như 'TỦ LẠNH - TỦ ĐÔNG - TỦ MÁT' được hiển thị đầy đủ trong file ảnh đã xuất."
                    ]
                },
                 {
                    version: "V9.2 - Sửa lỗi mất chữ khi xuất ảnh",
                    date: "26/09/2025 12:45:00",
                    changes: [
                        "Tăng chiều rộng của các khu vực báo cáo trước khi xuất ảnh để đảm bảo tiêu đề và nội dung không bị cắt xén.",
                        "Xoá tạm thời class 'truncate' trên tiêu đề để văn bản được hiển thị đầy đủ khi xuất file."
                    ]
                },
                 {
                    version: "V9.1 - Sửa lỗi lệch dòng khi xuất ảnh",
                    date: "26/09/2025 12:30:00",
                    changes: [
                        "Thêm khoảng đệm (padding) vào các khu vực xuất ảnh để khắc phục lỗi mất chữ, lệch dòng ở tiêu đề.",
                        "Cải thiện độ ổn định của chức năng xuất ảnh trên các loại báo cáo khác nhau."
                    ]
                },
                 {
                    version: "V9.0 - Cải thiện hiển thị trên màn hình lớn",
                    date: "26/09/2025 11:50:00",
                    changes: [
                        "Sửa lỗi hiển thị không cân xứng của các thẻ trong 'Bảng tổng hợp' trên màn hình lớn.",
                        "Các thẻ giờ đây sẽ tự động co giãn để lấp đầy không gian, giúp giao diện trông chuyên nghiệp hơn."
                    ]
                },
                 {
                    version: "V8.9 - Mở rộng bảng so sánh chi tiết",
                    date: "26/09/2025 11:34:00",
                    changes: [
                        "Bảng 'So Sánh Chi Tiết Ngành Hàng' sẽ tự động mở rộng theo nội dung, không còn sử dụng thanh cuộn."
                    ]
                },
                 {
                    version: "V8.8 - Mở rộng tính năng Cảnh báo & Xuất ảnh",
                    date: "26/09/2025 11:26:00",
                    changes: [
                        "Mục 'Cảnh báo' giờ đây có thể nhấn vào để xem chi tiết Bảng Xếp Hạng.",
                        "Nút 'Xuất ảnh hàng loạt' được nâng cấp để xuất đồng thời BXH của cả nhóm 'Cơ hội vàng' và 'Cảnh báo'."
                    ]
                },
                 {
                    version: "V8.7 - Xuất ảnh hàng loạt BXH",
                    date: "26/09/2025 11:10:00",
                    changes: [
                        "Bổ sung nút 'Xuất ảnh hàng loạt' vào khu vực 'Phân Tích & Đề Xuất'.",
                        "Tính năng mới cho phép tự động xuất và tải về file ảnh của tất cả các bảng xếp hạng thuộc mục 'Cơ hội vàng'."
                    ]
                },
                 {
                    version: "V8.6 - Cải tiến xuất ảnh & định dạng",
                    date: "26/09/2025 11:05:00",
                    changes: [
                        "Thêm nút xuất ảnh cho bảng 'So Sánh Chi Tiết', có khả năng chụp toàn bộ nội dung bị ẩn do cuộn.",
                        "Khi 'Xem tất cả' các môn có giải, định dạng lại danh sách để đồng bộ với kiểu hiển thị của mục 'Điểm Mạnh Vượt Trội'."
                    ]
                },
                 {
                    version: "V8.5 - Tinh chỉnh giao diện so sánh",
                    date: "26/09/2025 10:49:00",
                    changes: [
                        "Bổ sung mã kho vào thẻ tổng quan hiệu suất để dễ dàng nhận diện.",
                        "Thiết kế lại thẻ tổng quan hiệu suất chuyên nghiệp hơn với badge và đường kẻ phân cách.",
                        "Khi 'Xem tất cả' các môn có giải, bổ sung thêm số tiền thưởng của từng môn."
                    ]
                },
                 {
                    version: "V8.4 - Nâng cấp giao diện so sánh",
                    date: "26/09/2025 10:44:00",
                    changes: [
                        "Đổi tiêu đề chính từ 'Đối Đầu Trực Tiếp' thành 'So Sánh Trực Diện'.",
                        "Thêm nút 'Show all' để xem toàn bộ các ngành hàng đạt giải của cả hai kho.",
                        "Bổ sung tính năng sắp xếp tăng/giảm cho cột 'Chênh lệch Thưởng' trong bảng so sánh chi tiết.",
                        "Canh giữa tiêu đề và nội dung các cột trong bảng so sánh chi tiết.",
                        "Điều chỉnh màu sắc các nhãn trong thẻ tổng quan để tăng tính thẩm mỹ."
                    ]
                },
                 {
                    version: "V8.3 - Cải tiến giao diện tra cứu",
                    date: "26/09/2025 10:35:00",
                    changes: [
                        "Canh giữa và điều chỉnh lại layout khu vực tra cứu mã kho.",
                        "Tăng chiều rộng của các ô nhập liệu để dễ dàng thao tác hơn.",
                        "Thay đổi icon nút 'Tra cứu' thành icon 'Làm mới' (Refresh) để phù hợp hơn với chức năng."
                    ]
                },
                 {
                    version: "V8.2 - Cập nhật giao diện & tính năng",
                    date: "26/09/2025 10:27:00",
                    changes: [
                        "Tự động tra cứu/so sánh khi người dùng nhập mã kho, không cần nhấn nút.",
                        "Nút 'Tra cứu' được chuyển thành nút icon-only, chức năng chính là xoá kho so sánh và quay về giao diện tra cứu đơn.",
                        "Bỏ đơn vị tiền tệ 'đ' trong cột 'TỔNG THƯỞNG' của Bảng Xếp Hạng chi tiết."
                    ]
                },
                 {
                    version: "V8.1 - Bổ sung cột Dự kiến Vượt",
                    date: "26/09/2025 10:10:00",
                    changes: [
                        "Bổ sung cột 'D.KIẾN DT/SL' vào Bảng Xếp Hạng chi tiết để cung cấp thêm thông tin.",
                        "Cập nhật mô tả công cụ trên trang chính."
                    ]
                },
                 {
                    version: "V8.0 - Giao diện so sánh chuyên nghiệp",
                    date: "26/09/2025 09:45:00",
                    changes: [
                        "Thiết kế lại hoàn toàn giao diện so sánh với bố cục \\"Đối Đầu Trực Tiếp\\" (Head-to-Head).",
                        "Thêm các thẻ phân tích tổng quan, làm nổi bật các chỉ số chính và bên đang chiếm ưu thế.",
                        "Bổ sung mục \\"Phân Tích Nhanh\\" để tự động tóm tắt các điểm mạnh vượt trội của mỗi kho.",
                        "Cải tiến bảng so sánh chi tiết với cột \\"Chênh lệch\\", giúp định lượng hóa sự khác biệt về hiệu suất."
                    ]
                }
            ];

            const GROUP_COLORS = {
                achieved: { bg: 'bg-green-600', text: 'text-white' },
                nearly: { bg: 'bg-amber-500', text: 'text-white' },
                bottom50: { bg: 'bg-red-600', text: 'text-white' },
                noFund: { bg: 'bg-purple-600', text: 'text-white' },
                noSale: { bg: 'bg-slate-600', text: 'text-white' }
            };
            
            function renderVersionHistory() {
                versionModalBody.innerHTML = versionHistory.map(v => \`
                    <div>
                        <h4 class="text-lg font-bold text-[#1d1d1f]">\${v.version}</h4>
                        <p class="text-sm text-gray-500 mb-2">\${v.date}</p>
                        <ul class="list-disc list-inside space-y-1 text-[#6e6e73]">
                            \${v.changes.map(change => \`<li>\${change}</li>\`).join('')}
                        </ul>
                    </div>
                \`).join('<hr class="my-6 border-gray-200">');
            }


            function validateDataStructure(headerRow) { 
                if (!headerRow) return false; 
                const headerString = headerRow.join(',').toLowerCase();
                return EXPECTED_HEADERS.every(header => headerString.includes(header)); 
            }
            
            function preProcessData(data) { 
                const fundStatusByGroup = {}; 
                data.forEach(row => { 
                    const nganhHang = row[COLS.NGANH_HANG]; 
                    const kenh = row[COLS.KENH] || 'N/A';
                    if (!nganhHang) return; 
                    const key = \`\${kenh}|\${nganhHang}\`;
                    if (parseNumber(row[COLS.TONG_THUONG]) > 0) { 
                        fundStatusByGroup[key] = true; 
                    } 
                }); 
                const allGroups = new Set(data.map(row => {
                    if (!row[COLS.NGANH_HANG]) return null;
                    return \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`;
                }).filter(Boolean)); 
                noFundGroups = new Set([...allGroups].filter(group => !fundStatusByGroup[group])); 
                const groups = {}; 
                data.forEach(row => { 
                    const key = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG] || 'N/A'}\`; 
                    if (!groups[key]) groups[key] = []; 
                    groups[key].push(parseNumber(row[COLS.PERCENT_DU_KIEN])); 
                }); 
                bottom50MedianMap = {}; 
                for (const key in groups) { 
                    const percentages = groups[key].sort((a, b) => a - b); 
                    const mid = Math.floor(percentages.length / 2); 
                    bottom50MedianMap[key] = percentages.length % 2 !== 0 ? percentages[mid] : (percentages[mid - 1] + percentages[mid]) / 2; 
                } 
            }
            
            function handleFileSelect(event) {
                const file = event.target.files[0];
                if (!file) return;
                fileUploadTime = new Date().toISOString();
                const reader = new FileReader();
                reader.onload = function(e) {
                    try {
                        const isExcel = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');
                        let dataArray;
                        if (isExcel) {
                            const workbook = XLSX.read(e.target.result, { type: 'array' });
                            const sheet = workbook.Sheets[workbook.SheetNames[0]];
                            // Force range to start at A1 to preserve exact column indices
                            if (sheet['!ref']) {
                                const range = XLSX.utils.decode_range(sheet['!ref']);
                                range.s.c = 0; // Start at column A
                                sheet['!ref'] = XLSX.utils.encode_range(range);
                            }
                            dataArray = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
                        } else { // Handle CSV and other text files
                            const textContent = e.target.result;
                            const rows = textContent.split(/\\r\\n|\\n|\\r/);
                            // Auto-detect delimiter: check for tab, semicolon, or comma in the first few rows
                            let delimiter = ',';
                            const sampleRow = rows.length > 2 ? rows[2] : (rows[0] || '');
                            if (sampleRow.includes('\\t')) delimiter = '\\t';
                            else if (sampleRow.includes(';')) delimiter = ';';
                            dataArray = rows.map(row => row.split(delimiter));
                        }
                        let headerRowIndex = -1;
                        let debugInfo = [];
                        for (let i = 0; i < Math.min(10, dataArray.length); i++) {
                            debugInfo.push(\`Dòng \${i + 1}: \${JSON.stringify(dataArray[i])}\`);
                            if (validateDataStructure(dataArray[i])) {
                                headerRowIndex = i;
                                break;
                            }
                        }
                        
                        if (headerRowIndex === -1) {
                            console.warn("Không tìm thấy dòng tiêu đề chuẩn. Sẽ đọc toàn bộ dữ liệu.");
                        }
                        
                        // Lấy dữ liệu ngay sau dòng tiêu đề (nếu tìm thấy), ngược lại lấy từ dòng đầu tiên
                        const dataStartIndex = headerRowIndex !== -1 ? headerRowIndex + 1 : 0;
                        competitionData = dataArray.slice(dataStartIndex).filter(row => row && row.length > 0 && row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== ''));
                        if (competitionData.length === 0) throw new Error("File không có dữ liệu hợp lệ.");
                        preProcessData(competitionData);
                        fileStatus.textContent = \`Đã tải: \${file.name}\`;
                        fileStatus.className = 'mt-4 text-center text-sm font-medium text-green-600';
                        searchSection.classList.remove('hidden');
                        landingPage.classList.add('hidden');
                        changeFileButton.classList.remove('hidden');
                        window.parent.postMessage({ type: 'CHECK_THUONG_FILE_LOADED', code1: storeCodeInput1.value, code2: storeCodeInput2.value }, '*');
                        storeCodeInput1.focus();
                        if(storeCodeInput1.value) handleSearchOrCompare();
                        saveState();
                    } catch (error) {
                        const message = error instanceof Error ? error.message : String(error);
                        fileStatus.textContent = \`Lỗi: \${message}\`;
                        fileStatus.className = 'mt-4 text-left text-sm font-medium text-red-600 whitespace-pre-wrap bg-red-50 p-4 rounded-lg border border-red-200 overflow-auto max-h-60';
                    }
                };
                reader.onerror = () => fileStatus.textContent = 'Không thể đọc file đã chọn.';
                const fileExtension = file.name.split('.').pop().toLowerCase();
                if (['xlsx', 'xls'].includes(fileExtension)) {
                    reader.readAsArrayBuffer(file);
                } else {
                    reader.readAsText(file, 'UTF-8');
                }
            }

            function handleSearchOrCompare() {
                const code1 = storeCodeInput1.value.trim();
                const code2 = storeCodeInput2.value.trim();
                
                saveState();
                
                messageEl.classList.add('hidden');
                messageEl.textContent = '';
                
                if (!competitionData.length) { 
                    messageEl.textContent = 'Vui lòng tải file dữ liệu trước.'; 
                    messageEl.classList.remove('hidden'); 
                    mainContent.classList.add('hidden');
                    comparisonContent.classList.add('hidden');
                    return; 
                }

                if (!code1) {
                    mainContent.classList.add('hidden');
                    comparisonContent.classList.add('hidden');
                    return;
                }

                if (code2) {
                    handleCompare(code1, code2);
                } else {
                    handleSearch(code1);
                }
            }

            const isMatchStore = (row, targetCode) => {
                if (!row[COLS.NGANH_HANG] || String(row[COLS.NGANH_HANG]).trim() === '') return false;
                
                const storeStr = String(row[COLS.SIÊU_THỊ] || '').trim().toLowerCase();
                const searchCode = String(targetCode).trim().toLowerCase();
                
                if (!searchCode) return false;

                // 1. Exact match
                if (storeStr === searchCode) return true;
                
                // 2. Extract the first number sequence from the store string (e.g., "123" from "123 - Vĩnh Phúc")
                const codeMatch = storeStr.match(/^(\d+)/);
                if (codeMatch && codeMatch[1] === searchCode) return true;
                
                // 3. Match distinct word
                try {
                    // Escape special characters for regex
                    const escapedCode = searchCode.replace(/[-/\\\\^\\$*+?.()|[\\]{}]/g, '\\\\$&');
                    const regex = new RegExp(\`(^|[^a-zA-Z0-9])\${escapedCode}([^a-zA-Z0-9]|$)\`, 'i');
                    if (regex.test(storeStr)) return true;
                } catch (e) {
                    // Ignore regex errors
                }
                
                // 4. Fallback: if searchCode is not purely numeric, do a simple includes
                if (!/^\\d+$/.test(searchCode) && storeStr.includes(searchCode)) return true;
                
                return false;
            };

            function handleSearch(storeCode) {
                comparisonContent.classList.add('hidden');
                currentStoreData = competitionData.filter(row => isMatchStore(row, storeCode)); 
                if (currentStoreData.length === 0) { 
                    messageEl.textContent = \`Không tìm thấy kết quả nào cho mã kho "\${storeCode}". Vui lòng kiểm tra lại mã kho.\`; 
                    messageEl.classList.remove('hidden');
                    mainContent.classList.add('hidden');
                    return; 
                }
                mainContent.classList.remove('hidden');

                const totalBonus = currentStoreData.reduce((sum, row) => sum + parseNumber(row[COLS.TONG_THUONG]), 0); 
                const storeInfo = currentStoreData[0][COLS.SIÊU_THỊ]; 
                const top10Value = currentStoreData[0][COLS.LAY_TOP_10] || '-'; 
                
                const uploadDate = fileUploadTime ? new Date(fileUploadTime) : new Date();
                const timeStr = String(uploadDate.getHours()).padStart(2, '0') + ':' + String(uploadDate.getMinutes()).padStart(2, '0') + ' - ' + String(uploadDate.getDate()).padStart(2, '0') + '/' + String(uploadDate.getMonth() + 1).padStart(2, '0') + '/' + uploadDate.getFullYear();
                
                summaryCard.innerHTML = \`
                    <div style="position:absolute;top:16px;right:16px;display:flex;gap:8px;z-index:10" class="no-print">
                        <button id="exportFullPageImageButton" title="Xuất ảnh toàn bộ trang" style="padding:6px;border-radius:8px;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-image"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><circle cx="10" cy="12" r="2"/><path d="m20 17-1.296-1.296a2.41 2.41 0 0 0-3.408 0L9 22"/></svg>
                        </button>
                        <button id="exportSummaryImageButton" title="Xuất ảnh báo cáo tổng hợp" style="padding:6px;border-radius:8px;background:rgba(255,255,255,0.15);border:none;color:#fff;cursor:pointer;transition:all 0.15s" onmouseover="this.style.background='rgba(255,255,255,0.25)'" onmouseout="this.style.background='rgba(255,255,255,0.15)'">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </button>
                    </div>
                    <p style="font-size:13px;opacity:0.8;margin:0 0 2px 0;font-weight:500;display:flex;align-items:center;gap:6px">
                        Kết quả tra cứu
                        <span style="opacity:0.5">•</span>
                        <span style="font-weight:400;opacity:0.9">\${timeStr}</span>
                    </p>
                    <h2 style="font-size:20px;font-weight:800;margin:0;letter-spacing:-0.02em" class="truncate">\${storeInfo}</h2>
                    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.12)">
                        <p style="font-size:11px;opacity:0.6;margin:0;font-weight:600;text-transform:uppercase;letter-spacing:0.06em">Tổng tiền thưởng dự kiến</p>
                        <p style="font-size:36px;font-weight:800;margin:4px 0 0 0;letter-spacing:-0.02em">\${formatCurrencyFull(totalBonus)}</p>
                    </div>
                \`;
                 top10InfoCard.innerHTML = \`
                    <div style="display:flex;align-items:center;gap:8px">
                        <div style="width:3px;height:16px;background:linear-gradient(to bottom,#6366f1,#a78bfa);border-radius:2px"></div>
                        <span style="font-size:12px;font-weight:600;color:#6b7280">Tiêu Chí Đạt Giải:</span>
                        <span style="font-size:13px;font-weight:700;color:#4f46e5">Lấy Top \${top10Value} Theo Kênh</span>
                    </div>
                    <div id="filterContainer" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:6px"></div>
                \`;
                renderAnalysis(currentStoreData, totalBonus); 
                renderGroupedResults(currentStoreData); 
                renderSummaryAndFilters(getGroupDefinitions(currentStoreData)); 
            }
            
             function handleCompare(code1, code2) {
                mainContent.classList.add('hidden');
                const matchStore = (code) => {
                    return (row) => isMatchStore(row, code);
                };
                const store1Data = competitionData.filter(matchStore(code1));
                const store2Data = competitionData.filter(matchStore(code2));
                
                if (store1Data.length === 0 || store2Data.length === 0) {
                    let errorMsg = '';
                    if (store1Data.length === 0) errorMsg += \`Không tìm thấy dữ liệu cho kho "\${code1}". \`;
                    if (store2Data.length === 0) errorMsg += \`Không tìm thấy dữ liệu cho kho "\${code2}".\`;
                    messageEl.textContent = errorMsg;
                    messageEl.classList.remove('hidden');
                    comparisonContent.classList.add('hidden');
                    return;
                }
                
                renderComparison(store1Data, store2Data);
                comparisonContent.classList.remove('hidden');
            }

            function renderComparison(store1Data, store2Data) {
                const store1Info = store1Data[0]?.[COLS.SIÊU_THỊ] || \`Kho \${storeCodeInput1.value}\`;
                const store2Info = store2Data[0]?.[COLS.SIÊU_THỊ] || \`Kho \${storeCodeInput2.value}\`;
                const store1NameShort = store1Info.split(' ').slice(1).join(' ');
                const store2NameShort = store2Info.split(' ').slice(1).join(' ');

                const calcStats = (data) => {
                    const definitions = getGroupDefinitions(data);
                    return {
                        totalBonus: data.reduce((sum, row) => sum + parseNumber(row[COLS.TONG_THUONG]), 0),
                        achieved: definitions.find(d => d.key === 'achieved')?.data.length || 0,
                        nearly: definitions.find(d => d.key === 'nearly')?.data.length || 0,
                        bottom50: definitions.find(d => d.key === 'bottom50')?.data.length || 0,
                        noSale: definitions.find(d => d.key === 'noSale')?.data.length || 0,
                    };
                };
                const stats1 = calcStats(store1Data);
                const stats2 = calcStats(store2Data);

                const getWinnerIcon = (val1, val2, lowerIsBetter = false) => {
                    if (val1 === val2) return '';
                    const isWinner1 = lowerIsBetter ? val1 < val2 : val1 > val2;
                    return isWinner1 
                        ? \`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>\` 
                        : '';
                };
                
                const renderStatCard = (storeName, storeCode, stats, opponentStats, isStore1) => {
                     const colorScheme = isStore1 
                        ? { bg: 'bg-gradient-to-br from-blue-50 to-white', border: 'border-blue-100', text: 'text-blue-800', badgeBg: 'bg-blue-100', badgeText: 'text-blue-700', icon: 'text-blue-500' }
                        : { bg: 'bg-gradient-to-br from-purple-50 to-white', border: 'border-purple-100', text: 'text-purple-800', badgeBg: 'bg-purple-100', badgeText: 'text-purple-700', icon: 'text-purple-500' };

                     return \`
                        <div class="\${colorScheme.bg} p-4 border \${colorScheme.border} rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                             <div class="absolute top-0 right-0 p-3 opacity-10">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-20 w-20 \${colorScheme.icon}" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L2 22h20L12 2z"/></svg>
                             </div>
                             <div class="relative z-10 flex items-center gap-2 mb-4">
                                <span class="text-[11px] font-bold py-0.5 px-2.5 rounded-full \${colorScheme.badgeBg} \${colorScheme.badgeText} shadow-sm border border-white/50">\${storeCode}</span>
                                <h3 class="text-lg font-bold truncate \${colorScheme.text}">\${storeName}</h3>
                             </div>
                             <div class="relative z-10 space-y-2.5">
                                <div class="flex justify-between items-center pb-2 border-b border-gray-100/50"><span class="text-gray-500 font-medium text-xs">Tổng Thưởng</span><div class="flex items-center gap-1.5"><span class="font-extrabold text-xl text-gray-900">\${formatCurrency(stats.totalBonus)}</span> \${isStore1 ? getWinnerIcon(stats.totalBonus, opponentStats.totalBonus) : getWinnerIcon(opponentStats.totalBonus, stats.totalBonus)}</div></div>
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium text-xs">Môn đạt thưởng</span><div class="flex items-center gap-1.5"><span class="font-bold text-sm text-gray-800">\${stats.achieved}</span> \${isStore1 ? getWinnerIcon(stats.achieved, opponentStats.achieved) : getWinnerIcon(opponentStats.achieved, stats.achieved)}</div></div>
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium text-xs">Môn sắp có thưởng</span><div class="flex items-center gap-1.5"><span class="font-bold text-sm text-gray-800">\${stats.nearly}</span> \${isStore1 ? getWinnerIcon(stats.nearly, opponentStats.nearly) : getWinnerIcon(opponentStats.nearly, stats.nearly)}</div></div>
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium text-xs">Môn Bottom 50%</span><div class="flex items-center gap-1.5"><span class="font-bold text-sm text-gray-800">\${stats.bottom50}</span> \${isStore1 ? getWinnerIcon(stats.bottom50, opponentStats.bottom50, true) : getWinnerIcon(opponentStats.bottom50, stats.bottom50, true)}</div></div>
                                <div class="flex justify-between items-center"><span class="text-gray-500 font-medium text-xs">Môn No Sale</span><div class="flex items-center gap-1.5"><span class="font-bold text-sm text-gray-800">\${stats.noSale}</span> \${isStore1 ? getWinnerIcon(stats.noSale, opponentStats.noSale, true) : getWinnerIcon(opponentStats.noSale, stats.noSale, true)}</div></div>
                             </div>
                        </div>\`;
                };

                const allCategories = [...new Set([...store1Data.map(r => r[COLS.NGANH_HANG]), ...store2Data.map(r => r[COLS.NGANH_HANG])])];
                
                let comparisonData = allCategories.map(category => {
                    const row1 = store1Data.find(r => r[COLS.NGANH_HANG] === category);
                    const row2 = store2Data.find(r => r[COLS.NGANH_HANG] === category);
                    const bonus1 = parseNumber(row1?.[COLS.TONG_THUONG]);
                    const bonus2 = parseNumber(row2?.[COLS.TONG_THUONG]);
                    return {
                        category,
                        row1, row2,
                        percent1: parseNumber(row1?.[COLS.PERCENT_DU_KIEN]),
                        percent2: parseNumber(row2?.[COLS.PERCENT_DU_KIEN]),
                        rankV1: parseInt(row1?.[COLS.HANG_VUOT_Uu], 10) || Infinity,
                        rankV2: parseInt(row2?.[COLS.HANG_VUOT_Uu], 10) || Infinity,
                        bonus1, bonus2,
                        bonusDiff: bonus1 - bonus2
                    };
                });
                
                // Sort data based on state
                comparisonData.sort((a, b) => {
                    const valA = a[comparisonSortState.key];
                    const valB = b[comparisonSortState.key];
                    if (valA < valB) return comparisonSortState.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return comparisonSortState.direction === 'asc' ? 1 : -1;
                    return 0;
                });
                
                let tableRowsHtml = '';
                let index = 1;
                for (const item of comparisonData) {
                    const { category, row1, row2, percent1, percent2, rankV1, rankV2, bonus1, bonus2, bonusDiff } = item;
                    
                    const formatBonus = (val) => {
                        if (!val || val === 0) return '-';
                        const absVal = Math.abs(val);
                        if (absVal >= 1000000) {
                            return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(val / 1000000) + 'tr';
                        } else if (absVal >= 1000) {
                            return new Intl.NumberFormat('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 1 }).format(val / 1000) + 'k';
                        }
                        return new Intl.NumberFormat('vi-VN').format(val);
                    };

                    const getDiffClass = (diff, lowerIsBetter = false) => {
                        if (diff === 0) return 'text-gray-400 font-medium';
                        return (lowerIsBetter ? diff < 0 : diff > 0) ? 'text-green-600 font-bold' : 'text-red-500 font-bold';
                    };
                    const percentColor1 = row1 ? (percent1 < 1 ? 'text-red-500 font-bold' : 'text-green-600 font-bold') : 'text-gray-600';
                    const percentColor2 = row2 ? (percent2 < 1 ? 'text-red-500 font-bold' : 'text-green-600 font-bold') : 'text-gray-600';
                    
                    const textClass1 = bonusDiff > 0 ? 'text-green-700 font-bold' : (bonusDiff < 0 ? 'text-gray-600' : 'text-gray-600');
                    const textClass2 = bonusDiff < 0 ? 'text-green-700 font-bold' : (bonusDiff > 0 ? 'text-gray-600' : 'text-gray-600');

                    const bgStore1 = 'bg-blue-50/40';
                    const bgStore2 = 'bg-purple-50/40';

                    const formattedCategory = \`#\${index}. \${category}\`;
                    
                    tableRowsHtml += \`<tr class="hover:bg-gray-100 transition-colors group text-[13px]">
                        <td class="px-2 py-1.5 font-semibold text-gray-700 sticky left-0 bg-white group-hover:bg-gray-50 transition-colors border-r border-gray-200 shadow-[1px_0_0_0_#e5e7eb] truncate max-w-[200px] z-0" title="\${category}">\${formattedCategory}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore1} \${percentColor1} border-r border-gray-200">\${row1 ? formatPercent(percent1) : '-'}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore1} \${textClass1} border-r border-gray-200">\${rankV1 !== Infinity ? rankV1 : '-'}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore1} \${textClass1} border-r border-gray-200">\${formatBonus(bonus1)}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore2} \${percentColor2} border-r border-gray-200">\${row2 ? formatPercent(percent2) : '-'}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore2} \${textClass2} border-r border-gray-200">\${rankV2 !== Infinity ? rankV2 : '-'}</td>
                        <td class="px-1 py-1.5 text-center \${bgStore2} \${textClass2} border-r border-gray-200">\${formatBonus(bonus2)}</td>
                        <td class="px-2 py-1.5 text-center bg-emerald-50/30"><span class="\${getDiffClass(bonusDiff)}">\${formatBonus(bonusDiff)}</span></td>
                    </tr>\`;
                    index++;
                }
                
                const categoryDifferences = comparisonData.map(d => ({ name: d.category, diff: d.bonusDiff }));
                const renderTop3Strengths = (storeData, isStore1) => {
                    const sorted = storeData.filter(r => parseNumber(r[COLS.TONG_THUONG]) > 0)
                                      .sort((a,b) => parseNumber(b[COLS.TONG_THUONG]) - parseNumber(a[COLS.TONG_THUONG]))
                                      .slice(0, 3);
                    if (sorted.length === 0) return \`<p class="text-gray-500 italic px-2 text-xs">Không có môn nào có thưởng.</p>\`;
                    
                    const colorClass = isStore1 ? 'text-blue-700' : 'text-purple-700';
                    
                    return \`<ul class="space-y-0">\` + sorted.map(item => \`<li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><strong class="text-gray-700 truncate mr-2 text-xs" title="\${item[COLS.NGANH_HANG]}">\${item[COLS.NGANH_HANG]}</strong> <span class="font-bold \${colorClass} text-xs whitespace-nowrap">\${formatCurrencySimple(item[COLS.TONG_THUONG])}</span></li>\`).join('') + \`</ul>\`;
                };

                const store1AwardedHtml = store1Data.filter(r => parseNumber(r[COLS.TONG_THUONG]) > 0)
                    .sort((a, b) => parseNumber(b[COLS.TONG_THUONG]) - parseNumber(a[COLS.TONG_THUONG]))
                    .map((r, i) => \`<li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div class="flex items-center gap-1.5 overflow-hidden"><span class="font-bold text-blue-300 text-[11px]">#\${i+1}</span><strong class="truncate" title="\${r[COLS.NGANH_HANG]}">\${r[COLS.NGANH_HANG]}</strong></div> <span class="font-semibold text-blue-700 whitespace-nowrap ml-2">\${formatCurrencySimple(r[COLS.TONG_THUONG])}</span></li>\`) 
                    .join('') || \`<li class="italic text-gray-400">Không có</li>\`;
                const store2AwardedHtml = store2Data.filter(r => parseNumber(r[COLS.TONG_THUONG]) > 0)
                    .sort((a, b) => parseNumber(b[COLS.TONG_THUONG]) - parseNumber(a[COLS.TONG_THUONG]))
                    .map((r, i) => \`<li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0"><div class="flex items-center gap-1.5 overflow-hidden"><span class="font-bold text-purple-300 text-[11px]">#\${i+1}</span><strong class="truncate" title="\${r[COLS.NGANH_HANG]}">\${r[COLS.NGANH_HANG]}</strong></div> <span class="font-semibold text-purple-700 whitespace-nowrap ml-2">\${formatCurrencySimple(r[COLS.TONG_THUONG])}</span></li>\`)
                    .join('') || \`<li class="italic text-gray-400">Không có</li>\`;

                const sortClass = comparisonSortState.key === 'bonusDiff' ? (comparisonSortState.direction === 'asc' ? 'sort-asc' : 'sort-desc') : '';

                const shortenName = (name) => {
                    if (!name) return '';
                    const parts = name.split(' - ');
                    return parts.length > 1 ? parts[parts.length - 1] : name;
                };

                comparisonContent.innerHTML = \`
                    <div class="space-y-4">
                        <div id="captureComparisonMain">
                            <div class="bg-white/80 backdrop-blur-sm border border-gray-200/80 p-4 shadow-sm mb-4 flex justify-between items-center">
                                <h2 class="text-xl sm:text-2xl font-bold text-gray-800">So Sánh Trực Diện</h2>
                                <button id="exportComparisonImageButton" title="Xuất ảnh so sánh" class="p-2 bg-gray-100 hover:bg-gray-200 text-gray-600 transition shadow-sm no-print">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>
                                </button>
                            </div>

                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">\${renderStatCard(store1NameShort, storeCodeInput1.value.trim(), stats1, stats2, true)}\${renderStatCard(store2NameShort, storeCodeInput2.value.trim(), stats2, stats1, false)}</div>
                            
                            <div id="strengthsAnalysisSection" class="bg-white/90 backdrop-blur-md border border-gray-200/60 shadow-sm p-4 mt-4">
                                <div class="flex justify-between items-center mb-3 pb-3 border-b border-gray-100/80">
                                    <h3 class="text-lg font-bold text-gray-800">Phân Tích Nhanh: Top 3 Nhóm Thưởng Cao Nhất</h3>
                                    <div class="flex items-center gap-2 no-print">
                                        <button id="exportStrengthsImageButton" title="Xuất ảnh phân tích nhanh" class="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 transition shadow-sm border border-gray-200/50">
                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>
                                        </button>
                                        <button id="toggleAllStrengthsButton" class="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 hover:bg-indigo-100 transition border border-indigo-100/50">Xem tất cả</button>
                                    </div>
                                </div>
                                 <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm" id="topStrengthsContainer">
                                    <div class="border border-blue-200 bg-white">
                                        <div class="bg-blue-50/70 p-2.5 border-b border-blue-100">
                                            <h4 class="font-bold text-blue-800 flex items-center gap-1.5 text-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Thế mạnh của \${store1NameShort}</h4>
                                        </div>
                                        <div class="p-2.5">
                                            \${renderTop3Strengths(store1Data, true)}
                                        </div>
                                    </div>
                                    <div class="border border-purple-200 bg-white">
                                        <div class="bg-purple-50/70 p-2.5 border-b border-purple-100">
                                            <h4 class="font-bold text-purple-800 flex items-center gap-1.5 text-sm"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg> Thế mạnh của \${store2NameShort}</h4>
                                        </div>
                                        <div class="p-2.5">
                                            \${renderTop3Strengths(store2Data, false)}
                                        </div>
                                    </div>
                                 </div>
                                 <div class="hidden mt-4 pt-4 border-t border-gray-100" id="allStrengthsContainer">
                                    <h3 class="text-md font-bold text-center mb-4 text-gray-800">Danh sách tất cả các môn có giải</h3>
                                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                                        <div class="border border-blue-100 p-3">
                                            <h4 class="font-bold text-blue-800 mb-2 flex items-center gap-2 border-b border-blue-100/50 pb-1.5">Kho \${store1NameShort}</h4>
                                            <ul class="space-y-0 text-gray-700">\${store1AwardedHtml}</ul>
                                        </div>
                                        <div class="border border-purple-100 p-3">
                                            <h4 class="font-bold text-purple-800 mb-2 flex items-center gap-2 border-b border-purple-100/50 pb-1.5">Kho \${store2NameShort}</h4>
                                            <ul class="space-y-0 text-gray-700">\${store2AwardedHtml}</ul>
                                        </div>
                                    </div>
                                 </div>
                            </div>
                        </div>

                        <div id="captureDetailTable" class="bg-white border border-gray-200/80 shadow-sm mt-5 overflow-hidden">
                             <div class="flex justify-between items-center p-3.5 bg-gray-50 border-b border-gray-200/80">
                                <h3 class="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <svg class="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                    So Sánh Chi Tiết Ngành Hàng
                                </h3>
                                <button id="exportDetailTableImageButton" title="Xuất ảnh bảng chi tiết" class="p-1.5 bg-white border border-gray-200 hover:bg-gray-100 text-gray-600 transition shadow-sm no-print">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd"></path></svg>
                                </button>
                            </div>
                            <div id="detailTableContainer" class="w-full">
                                <table id="detailComparisonTable" class="w-full text-[13px]">
                                    <thead class="sticky top-0 z-10 text-[13px]">
                                        <tr>
                                            <th rowspan="2" class="px-2 py-2 text-center font-bold text-gray-700 sticky left-0 bg-slate-100 align-middle uppercase border-b border-r border-gray-200 shadow-[1px_0_0_0_#e5e7eb] z-20">Ngành Hàng</th>
                                            <th colspan="3" class="px-1 py-2 text-center font-bold text-blue-800 border-b border-r border-gray-200 bg-blue-100 truncate max-w-[120px]" title="\${store1NameShort}">\${shortenName(store1NameShort)}</th>
                                            <th colspan="3" class="px-1 py-2 text-center font-bold text-purple-800 border-b border-r border-gray-200 bg-purple-100 truncate max-w-[120px]" title="\${store2NameShort}">\${shortenName(store2NameShort)}</th>
                                            <th rowspan="2" class="px-2 py-2 text-center font-bold text-emerald-800 border-b border-gray-200 bg-emerald-100/60 align-middle sortable \${sortClass} hover:bg-emerald-100 transition cursor-pointer group w-[90px]" data-sort-key="bonusDiff">
                                                <div class="flex items-center justify-center gap-1 uppercase">Chênh lệch <span class="text-emerald-400 group-hover:text-emerald-600">&#8597;</span></div>
                                            </th>
                                        </tr>
                                        <tr>
                                            <th class="px-1 py-1.5 text-center font-semibold text-blue-800 border-b border-r border-gray-200 bg-blue-50/80">%DKHT</th>
                                            <th class="px-1 py-1.5 text-center font-semibold text-blue-800 border-b border-r border-gray-200 bg-blue-50/80">Hạng</th>
                                            <th class="px-1 py-1.5 text-center font-semibold text-blue-800 border-b border-r border-gray-200 bg-blue-50/80">Thưởng</th>
                                            <th class="px-1 py-1.5 text-center font-semibold text-purple-800 border-b border-r border-gray-200 bg-purple-50/80">%DKHT</th>
                                            <th class="px-1 py-1.5 text-center font-semibold text-purple-800 border-b border-r border-gray-200 bg-purple-50/80">Hạng</th>
                                            <th class="px-1 py-1.5 text-center font-semibold text-purple-800 border-b border-r border-gray-200 bg-purple-50/80">Thưởng</th>
                                        </tr>
                                    </thead>
                                    <tbody class="divide-y divide-gray-200 bg-white">\${tableRowsHtml}</tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                \`;
            }

            function renderAnalysis(data, totalBonus) {
                analysisSection.innerHTML = ''; 
                if (!data || data.length === 0) return; 
                const achievedCount = data.filter(row => parseNumber(row[COLS.TONG_THUONG]) > 0).length; 
                const totalCategories = data.length; 
                const warningList = data.filter(row => { const bonus = parseNumber(row[COLS.TONG_THUONG]); if (bonus === 0) return false; const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10); if (isNaN(cutoffRank)) return false; const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10); const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10); const isAtRiskVuot = !isNaN(rankVuot) && rankVuot <= cutoffRank && rankVuot > cutoffRank - 3; const isAtRiskTarget = !isNaN(rankTarget) && rankTarget <= cutoffRank && rankTarget > cutoffRank - 3; return isAtRiskVuot || isAtRiskTarget; }); 
                const opportunityList = data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; if (parseNumber(row[COLS.TONG_THUONG]) > 0) return false; const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10); if (isNaN(cutoffRank)) return false; const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10); const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10); const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20; const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20; return isNearlyVuot || isNearlyTarget; }).map(row => { const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10); const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10); const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10); let ranksNeeded = Infinity; if (!isNaN(rankVuot) && rankVuot > cutoffRank) ranksNeeded = Math.min(ranksNeeded, rankVuot - cutoffRank); if (!isNaN(rankTarget) && rankTarget > cutoffRank) ranksNeeded = Math.min(ranksNeeded, rankTarget - cutoffRank); return { name: row[COLS.NGANH_HANG], ranksNeeded: ranksNeeded, kenh: row[COLS.KENH] }; }).sort((a,b) => a.ranksNeeded - b.ranksNeeded); 
                const bottomCount = data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; const key = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG] || 'N/A'}\`; const median = bottom50MedianMap[key]; return median !== undefined && parseNumber(row[COLS.PERCENT_DU_KIEN]) <= median; }).length; 
                const noSaleCount = data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; return parseNumber(row[COLS.PERCENT_DU_KIEN]) == 0; }).length; 
                let html = \`<div class="flex justify-between items-center mb-4">
                                <h2 class="text-xl sm:text-2xl font-bold text-[#1d1d1f]">Phân Tích & Đề Xuất</h2>
                                <div id="analysisActions" class="flex items-center gap-2 no-print">
                                    <button id="copyAnalysisButton" title="Sao chép nội dung" class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lucide lucide-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
                                    </button>
                                    <button id="exportAnalysisImageButton" title="Xuất ảnh khu vực này" class="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-600 transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lucide lucide-camera" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                    </button>
                                    <button id="exportAnalysisRankingsButton" title="Xuất ảnh tất cả BXH Cơ hội vàng & Cảnh báo" class="p-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition">
                                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 lucide lucide-images" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/></svg>
                                    </button>
                                </div>
                            </div>
                            <div id="analysisContent" class="space-y-4">\`; 
                html += \`<div class="flex items-start space-x-4"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><div><p class="font-semibold text-sm text-[#1d1d1f]">Siêu thị đã xuất sắc đạt được tổng giải thưởng là <strong class="text-blue-600">\${formatCurrency(totalBonus)}</strong> với <strong class="text-blue-600">\${achievedCount}/\${totalCategories}</strong> môn thi đang có thưởng.</p></div></div>\`; 
                if (warningList.length > 0) { 
                    html += \`<div class="flex items-start space-x-4"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
                    <div>
                        <p class="font-semibold text-sm text-[#1d1d1f]">Cảnh báo: <span class="text-yellow-600">Có \${warningList.length} môn</span> đang có thưởng nhưng ở vị trí mấp mé. Cần chú ý duy trì để không rớt hạng:</p>
                        <ul class="list-disc list-inside mt-2 text-[#6e6e73] text-xs space-y-1">
                            \${warningList.map(item => \`
                                <li class="opportunity-item cursor-pointer hover:text-blue-600 hover:underline" data-group-name="\${item[COLS.NGANH_HANG]}" data-group-channel="\${item[COLS.KENH]}">
                                    <strong>\${item[COLS.NGANH_HANG]}</strong>
                                </li>
                            \`).join('')}
                        </ul>
                    </div></div>\`;
                } 
                if (opportunityList.length > 0) { html += \`<div class="flex items-start space-x-4"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518 4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg></div><div><p class="font-semibold text-sm text-[#1d1d1f]">Cơ hội vàng: <span class="text-green-600">Tập trung vào \${opportunityList.length} môn tiềm năng</span> sau để tối đa hóa giải thưởng:</p><ul class="list-disc list-inside mt-2 text-[#6e6e73] text-xs space-y-1">\${opportunityList.map(item => \`<li class="opportunity-item cursor-pointer hover:text-blue-600 hover:underline" data-group-name="\${item.name}" data-group-channel="\${item.kenh}"><strong>\${item.name}:</strong> cần cải thiện <strong class="text-green-700">\${item.ranksNeeded}</strong> hạng.</li>\`).join('')}</ul></div></div>\`; } 
                if(bottomCount > 0 || noSaleCount > 0) { html += \`<div class="flex items-start space-x-4"><div class="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg></div><div><p class="font-semibold text-sm text-[#1d1d1f]">Điểm cần bứt phá: <span class="text-red-600">Có \${bottomCount} môn ở TOP 50%</span> dưới và <span class="text-red-600">\${noSaleCount} môn chưa phát sinh doanh số</span>. Cần xem xét lại chiến lược và tìm giải pháp cải thiện.</p></div></div>\`; } 
                html += \`</div>\`; 
                analysisSection.innerHTML = html; 
            }

            function getGroupDefinitions(data) {
                return [
                    { key: 'achieved', title: 'Đạt thưởng', color: 'bg-green-500', data: data.filter(row => parseNumber(row[COLS.TONG_THUONG]) > 0) },
                    { key: 'nearly', title: 'Sắp có', color: 'bg-yellow-500', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; if (parseNumber(row[COLS.TONG_THUONG]) > 0) return false; const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10); if (isNaN(cutoffRank)) return false; const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10); const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10); const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20; const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20; return isNearlyVuot || isNearlyTarget;}) },
                    { key: 'achieved100', title: 'Đạt 100%', color: 'bg-teal-500', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; return parseNumber(row[COLS.PERCENT_DU_KIEN]) >= 1; }) },
                    { key: 'notAchieved100', title: '<100%', color: 'bg-orange-500', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; return parseNumber(row[COLS.PERCENT_DU_KIEN]) < 1; }) },
                    { key: 'bottom50', title: 'Bottom 50%', color: 'bg-red-500', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; const key = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG] || 'N/A'}\`; const median = bottom50MedianMap[key]; return median !== undefined && parseNumber(row[COLS.PERCENT_DU_KIEN]) <= median;}) },
                    { key: 'noFund', title: 'Không Quỹ', color: 'bg-purple-500', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; return noFundGroups.has(groupKey); }) },
                    { key: 'noSale', title: 'No Sale', color: 'bg-gray-600', data: data.filter(row => { const groupKey = \`\${row[COLS.KENH] || 'N/A'}|\${row[COLS.NGANH_HANG]}\`; if (noFundGroups.has(groupKey)) return false; return parseNumber(row[COLS.PERCENT_DU_KIEN]) == 0; }) }
                ];
            }

            function renderSummaryAndFilters(groups) {
                const statColors = {achieved:'#10b981',nearly:'#f59e0b',bottom50:'#f43f5e',noFund:'#8b5cf6',noSale:'#64748b',achieved100:'#14b8a6',notAchieved100:'#f97316'};
                groupSummaryContainer.innerHTML = groups.map(g => \`
                    <div class="stat-mini" onclick="const el=document.getElementById('group-section-\${g.key}');if(el){const y=el.getBoundingClientRect().top+window.scrollY-20;window.scrollTo({top:y,behavior:'smooth'});}" style="--stat-color: \${statColors[g.key]||'#6366f1'}">
                        <div style="position: absolute; top: -15px; right: -15px; width: 50px; height: 50px; background: \${statColors[g.key]||'#6366f1'}; filter: blur(25px); opacity: 0.2; border-radius: 50%; pointer-events: none;"></div>
                        <div style="display:flex; align-items:flex-start; margin-bottom:10px; width: 100%; position: relative; z-index: 1">
                            <p style="font-size:10.5px;color:#475569;font-weight:700;margin:0;text-transform:uppercase;letter-spacing:0.02em;line-height:1.3;white-space:normal;word-break:keep-all" title="\${g.title}">\${g.title}</p>
                        </div>
                        <p style="font-size:26px;font-weight:800;color:#0f172a;margin:0;line-height:1; position: relative; z-index: 1; font-feature-settings: 'tnum'; letter-spacing: -0.02em">\${g.data.length}</p>
                    </div>
                \`).join('');
                const filterContainer = document.getElementById('filterContainer');
                if (!filterContainer) return;
                filterContainer.innerHTML = \`<button data-filter="all" class="filter-btn filter-pill active">All (\${currentStoreData.length})</button>\` 
                + groups.map(g => \`<button data-filter="\${g.key}" class="filter-btn filter-pill">\${g.title} (\${g.data.length})</button>\`).join('')
                + \`<div style="display:flex;gap:4px;margin-left:8px" class="no-print">
                        <button id="toggleViewModeBtn" title="Chuyển chế độ hiển thị (Danh sách / Thẻ)" style="width:30px;height:30px;border-radius:8px;background:#4f46e5;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
                            \${singleViewMode === 'list' 
                                ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>' 
                                : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>'}
                        </button>
                        <button id="exportFilteredImageButton" title="Xuất ảnh" style="width:30px;height:30px;border-radius:8px;background:#10b981;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                        </button>
                        <button id="exportAllFilteredImagesButton" title="Xuất tất cả" style="width:30px;height:30px;border-radius:8px;background:#f97316;color:#fff;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-images"><path d="M18 22H4a2 2 0 0 1-2-2V6"/><path d="m22 13-1.296-1.296a2.41 2.41 0 0 0-3.408 0L11 18"/><circle cx="12" cy="8" r="2"/><rect width="16" height="16" x="6" y="2" rx="2"/></svg>
                        </button>
                   </div>\`;
            }

            const PALETTE = [
                { bg: 'card-pastel-0' }, { bg: 'card-pastel-1' },
                { bg: 'card-pastel-2' }, { bg: 'card-pastel-3' },
                { bg: 'card-pastel-4' }, { bg: 'card-pastel-5' },
                { bg: 'card-pastel-6' }, { bg: 'card-pastel-7' },
                { bg: 'card-pastel-8' }, { bg: 'card-pastel-9' },
                { bg: 'card-pastel-10' }, { bg: 'card-pastel-11' },
                { bg: 'card-pastel-12' }, { bg: 'card-pastel-13' },
                { bg: 'card-pastel-14' },
            ];

            function getGroupColor(groupName) {
                if (!groupName) return PALETTE[0];
                let hash = 0;
                for (let i = 0; i < groupName.length; i++) {
                    hash = groupName.charCodeAt(i) + ((hash << 5) - hash);
                }
                const index = Math.abs(hash % PALETTE.length);
                return PALETTE[index];
            }
            
            function sortRankingData(key) {
                if (!key || key === 'null') return;
                if (sortState.key === key) {
                    sortState.direction = sortState.direction === 'asc' ? 'desc' : 'asc';
                } else {
                    sortState.key = key;
                    sortState.direction = 'asc'; // First click is always ascending
                }
                const isNumeric = ['PERCENT_DU_KIEN', 'DU_KIEN_VUOT', 'HANG_VUOT_Uu', 'HANG_PERCENT_TARGET', 'TONG_THUONG'].includes(key);
                rankingDataForModal.sort((a, b) => {
                    const valA = isNumeric ? parseNumber(a[COLS[key]]) : (a[COLS[key]] || '').toString();
                    const valB = isNumeric ? parseNumber(b[COLS[key]]) : (b[COLS[key]] || '').toString();
                    if (valA < valB) return sortState.direction === 'asc' ? -1 : 1;
                    if (valA > valB) return sortState.direction === 'asc' ? 1 : -1;
                    return 0;
                });
                renderRankingTable(rankingDataForModal, modalTitle.textContent);
            }
            
            function renderRankingTable(data, titleText) {
                const currentStoreFullName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ] : '';
                const sortKeys = { sieuthi: 'SIÊU_THỊ', percent: 'PERCENT_DU_KIEN', du_kien_vuot: 'DU_KIEN_VUOT', rank_v: 'HANG_VUOT_Uu', rank_t: 'HANG_PERCENT_TARGET', bonus: 'TONG_THUONG' };
                
                const titleOnly = titleText.replace("Bảng Xếp Hạng: ", "");

                let tableHtml = \`<h4 class="text-xl font-bold text-center mb-4 text-indigo-600 uppercase">\${titleOnly}</h4>
                                 <div class="overflow-x-auto"><table class="text-sm text-left text-gray-500"><thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr>\`;
                
                Object.entries(sortKeys).forEach(([key, col]) => {
                    const isSortable = col !== null;
                    const thClass = \`px-4 py-1 text-center \${isSortable ? 'sortable' : ''} \${sortState.key === col ? (sortState.direction === 'asc' ? 'sort-asc' : 'sort-desc') : ''}\`;
                    const title = { sieuthi: 'SIÊU THỊ', percent: '%DKHT', du_kien_vuot: 'D.KIẾN DT/SL', rank_v: 'HẠNG V.TRỘI', rank_t: 'HẠNG %HT', bonus: 'THƯỞNG' }[key];
                    tableHtml += \`<th scope="col" class="\${thClass}" \${isSortable ? \`data-sort-key="\${col}"\` : ''}>\${title}</th>\`;
                });

                tableHtml += \`</tr></thead><tbody>\`;
                data.forEach((row, index) => {
                    const isCurrentStore = row[COLS.SIÊU_THỊ] === currentStoreFullName;
                    tableHtml += \`<tr class="\${isCurrentStore ? 'bg-blue-100 font-bold text-blue-900 border-l-4 border-blue-500' : 'bg-white border-b'}">
                                    <th scope="row" class="px-4 py-1 font-medium \${isCurrentStore ? '' : 'text-gray-900'} whitespace-nowrap">\${row[COLS.SIÊU_THỊ]}</th>
                                    <td class="px-4 py-1 text-right">\${formatPercent(row[COLS.PERCENT_DU_KIEN])}</td>
                                    <td class="px-4 py-1 text-right">\${formatNumber(row[COLS.DU_KIEN_VUOT])}</td>
                                    <td class="px-4 py-1 text-right">\${row[COLS.HANG_VUOT_Uu] || '-'}</td>
                                    <td class="px-4 py-1 text-right">\${row[COLS.HANG_PERCENT_TARGET] || '-'}</td>
                                    <td class="px-4 py-1 text-right">\${formatCurrencySimple(row[COLS.TONG_THUONG])}</td>
                                  </tr>\`;
                });
                tableHtml += \`</tbody></table></div>\`;
                modalBody.innerHTML = tableHtml;
            }

            function showRankingModal(groupName, groupChannel) {
                rankingDataForModal = competitionData.filter(row => row[COLS.NGANH_HANG] === groupName && row[COLS.KENH] === groupChannel);
                
                const currentStoreFullName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ] : '';
                const priorityStoreRow = rankingDataForModal.find(row => row[COLS.SIÊU_THỊ] === currentStoreFullName);

                let prioritySortKey = COLS.HANG_VUOT_Uu;
                let secondarySortKey = COLS.HANG_PERCENT_TARGET;

                if (priorityStoreRow) {
                    const rankVuot = parseInt(priorityStoreRow[COLS.HANG_VUOT_Uu], 10) || Infinity;
                    const rankTarget = parseInt(priorityStoreRow[COLS.HANG_PERCENT_TARGET], 10) || Infinity;

                    if (rankTarget < rankVuot) {
                        prioritySortKey = COLS.HANG_PERCENT_TARGET;
                        secondarySortKey = COLS.HANG_VUOT_Uu;
                    }
                }
                
                rankingDataForModal.sort((a, b) => {
                    const priorityA = parseInt(a[prioritySortKey], 10) || Infinity;
                    const priorityB = parseInt(b[prioritySortKey], 10) || Infinity;
                    if (priorityA !== priorityB) {
                        return priorityA - priorityB;
                    }

                    const secondaryA = parseInt(a[secondarySortKey], 10) || Infinity;
                    const secondaryB = parseInt(b[secondarySortKey], 10) || Infinity;
                    return secondaryA - secondaryB;
                });
                
                sortState = { key: null, direction: 'desc' }; 
                const titleText = \`Bảng Xếp Hạng: \${groupName} - Kênh \${groupChannel}\`;
                renderRankingTable(rankingDataForModal, titleText);
                
                modalTitle.textContent = titleText;
                rankingModal.classList.remove('hidden');
            }

            function getPotentialBonus(row) {
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
            }

            function renderGroupedResults(data) {
                detailsGrid.innerHTML = '';
                if (!data || data.length === 0) return;

                const groupDefinitions = getGroupDefinitions(data);

                const sortCards = (a, b) => {
                    const bonusB = parseNumber(b[COLS.TONG_THUONG]);
                    const bonusA = parseNumber(a[COLS.TONG_THUONG]);
                    if (bonusA !== bonusB) return bonusB - bonusA;
                    return parseNumber(b[COLS.PERCENT_DU_KIEN]) - parseNumber(a[COLS.PERCENT_DU_KIEN]);
                };

                const sortList = (a, b) => {
                    const percentB = parseNumber(b[COLS.PERCENT_DU_KIEN]);
                    const percentA = parseNumber(a[COLS.PERCENT_DU_KIEN]);
                    if (percentA !== percentB) return percentB - percentA;
                    const bonusB = parseNumber(b[COLS.TONG_THUONG]);
                    const bonusA = parseNumber(a[COLS.TONG_THUONG]);
                    return bonusB - bonusA;
                };

                const renderSingleRow = (row, groupKey, index) => {
                    const groupNameVal = row[COLS.NGANH_HANG];
                    const groupChannelVal = row[COLS.KENH];
                    const groupKey2 = \`\${groupChannelVal || 'N/A'}|\${groupNameVal}\`;
                    const groupHasFund = !noFundGroups.has(groupKey2);

                    const isAchieved = parseNumber(row[COLS.TONG_THUONG]) > 0;
                    
                    const cutoffRank = parseInt(row[COLS.LAY_TOP_10], 10);
                    const rankVuot = parseInt(row[COLS.HANG_VUOT_Uu], 10);
                    const rankTarget = parseInt(row[COLS.HANG_PERCENT_TARGET], 10);
                    const isNearlyVuot = !isNaN(rankVuot) && rankVuot > cutoffRank && rankVuot <= cutoffRank + 20;
                    const isNearlyTarget = !isNaN(rankTarget) && rankTarget > cutoffRank && rankTarget <= cutoffRank + 20;
                    const isNearly = groupHasFund && !isAchieved && !isNaN(cutoffRank) && (isNearlyVuot || isNearlyTarget);

                    let totalBonus = 0;
                    const showDuKien = !isAchieved && groupHasFund;

                    if (showDuKien || isNearly) {
                        const potential = getPotentialBonus(row);
                        totalBonus = potential.vuot + potential.top;
                    } else {
                        totalBonus = parseNumber(row[COLS.TONG_THUONG]);
                    }

                    const percent = parseNumber(row[COLS.PERCENT_DU_KIEN]);
                    const percentColor = percent < 1 ? 'text-red-500 font-bold' : 'text-green-600 font-bold';
                    
                    const hangVuot = row[COLS.HANG_VUOT_Uu] || '-';
                    const hangPercent = row[COLS.HANG_PERCENT_TARGET] || '-';
                    
                    const isDuKien = showDuKien || isNearly;
                    const bonusColor = isDuKien ? 'text-amber-600' : 'text-indigo-600';
                    
                    const nearlyBadgeHtml = isNearly ? \`<span class="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-bold rounded-sm uppercase whitespace-nowrap border border-amber-200">Sắp đạt thưởng</span>\` : '';
                    
                    return \`
                        <tr class="hover:bg-gray-50 transition-colors text-[13px] border-b border-gray-100 last:border-0 group">
                            <td class="px-3 py-2 font-medium text-gray-800">
                                <div class="flex items-center gap-2">
                                    <span class="text-gray-400 font-bold text-[11px]">#\${index}</span>
                                    <span class="truncate max-w-[280px]" title="\${groupNameVal}">\${groupNameVal}</span>\${nearlyBadgeHtml}
                                    <button class="view-ranking-btn no-print ml-1 text-gray-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Xem xếp hạng" data-group-name="\${groupNameVal}" data-group-channel="\${groupChannelVal}">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM1 15a1 1 0 100 2h18a1 1 0 100-2H1z" /></svg>
                                    </button>
                                </div>
                            </td>
                            <td class="px-2 py-2 text-center \${percentColor}">\${formatPercent(percent)}</td>
                            <td class="px-2 py-2 text-center text-gray-700">\${formatNumber(row[COLS.DU_KIEN_VUOT])}</td>
                            <td class="px-2 py-2 text-center text-gray-600">\${hangVuot} <span class="text-gray-300">/</span> \${hangPercent}</td>
                            <td class="px-3 py-2 text-right font-bold \${bonusColor}">\${formatCurrency(totalBonus)}</td>
                        </tr>
                    \`;
                };

                const GROUP_PASTEL_HEADERS = {
                    achieved: 'pastel-green',
                    nearly: 'pastel-amber',
                    bottom50: 'pastel-rose',
                    noFund: 'pastel-violet',
                    noSale: 'pastel-slate',
                    achieved100: 'pastel-teal',
                    notAchieved100: 'pastel-orange'
                };

                const renderSingleCard = (row, groupKey) => {
                    const isNearly = groupKey === 'nearly';
                    const isAchieved = groupKey === 'achieved';
                    let thuongVuot = 0;
                    let thuongTop = 0;
                    let totalBonus = 0;

                    // Check if this group has bonuses (for showing "dự kiến")
                    const groupNameVal = row[COLS.NGANH_HANG];
                    const groupChannelVal = row[COLS.KENH];
                    const groupKey2 = \`\${groupChannelVal || 'N/A'}|\${groupNameVal}\`;
                    const groupHasFund = !noFundGroups.has(groupKey2);
                    const showDuKien = !isAchieved && groupHasFund && parseNumber(row[COLS.TONG_THUONG]) === 0;

                    if (showDuKien || isNearly) {
                        const potential = getPotentialBonus(row);
                        thuongVuot = potential.vuot;
                        thuongTop = potential.top;
                        totalBonus = thuongVuot + thuongTop;
                    } else {
                        thuongVuot = parseNumber(row[COLS.THUONG_VUOT_Uu]);
                        thuongTop = parseNumber(row[COLS.THUONG_TOP_PERCENT]);
                        totalBonus = parseNumber(row[COLS.TONG_THUONG]);
                    }

                    const groupName = String(row[COLS.NGANH_HANG]);
                    const { bg } = getGroupColor(groupName);
                    const isDuKien = showDuKien || isNearly;

                    const thuongVuotHtml = thuongVuot > 0 ? \`
                        <div style="display:flex;justify-content:space-between;align-items:center;color:#059669;font-size:11px;white-space:nowrap">
                            <span style="font-weight:600">\${isDuKien ? 'Thưởng V.Trội D.Kiến:' : 'Thưởng Vượt Trội:'}</span>
                            <span style="font-weight:700">\${formatCurrency(thuongVuot)}</span>
                        </div>\` : '';

                    const thuongTopHtml = thuongTop > 0 ? \`
                        <div style="display:flex;justify-content:space-between;align-items:center;color:#7c3aed;font-size:11px;white-space:nowrap">
                            <span style="font-weight:600">\${isDuKien ? 'Thưởng Top % D.Kiến:' : 'Thưởng Top % Target:'}</span>
                            <span style="font-weight:700">\${formatCurrency(thuongTop)}</span>
                        </div>\` : '';
                    
                    let footerLabel = isDuKien ? 'D.KIẾN THƯỞNG' : 'TỔNG THƯỞNG';
                    let showBreakdown = false;
                    let footerColor = isDuKien ? '#f59e0b' : '#4f46e5';

                    if (thuongVuot > 0 && thuongTop > 0) {
                        showBreakdown = true;
                    } else if (thuongVuot > 0) {
                        footerLabel = isDuKien ? 'THƯỞNG V.TRỘI D.KIẾN' : 'THƯỞNG VƯỢT TRỘI';
                        footerColor = '#059669'; // text-emerald-600
                    } else if (thuongTop > 0) {
                        footerLabel = isDuKien ? 'THƯỞNG TOP % D.KIẾN' : 'THƯỞNG TOP % TARGET';
                        footerColor = '#7c3aed'; // text-purple-600
                    }

                    const bonusSectionHtml = showBreakdown ? 
                        \`<div class="bonus-row-pastel" style="margin-top:6px;display:flex;flex-direction:column;gap:2px">\${thuongVuotHtml}\${thuongTopHtml}</div>\` : '';

                    const footerBg = isDuKien ? 'linear-gradient(135deg,#fffbeb,#fef3c7)' : 'linear-gradient(135deg,#eef2ff,#e0e7ff)';
                    const footerHtml = \`
                        <div style="margin-top:auto;padding:7px 10px;border-top:1px solid rgba(0,0,0,0.06);background:\${footerBg}">
                            <div style="display:flex;justify-content:space-between;align-items:center;white-space:nowrap">
                                <span style="font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.04em">\${footerLabel}</span>
                                <span style="font-size:14px;font-weight:800;color:\${footerColor}">\${formatCurrency(totalBonus)}</span>
                            </div>
                        </div>\`;

                    return \`
                        <div class="s-card border border-gray-200">
                            <div class="\${bg}" style="padding:7px 10px;position:relative;display:flex;align-items:center;justify-content:center;border-bottom:1px solid #e5e7eb">
                                <h3 style="font-size:11px;font-weight:700;text-align:center;margin:0" class="truncate">\${groupName.toUpperCase()}</h3>
                                <button class="view-ranking-btn no-print" title="Xem xếp hạng" data-group-name="\${row[COLS.NGANH_HANG]}" data-group-channel="\${row[COLS.KENH]}" style="position:absolute;right:8px;top:50%;transform:translateY(-50%);padding:4px;border-radius:6px;background:rgba(255,255,255,0.3);border:none;cursor:pointer;color:inherit;display:flex;align-items:center;justify-content:center">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 20 20" fill="currentColor"><path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a1 1 0 011-1h14a1 1 0 110 2H3a1 1 0 01-1-1zM1 15a1 1 0 100 2h18a1 1 0 100-2H1z" /></svg>
                                </button>
                            </div>
                            <div style="padding:8px 10px;font-size:11px;flex:1;display:flex;flex-direction:column;gap:2px">
                                <div style="display:flex;justify-content:space-between;align-items:baseline;white-space:nowrap"><span style="color:#9ca3af;font-weight:500">% D.Kiến</span><span style="font-weight:800;font-size:15px;color:#4f46e5">\${formatPercent(row[COLS.PERCENT_DU_KIEN])}</span></div>
                                <div style="display:flex;justify-content:space-between;align-items:baseline;white-space:nowrap"><span style="color:#9ca3af;font-weight:500">D.Kiến Vượt</span><span style="font-weight:700;font-size:12px;color:#111827">\${formatNumber(row[COLS.DU_KIEN_VUOT])}</span></div>
                                <div style="display:flex;justify-content:space-between;align-items:baseline"><span style="color:#9ca3af;font-weight:500">Hạng (V.Trội / % Target)</span><span style="font-weight:700;font-size:12px;color:#111827">\${row[COLS.HANG_VUOT_Uu] || '-'} / \${row[COLS.HANG_PERCENT_TARGET] || '-'}</span></div>
                                \${bonusSectionHtml}
                            </div>
                            \${footerHtml}
                        </div>\`;
                };

                let html = '';
                let viewGroups = groupDefinitions;
                if (singleViewMode === 'list') {
                    const allAchieved100 = data.filter(row => parseNumber(row[COLS.PERCENT_DU_KIEN]) >= 1);
                    const allNotAchieved100 = data.filter(row => parseNumber(row[COLS.PERCENT_DU_KIEN]) < 1);
                    viewGroups = [
                        { key: 'achieved100', title: 'Đạt 100%', data: allAchieved100 },
                        { key: 'notAchieved100', title: '<100%', data: allNotAchieved100 }
                    ];
                }

                viewGroups.forEach(group => {
                    if (singleViewMode === 'list') {
                        group.data.sort(sortList);
                    } else {
                        group.data.sort(sortCards);
                    }
                    const pastelClass = GROUP_PASTEL_HEADERS[group.key] || 'pastel-slate';
                    let contentHtml = '';
                    
                    if (singleViewMode === 'list') {
                        const groupRowsHtml = group.data.map((row, index) => renderSingleRow(row, group.key, index + 1)).join('');
                        contentHtml = \`<div class="overflow-x-auto">
                                <table class="w-full text-left border-collapse">
                                    <thead>
                                        <tr class="bg-gray-50/50 text-[11px] uppercase text-gray-500 border-b border-gray-200">
                                            <th class="px-3 py-2 font-bold">Ngành Hàng</th>
                                            <th class="px-2 py-2 font-bold text-center">% D.Kiến</th>
                                            <th class="px-2 py-2 font-bold text-center">D.Kiến Vượt</th>
                                            <th class="px-2 py-2 font-bold text-center">Hạng (VT/%)</th>
                                            <th class="px-3 py-2 font-bold text-right">Tổng Thưởng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        \${groupRowsHtml}
                                    </tbody>
                                </table>
                            </div>\`;
                    } else {
                        const groupCardsHtml = group.data.map(row => renderSingleCard(row, group.key)).join('');
                        contentHtml = \`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;padding:10px">\${groupCardsHtml}</div>\`;
                    }
                    
                    const groupHtml = \`<div id="group-section-\${group.key}" class="group-container border border-gray-200 bg-white" data-group-key="\${group.key}" style="margin-bottom:16px">
                        <div class="capture-target \${singleViewMode === 'card' ? 'mod-card' : ''}" style="overflow:hidden">
                            <div class="capture-fix \${pastelClass} border-b border-gray-200 flex justify-between items-center" style="padding:10px 14px">
                                <h2 style="font-size:14px;font-weight:800;margin:0;letter-spacing:0.02em">\${group.title.toUpperCase()} (\${group.data.length})</h2>
                                <button class="exportGroupImageBtn no-print flex items-center justify-center transition" data-group-key="\${group.key}" title="Xuất ảnh nhóm này" style="width:24px;height:24px;border-radius:6px;background:rgba(255,255,255,0.4);color:rgba(0,0,0,0.6);border:none;cursor:pointer" onmouseover="this.style.background='rgba(255,255,255,0.8)';this.style.color='#000'" onmouseout="this.style.background='rgba(255,255,255,0.4)';this.style.color='rgba(0,0,0,0.6)'">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-camera"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg>
                                </button>
                            </div>
                            \${contentHtml}
                        </div>
                    </div>\`;
                    html += groupHtml;
                });
                detailsGrid.innerHTML = html;
            }

            function getRankingTableHtml(data, titleText) {
                const currentStoreFullName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ] : '';
                const titleOnly = titleText.replace("Bảng Xếp Hạng: ", "");
                let tableHtml = \`<div class="p-4 bg-white"><h4 class="text-xl font-bold text-center mb-4 text-indigo-600 uppercase">\${titleOnly}</h4>
                                 <div class="overflow-x-auto"><table class="w-full text-sm text-left text-gray-500"><thead class="text-xs text-gray-700 uppercase bg-gray-100"><tr>
                                    <th scope="col" class="px-4 py-1 text-center">SIÊU THỊ</th>
                                    <th scope="col" class="px-4 py-1 text-center">%DKHT</th>
                                    <th scope="col" class="px-4 py-1 text-center">D.KIẾN DT/SL</th>
                                    <th scope="col" class="px-4 py-1 text-center">HẠNG V.TRỘI</th>
                                    <th scope="col" class="px-4 py-1 text-center">HẠNG %HT</th>
                                    <th scope="col" class="px-4 py-1 text-center">THƯỞNG</th>
                                 </tr></thead><tbody>\`;
                data.forEach(row => {
                    const isCurrentStore = row[COLS.SIÊU_THỊ] === currentStoreFullName;
                    tableHtml += \`<tr class="\${isCurrentStore ? 'bg-blue-100 font-bold text-blue-900' : 'bg-white border-b'}">
                                    <th scope="row" class="px-4 py-1 font-medium \${isCurrentStore ? '' : 'text-gray-900'} whitespace-nowrap">\${row[COLS.SIÊU_THỊ]}</th>
                                    <td class="px-4 py-1 text-right">\${formatPercent(row[COLS.PERCENT_DU_KIEN])}</td>
                                    <td class="px-4 py-1 text-right">\${formatNumber(row[COLS.DU_KIEN_VUOT])}</td>
                                    <td class="px-4 py-1 text-right">\${row[COLS.HANG_VUOT_Uu] || '-'}</td>
                                    <td class="px-4 py-1 text-right">\${row[COLS.HANG_PERCENT_TARGET] || '-'}</td>
                                    <td class="px-4 py-1 text-right">\${formatCurrencySimple(row[COLS.TONG_THUONG])}</td>
                                  </tr>\`;
                });
                tableHtml += \`</tbody></table></div></div>\`;
                return tableHtml;
            }

            // --- Helper Function for Image Capture ---
            async function captureElementAsImage(element, filename, options = {}) {
                console.log('Bắt đầu xuất ảnh:', filename);
                if (!element) {
                    console.error('Phần tử không tồn tại!');
                    return;
                }
                if (typeof htmlToImage === 'undefined') {
                    console.error('htmlToImage không được tải!');
                    messageEl.textContent = 'Lỗi: htmlToImage không được tải.';
                    messageEl.classList.remove('hidden');
                    return;
                }
                loadingText.textContent = options.loadingText || 'Đang xuất ảnh...';
                loadingOverlay.classList.remove('hidden');
                
                const style = document.createElement('style');
                style.innerHTML = '.no-print { display: none !important; }';
                document.head.appendChild(style);

                if (options.onBeforeCapture) options.onBeforeCapture();

                await document.fonts.ready;
                await new Promise(resolve => setTimeout(resolve, 500)); 

                try {
                    console.log('Đang gọi htmlToImage...');
                    if (!document.body.contains(element)) {
                        console.error('Phần tử không nằm trong DOM!');
                    }
                    const dataUrl = await htmlToImage.toPng(element, {
                        pixelRatio: 2,
                        backgroundColor: options.backgroundColor || '#f5f5f7',
                        filter: (el) => !(el.classList && (el.classList.contains('backdrop-blur') || el.classList.contains('backdrop-blur-sm')))
                    });
                    console.log('Đã tạo ảnh thành công.');
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = dataUrl;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (error) {
                    console.error('Lỗi xuất ảnh:', error);
                    messageEl.textContent = 'Lỗi xuất ảnh: ' + (error.message || error);
                    messageEl.classList.remove('hidden');
                    setTimeout(() => messageEl.classList.add('hidden'), 5000);
                } finally {
                    document.head.removeChild(style);
                    if (options.onAfterCapture) options.onAfterCapture();
                    loadingOverlay.classList.add('hidden');
                    loadingText.textContent = '';
                }
            }


            // --- Event Listeners ---
            changeFileButton.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', handleFileSelect);

            // Auto-search on input
            storeCodeInput1.addEventListener('input', handleSearchOrCompare);
            storeCodeInput2.addEventListener('input', handleSearchOrCompare);
            
            comparisonContent.addEventListener('click', e => {
                const sortableHeader = e.target.closest('th.sortable');
                if (sortableHeader) {
                    const sortKey = sortableHeader.dataset.sortKey;
                    if (comparisonSortState.key === sortKey) {
                        comparisonSortState.direction = comparisonSortState.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        comparisonSortState.key = sortKey;
                        comparisonSortState.direction = 'desc';
                    }
                    // Re-render
                    const code1 = storeCodeInput1.value.trim();
                    const code2 = storeCodeInput2.value.trim();
                    if(code1 && code2) handleCompare(code1, code2);
                }

                const toggleBtn = e.target.closest('#toggleAllStrengthsButton');
                if (toggleBtn) {
                    const allContainer = document.getElementById('allStrengthsContainer');
                    const topContainer = document.getElementById('topStrengthsContainer');
                    const isHidden = allContainer.classList.contains('hidden');
                    if (isHidden) {
                        allContainer.classList.remove('hidden');
                        topContainer.classList.add('hidden');
                        toggleBtn.textContent = 'Ẩn bớt';
                    } else {
                        allContainer.classList.add('hidden');
                        topContainer.classList.remove('hidden');
                        toggleBtn.textContent = 'Xem tất cả';
                    }
                }

                const exportDetailTableBtn = e.target.closest('#exportDetailTableImageButton');
                if (exportDetailTableBtn) {
                    const captureArea = document.getElementById('captureDetailTable');
                    const store1Name = storeCodeInput1.value.trim();
                    const store2Name = storeCodeInput2.value.trim();
                    const filename = \`so_sanh_chi_tiet_\${store1Name}_vs_\${store2Name}.png\`;

                    if (captureArea) {
                        captureElementAsImage(captureArea, filename, {
                            backgroundColor: '#ffffff'
                        });
                    }
                }

                const exportStrengthsBtn = e.target.closest('#exportStrengthsImageButton');
                if (exportStrengthsBtn) {
                    const captureArea = document.getElementById('strengthsAnalysisSection');
                    const store1Name = storeCodeInput1.value.trim();
                    const store2Name = storeCodeInput2.value.trim();
                    const filename = \`phan_tich_nhanh_\${store1Name}_vs_\${store2Name}.png\`;
                    if (captureArea) {
                        captureElementAsImage(captureArea, filename, {
                            backgroundColor: '#ffffff',
                            onBeforeCapture: () => {
                                captureArea.classList.add('p-4');
                            },
                            onAfterCapture: () => {
                                captureArea.classList.remove('p-4');
                            }
                        });
                    }
                }
            });

            // Button to clear comparison and re-search
            searchCompareButton.addEventListener('click', () => {
                storeCodeInput2.value = '';
                handleSearchOrCompare();
            });
            
            document.body.addEventListener('click', (event) => {
                const exportSummaryBtn = event.target.closest('#exportSummaryImageButton');
                if (exportSummaryBtn) {
                    const captureArea = document.getElementById('summaryReportArea');
                    const titleElement = captureArea.querySelector('#summaryCard h2');
                    
                    const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                    
                    captureElementAsImage(captureArea, \`\${storeName}_tong_hop.png\`, {
                        onBeforeCapture: () => {
                            if(titleElement) titleElement.classList.remove('truncate');
                            captureArea.classList.add('p-4'); 
                        },
                        onAfterCapture: () => {
                            if(titleElement) titleElement.classList.add('truncate');
                            captureArea.classList.remove('p-4'); 
                        }
                    });
                }
                const exportFullPageBtn = event.target.closest('#exportFullPageImageButton');
                if (exportFullPageBtn) {
                    const captureArea = document.getElementById('mainContent');
                    const truncatedElements = captureArea.querySelectorAll('.truncate');
                    const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                    
                    captureElementAsImage(captureArea, \`\${storeName}_toan_trang.png\`, {
                        onBeforeCapture: () => {
                            truncatedElements.forEach(el => el.classList.remove('truncate'));
                        },
                        onAfterCapture: () => {
                            truncatedElements.forEach(el => el.classList.add('truncate'));
                        }
                    });
                }
                const exportComparisonBtn = event.target.closest('#exportComparisonImageButton');
                if (exportComparisonBtn) {
                    const captureArea = document.getElementById('captureComparisonMain');
                    const truncatedElements = captureArea.querySelectorAll('.truncate');
                    const store1Name = storeCodeInput1.value.trim();
                    const store2Name = storeCodeInput2.value.trim();
                    captureElementAsImage(captureArea, \`so_sanh_\${store1Name}_vs_\${store2Name}.png\`, {
                         onBeforeCapture: () => { 
                            truncatedElements.forEach(el => el.classList.remove('truncate'));
                            captureArea.classList.add('p-4');
                        },
                        onAfterCapture: () => { 
                            truncatedElements.forEach(el => el.classList.add('truncate'));
                            captureArea.classList.remove('p-4');
                        }
                    });
                }
            });

            analysisSection.addEventListener('click', (event) => { 
                const opportunityItem = event.target.closest('.opportunity-item'); 
                if (opportunityItem) { 
                    const groupName = opportunityItem.dataset.groupName; 
                    const groupChannel = opportunityItem.dataset.groupChannel; 
                    if (groupName && groupChannel) { 
                        showRankingModal(groupName, groupChannel); 
                    } 
                    return;
                }

                const copyButton = event.target.closest('#copyAnalysisButton');
                if (copyButton) {
                    const analysisContent = document.getElementById('analysisContent');
                    if (!analysisContent) return;
                    let textToCopy = "Phân Tích & Đề Xuất\\n\\n";
                    const iconMap = { 'bg-blue-100': '✅', 'bg-yellow-100': '⚠️', 'bg-green-100': '✨', 'bg-red-100': '📈' };
                    analysisContent.querySelectorAll('.flex.items-start').forEach(item => {
                        const iconDiv = item.querySelector('.flex-shrink-0');
                        const textP = item.querySelector('p');
                        let icon = '';
                        for (const key in iconMap) { if (iconDiv && iconDiv.classList.contains(key)) { icon = iconMap[key]; break; } }
                        if (textP) {
                            textToCopy += \`\${icon} \${textP.innerText.trim()}\`;
                            const ul = item.querySelector('ul');
                            if (ul) { textToCopy += "\\n"; ul.querySelectorAll('li').forEach(li => { textToCopy += \`    - \${li.innerText.trim()}\\n\`; });
                            } else { textToCopy += "\\n\\n"; }
                        }
                    });
                    const textarea = document.createElement('textarea');
                    textarea.value = textToCopy.trim();
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textarea);
                    const originalIcon = copyButton.innerHTML;
                    copyButton.innerHTML = \`<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-green-500" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" /></svg>\`;
                    setTimeout(() => { copyButton.innerHTML = originalIcon; }, 2000);
                    return;
                }

                const exportAnalysisBtn = event.target.closest('#exportAnalysisImageButton');
                if (exportAnalysisBtn) {
                     const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                     const originalWidth = analysisSection.style.width;
                     captureElementAsImage(analysisSection, \`\${storeName}_phan_tich.png\`, {
                         backgroundColor: '#ffffff',
                         onBeforeCapture: () => {
                            analysisSection.style.width = '960px';
                            analysisSection.classList.add('p-4');
                         },
                         onAfterCapture: () => {
                             analysisSection.style.width = originalWidth;
                             analysisSection.classList.remove('p-4');
                         }
                     });
                     return;
                }

                const exportAnalysisRankingsBtn = event.target.closest('#exportAnalysisRankingsButton');
                if (exportAnalysisRankingsBtn) {
                    const exportAllAnalysisRankings = async () => {
                        const analysisItems = analysisSection.querySelectorAll('.opportunity-item');
                        if (analysisItems.length === 0) return;

                        loadingOverlay.classList.remove('hidden');
                        const tempContainer = document.createElement('div');
                        tempContainer.style.position = 'absolute';
                        tempContainer.style.left = '-9999px';
                        tempContainer.style.top = '-9999px';
                        tempContainer.style.width = '800px';
                        document.body.appendChild(tempContainer);

                        for (let i = 0; i < analysisItems.length; i++) {
                            const item = analysisItems[i];
                            loadingText.textContent = \`Đang xuất BXH Phân tích \${i + 1}/\${analysisItems.length}...\`;
                            const groupName = item.dataset.groupName;
                            const groupChannel = item.dataset.groupChannel;
                            let dataForTable = competitionData.filter(row => row[COLS.NGANH_HANG] === groupName && row[COLS.KENH] === groupChannel);
                            const currentStoreFullName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ] : '';
                            const priorityStoreRow = dataForTable.find(row => row[COLS.SIÊU_THỊ] === currentStoreFullName);
                            let prioritySortKey = COLS.HANG_VUOT_Uu;
                            let secondarySortKey = COLS.HANG_PERCENT_TARGET;
                            if (priorityStoreRow) {
                                const rankVuot = parseInt(priorityStoreRow[COLS.HANG_VUOT_Uu], 10) || Infinity;
                                const rankTarget = parseInt(priorityStoreRow[COLS.HANG_PERCENT_TARGET], 10) || Infinity;
                                if (rankTarget < rankVuot) {
                                    prioritySortKey = COLS.HANG_PERCENT_TARGET;
                                    secondarySortKey = COLS.HANG_VUOT_Uu;
                                }
                            }
                            dataForTable.sort((a, b) => {
                                const priorityA = parseInt(a[prioritySortKey], 10) || Infinity;
                                const priorityB = parseInt(b[prioritySortKey], 10) || Infinity;
                                if (priorityA !== priorityB) return priorityA - priorityB;
                                const secondaryA = parseInt(a[secondarySortKey], 10) || Infinity;
                                const secondaryB = parseInt(b[secondarySortKey], 10) || Infinity;
                                return secondaryA - secondaryB;
                            });
                            const titleText = \`Bảng Xếp Hạng: \${groupName} - Kênh \${groupChannel}\`;
                            tempContainer.innerHTML = getRankingTableHtml(dataForTable, titleText);
                            try {
                                const dataUrl = await htmlToImage.toPng(tempContainer.firstChild, { pixelRatio: 2, backgroundColor: '#ffffff' });
                                const link = document.createElement('a');
                                const filename = \`BXH_\${groupName}_\${groupChannel}\`.replace(/[^\\w\\s-]/g, '').trim().replace(/\\s+/g, '_') + '.png';
                                link.download = filename;
                                link.href = dataUrl;
                                link.click();
                                await new Promise(res => setTimeout(res, 300));
                            } catch (err) {
                                console.error("Lỗi xuất ảnh BXH:", err);
                            }
                        }
                        document.body.removeChild(tempContainer);
                        loadingOverlay.classList.add('hidden');
                        loadingText.textContent = '';
                    };
                    exportAllAnalysisRankings();
                    return;
                }
            });
            
            detailsGrid.addEventListener('click', (event) => {
                const rankingBtn = event.target.closest('.view-ranking-btn');
                if (rankingBtn) {
                    const groupName = rankingBtn.dataset.groupName;
                    const groupChannel = rankingBtn.dataset.groupChannel;
                    if (groupName && groupChannel) {
                        showRankingModal(groupName, groupChannel);
                    }
                    return;
                }
                
                const exportGroupBtn = event.target.closest('.exportGroupImageBtn');
                if (exportGroupBtn) {
                    const groupKey = exportGroupBtn.dataset.groupKey;
                    const container = document.querySelector(\`.group-container[data-group-key="\${groupKey}"]\`);
                    if (container) {
                        const captureTarget = container.querySelector('.capture-target');
                        if (captureTarget) {
                            const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                            const filename = \`\${storeName}_\${groupKey}.png\`;
                            const originalWidth = captureTarget.style.width;
                            const truncatedElements = captureTarget.querySelectorAll('.truncate');

                            captureElementAsImage(captureTarget, filename, {
                                onBeforeCapture: () => {
                                    truncatedElements.forEach(el => el.classList.remove('truncate'));
                                    captureTarget.style.width = '960px';
                                },
                                onAfterCapture: () => {
                                    truncatedElements.forEach(el => el.classList.add('truncate'));
                                    captureTarget.style.width = originalWidth;
                                }
                            });
                        }
                    }
                    return;
                }
            });

            closeModalButton.addEventListener('click', () => { rankingModal.classList.add('hidden'); });
            
            rankingModal.addEventListener('click', (event) => { 
                if (event.target === rankingModal) { 
                    rankingModal.classList.add('hidden'); 
                }
                const exportBtn = event.target.closest('#exportRankingImageButton');
                if (exportBtn) {
                    const modalContent = rankingModal.querySelector('.bg-white');
                    const modalBody = document.getElementById('modalBody');
                    const tableWrapper = modalBody.querySelector('.overflow-x-auto');
                    const modalTitleText = document.getElementById('modalTitle').textContent || 'xep_hang';
                    const filename = modalTitleText.replace(/[^\\w\\s-]/g, '').trim().replace(/\\s+/g, '_') + '.png';
                    
                    captureElementAsImage(modalBody, filename, {
                         backgroundColor: '#ffffff',
                         onBeforeCapture: () => {
                            modalContent.style.maxHeight = 'none';
                            modalBody.style.overflowY = 'visible';
                            tableWrapper.style.overflowX = 'visible';
                         },
                         onAfterCapture: () => {
                            modalContent.style.maxHeight = '';
                            modalBody.style.overflowY = '';
                            tableWrapper.style.overflowX = '';
                         }
                    });
                }
            });
            
            top10InfoCard.addEventListener('click', (e) => {
                const filterBtn = e.target.closest('#filterContainer .filter-btn');
                if (filterBtn) {
                    const filter = filterBtn.dataset.filter;
                    const filterContainer = document.getElementById('filterContainer');
                     if (!filterContainer) return;
                    document.querySelectorAll('#filterContainer .filter-btn').forEach(btn => {
                        btn.classList.remove('active');
                    });
                    filterBtn.classList.add('active');
                    document.querySelectorAll('.group-container').forEach(container => {
                        if (filter === 'all' || container.dataset.groupKey === filter) {
                            container.style.display = 'block';
                        } else {
                            container.style.display = 'none';
                        }
                    });
                    return;
                }
                const toggleViewBtn = e.target.closest('#toggleViewModeBtn');
                if (toggleViewBtn) {
                    singleViewMode = singleViewMode === 'list' ? 'card' : 'list';
                    saveState();
                    // Re-render only grouped results to keep analysis intact
                    renderGroupedResults(currentStoreData);
                    
                    // Update button icon
                    toggleViewBtn.innerHTML = singleViewMode === 'list' 
                        ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><rect x="7" y="7" width="3" height="3"/><rect x="14" y="7" width="3" height="3"/><rect x="7" y="14" width="3" height="3"/><rect x="14" y="14" width="3" height="3"/></svg>' 
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>';

                    // Re-apply current filter
                    const filterContainer = document.getElementById('filterContainer');
                    if (filterContainer) {
                        const activeFilter = filterContainer.querySelector('.filter-btn.active');
                        if (activeFilter) {
                            const filter = activeFilter.dataset.filter;
                            document.querySelectorAll('.group-container').forEach(container => {
                                if (filter === 'all' || container.dataset.groupKey === filter) {
                                    container.style.display = 'block';
                                } else {
                                    container.style.display = 'none';
                                }
                            });
                        }
                    }
                    return;
                }

                const exportFilteredBtn = e.target.closest('#exportFilteredImageButton');
                if (exportFilteredBtn) {
                    const filterContainer = document.getElementById('filterContainer');
                    if (!filterContainer) return;
                    const activeFilter = filterContainer.querySelector('.filter-btn.active').dataset.filter;
                    const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                    const filename = \`\${storeName}_\${activeFilter}.png\`;
                    const captureTarget = activeFilter === 'all' 
                        ? document.getElementById('detailsGrid') 
                        : document.querySelector(\`.group-container[data-group-key="\${activeFilter}"] .capture-target\`);
                    
                    if (captureTarget) {
                        const originalWidth = captureTarget.style.width;
                        const truncatedElements = captureTarget.querySelectorAll('.truncate');

                        captureElementAsImage(captureTarget, filename, {
                            onBeforeCapture: () => {
                                truncatedElements.forEach(el => el.classList.remove('truncate'));
                                captureTarget.style.width = '960px';
                            },
                            onAfterCapture: () => {
                                truncatedElements.forEach(el => el.classList.add('truncate'));
                                captureTarget.style.width = originalWidth;
                            }
                        });
                    }
                    return;
                }

                
                const exportAllBtn = e.target.closest('#exportAllFilteredImagesButton');
                if(exportAllBtn) {
                    const exportAllFilteredImages = async () => {
                        const filterContainer = document.getElementById('filterContainer');
                        if (!filterContainer) return;
                        const storeName = currentStoreData.length > 0 ? currentStoreData[0][COLS.SIÊU_THỊ].split(' ').slice(1).join('_') : 'bao_cao';
                        const filtersToExport = [...filterContainer.querySelectorAll('.filter-btn')].map(btn => btn.dataset.filter).filter(f => f && f !== 'all');
                        
                        loadingOverlay.classList.remove('hidden');

                        for (let i = 0; i < filtersToExport.length; i++) {
                             const filter = filtersToExport[i];
                             const filterBtn = filterContainer.querySelector(\`.filter-btn[data-filter="\${filter}"]\`);
                             if (!filterBtn) continue;
                             
                             loadingText.textContent = \`Đang xuất ảnh \${i+1}/\${filtersToExport.length}...\`;
                             filterBtn.click();
                             await new Promise(res => setTimeout(res, 300));
                             
                             const container = document.querySelector(\`.group-container[data-group-key="\${filter}"]\`);
                             if(container){
                                 const captureTarget = container.querySelector('.capture-target');
                                 if (captureTarget) {
                                     const originalWidth = captureTarget.style.width;
                                     const truncatedElements = captureTarget.querySelectorAll('.truncate');
                                     
                                     truncatedElements.forEach(el => el.classList.remove('truncate'));
                                     captureTarget.style.width = '960px';

                                     const dataUrl = await htmlToImage.toPng(captureTarget, { pixelRatio: 2, backgroundColor: '#f5f5f7' });
                                     
                                     captureTarget.style.width = originalWidth;
                                     truncatedElements.forEach(el => el.classList.add('truncate'));

                                     const link = document.createElement('a');
                                     link.download = \`\${storeName}_\${filter}.png\`;
                                     link.href = dataUrl;
                                     link.click();
                                     await new Promise(res => setTimeout(res, 200));
                                 }
                             }
                        }
                        
                        filterContainer.querySelector(\`.filter-btn[data-filter="all"]\`).click();
                        loadingOverlay.classList.add('hidden');
                        loadingText.textContent = '';
                    };
                    exportAllFilteredImages();
                }
            });
            
            modalBody.addEventListener('click', e => {
                const th = e.target.closest('th.sortable');
                if (th) { sortRankingData(th.dataset.sortKey); }
            });

            if (versionInfo) versionInfo.addEventListener('click', () => { renderVersionHistory(); versionModal.classList.remove('hidden'); });
            closeVersionModalButton.addEventListener('click', () => versionModal.classList.add('hidden'));
            versionModal.addEventListener('click', (event) => { if (event.target === event.currentTarget) { versionModal.classList.add('hidden'); } });

            window.addEventListener('message', (e) => {
                if (e.data && e.data.type === 'CHECK_THUONG_SEARCH') {
                    storeCodeInput1.value = e.data.code1 || '';
                    storeCodeInput2.value = e.data.code2 || '';
                    handleSearchOrCompare();
                } else if (e.data && e.data.type === 'CHECK_THUONG_CHANGE_FILE') {
                    changeFileButton.click();
                }
            });
        });
    </script>
</body>
</html>
`;

export const CheckThuongView: React.FC = () => {
    const { activeTab } = useActiveTab();
    const [mounted, setMounted] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [hasData, setHasData] = useState(false);
    const [codes, setCodes] = useState({ code1: '910', code2: '' });

    useEffect(() => {
        setMounted(true);
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'CHECK_THUONG_FILE_LOADED') {
                setHasData(true);
                if (e.data.code1) setCodes(prev => ({ ...prev, code1: e.data.code1 }));
                if (e.data.code2) setCodes(prev => ({ ...prev, code2: e.data.code2 }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const handleSearch = () => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_SEARCH',
            code1: codes.code1,
            code2: codes.code2
        }, '*');
    };

    const handleCodeChange = (field: 'code1' | 'code2', value: string) => {
        setCodes(prev => {
            const newCodes = { ...prev, [field]: value };
            iframeRef.current?.contentWindow?.postMessage({
                type: 'CHECK_THUONG_SEARCH',
                code1: newCodes.code1,
                code2: newCodes.code2
            }, '*');
            return newCodes;
        });
    };

    const handleChangeFile = () => {
        iframeRef.current?.contentWindow?.postMessage({
            type: 'CHECK_THUONG_CHANGE_FILE'
        }, '*');
    };

    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900 absolute inset-0">
            {mounted && activeTab === 'check-thuong' && hasData && document.getElementById('global-header-actions') && createPortal(
                <div className="hidden lg:flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-2 px-2">
                        <input
                            type="text"
                            placeholder="Mã kho (VD: 910)"
                            className="w-32 lg:w-40 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                            value={codes.code1}
                            onChange={(e) => handleCodeChange('code1', e.target.value)}
                        />
                        <span className="text-slate-300 dark:text-slate-600">|</span>
                        <input
                            type="text"
                            placeholder="So sánh..."
                            className="w-28 lg:w-36 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]"
                            value={codes.code2}
                            onChange={(e) => handleCodeChange('code2', e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-1 border-l border-slate-200 dark:border-slate-700 pl-2">
                        <button
                            onClick={handleSearch}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 transition-colors"
                            title="Tra cứu"
                        >
                            <Icon name="search" size={4} />
                        </button>
                        <button
                            onClick={handleChangeFile}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                            title="Tải file khác"
                        >
                            <Icon name="upload" size={4} />
                        </button>
                    </div>
                </div>,
                document.getElementById('global-header-actions')!
            )}
            {/* Mobile search bar — visible only on small screens */}
            {hasData && (
                <div className="lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-700/60 px-3 py-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 flex-1">
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                <Icon name="search" size={3.5} />
                            </div>
                            <input
                                type="text"
                                placeholder="Mã kho (VD: 910)"
                                className="w-full h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                                value={codes.code1}
                                onChange={(e) => handleCodeChange('code1', e.target.value)}
                            />
                        </div>
                        <div className="relative flex-1">
                            <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-slate-400">
                                <Icon name="arrow-left-right" size={3.5} />
                            </div>
                            <input
                                type="text"
                                placeholder="So sánh..."
                                className="w-full h-9 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md pl-8 pr-3 text-sm font-semibold text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-all"
                                value={codes.code2}
                                onChange={(e) => handleCodeChange('code2', e.target.value)}
                            />
                        </div>
                    </div>
                    <button
                        onClick={handleSearch}
                        className="h-9 px-3 bg-indigo-600 text-white rounded-md flex items-center gap-1.5 text-xs font-semibold hover:bg-indigo-700 transition-colors shrink-0"
                    >
                        <Icon name="search" size={3.5} />
                    </button>
                    <button
                        onClick={handleChangeFile}
                        className="h-9 px-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-md flex items-center hover:bg-slate-200 transition-colors shrink-0"
                        title="Tải file khác"
                    >
                        <Icon name="upload" size={3.5} />
                    </button>
                </div>
            )}
            <iframe
                ref={iframeRef}
                srcDoc={htmlContent}
                title="Bảng Tra Cứu Thưởng Thi Đua"
                className="w-full h-full border-none flex-grow"
                style={{ width: '100%', height: '100%', minHeight: '100vh', border: 'none' }}
                sandbox="allow-scripts allow-same-origin allow-forms allow-downloads"
            />
        </div>
    );
};

export default CheckThuongView;