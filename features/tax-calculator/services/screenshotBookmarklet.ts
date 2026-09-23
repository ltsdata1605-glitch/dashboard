/**
 * Mã bookmarklet "Chụp ảnh" — người dùng KÉO THẢ nút ở header màn Tính Thuế lên thanh dấu trang
 * của trình duyệt, sau đó mở bất kỳ trang web nào (HRM, phiếu lương…) và bấm vào dấu trang đó để
 * chụp full trang ra PNG siêu nét.
 *
 * Nguồn: đoạn mã chủ dự án cung cấp 2026-09-23, giữ nguyên hành vi (html2canvas 1.4.1 từ cdnjs,
 * lớp phủ tiến trình, scale 3, nền trắng, tự tải file PNG). Viết bằng nối chuỗi thay vì template
 * literal để nhúng gọn vào một dòng `javascript:` mà không vướng dấu backtick lồng nhau.
 */
const BOOKMARKLET_SOURCE = `(function(){
function loadHtml2canvas(cb){
  if(window.html2canvas){cb();return;}
  var s=document.createElement('script');
  s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
  s.onload=cb;
  document.head.appendChild(s);
}
function removeEl(id){var el=document.getElementById(id);if(el)el.remove();}
function slugify(text){
  return (text||'export').toString().trim().toLowerCase()
    .replace(/[^a-z0-9]+/gi,'_').replace(/^_+|_+$/g,'')||'export';
}
function createProgress(){
  removeEl('auto-export-progress');
  removeEl('auto-export-progress-style');
  var style=document.createElement('style');
  style.id='auto-export-progress-style';
  style.innerHTML='#auto-export-progress{position:fixed;inset:0;z-index:999999999;background:rgba(2,6,23,.55);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif}'
    +'.auto-box{width:390px;max-width:92vw;padding:26px;border-radius:24px;color:#fff;text-align:center;background:linear-gradient(135deg,#020617,#0f172a,#1e293b);box-shadow:0 25px 80px rgba(0,0,0,.42)}'
    +'.auto-icon{width:64px;height:64px;border-radius:22px;margin:0 auto 12px;background:linear-gradient(135deg,#0ea5e9,#22c55e,#facc15);display:flex;align-items:center;justify-content:center;font-size:34px;animation:autoPulse 1s infinite}'
    +'.auto-title{font-size:18px;font-weight:800;margin-bottom:6px}'
    +'.auto-sub{font-size:13px;opacity:.85;line-height:1.45;margin-bottom:18px}'
    +'.auto-bar-wrap{height:13px;position:relative;border-radius:999px;overflow:hidden;background:rgba(255,255,255,.15)}'
    +'.auto-bar{width:0%;height:100%;border-radius:999px;background:linear-gradient(90deg,#22c55e,#38bdf8,#facc15);transition:width .25s ease}'
    +'.auto-info{display:flex;justify-content:space-between;margin-top:12px;font-size:13px;opacity:.92}'
    +'.auto-success{margin-top:14px;font-size:13px;font-weight:700;color:#bbf7d0;min-height:18px}'
    +'@keyframes autoPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}';
  document.head.appendChild(style);
  var overlay=document.createElement('div');
  overlay.id='auto-export-progress';
  overlay.setAttribute('data-html2canvas-ignore','true');
  overlay.innerHTML='<div class="auto-box"><div class="auto-icon">&#128248;</div>'
    +'<div class="auto-title">Dang xuat anh tu dong</div>'
    +'<div class="auto-sub">Che do: Full trang + Sieu net + PNG</div>'
    +'<div class="auto-bar-wrap"><div class="auto-bar" id="auto-bar"></div></div>'
    +'<div class="auto-info"><span id="auto-percent">0%</span><span id="auto-time">0 giay</span></div>'
    +'<div class="auto-success" id="auto-success"></div></div>';
  document.body.appendChild(overlay);
  var bar=document.getElementById('auto-bar');
  var percentEl=document.getElementById('auto-percent');
  var timeEl=document.getElementById('auto-time');
  var successEl=document.getElementById('auto-success');
  var percent=0,sec=0;
  var timer=setInterval(function(){sec++;timeEl.textContent=sec+' giay';},1000);
  var fake=setInterval(function(){
    if(percent<90){
      percent+=Math.floor(Math.random()*7)+3;
      if(percent>90)percent=90;
      bar.style.width=percent+'%';
      percentEl.textContent=percent+'%';
    }
  },260);
  return {
    done:function(){clearInterval(fake);bar.style.width='100%';percentEl.textContent='100%';successEl.textContent='Xuat anh thanh cong';},
    close:function(){clearInterval(fake);clearInterval(timer);overlay.style.transition='opacity .35s ease';overlay.style.opacity='0';setTimeout(function(){overlay.remove();removeEl('auto-export-progress-style');},350);},
    fail:function(){clearInterval(fake);clearInterval(timer);overlay.remove();removeEl('auto-export-progress-style');}
  };
}
function downloadPNG(canvas){
  var a=document.createElement('a');
  a.href=canvas.toDataURL('image/png');
  a.download='fullpage_sieunet_'+slugify(document.title)+'.png';
  a.click();
}
loadHtml2canvas(function(){
  var progress=createProgress();
  var pageWidth=Math.max(document.documentElement.scrollWidth,document.body.scrollWidth,window.innerWidth);
  var pageHeight=Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,window.innerHeight);
  window.scrollTo(0,0);
  setTimeout(function(){
    window.html2canvas(document.documentElement,{
      useCORS:true,allowTaint:false,scale:3,x:0,y:0,
      width:pageWidth,height:pageHeight,windowWidth:pageWidth,windowHeight:pageHeight,
      scrollX:0,scrollY:0,backgroundColor:'#ffffff',
      ignoreElements:function(el){return el.id==='auto-export-progress'||el.id==='auto-export-progress-style';},
      onclone:function(doc){
        var o=doc.getElementById('auto-export-progress');if(o)o.remove();
        var st=doc.getElementById('auto-export-progress-style');if(st)st.remove();
      }
    }).then(function(canvas){
      progress.done();
      setTimeout(function(){downloadPNG(canvas);progress.close();},700);
    }).catch(function(e){
      progress.fail();
      alert('Khong the xuat anh. Trang nay co the co anh khac domain hoac bi chan canvas.');
      console.error(e);
    });
  },500);
});
})();`;

/** Chuỗi gán vào href của thẻ <a> để kéo thả lên thanh dấu trang */
export const SCREENSHOT_BOOKMARKLET = 'javascript:' + encodeURIComponent(BOOKMARKLET_SOURCE);

export const SCREENSHOT_BOOKMARKLET_SOURCE = BOOKMARKLET_SOURCE;
