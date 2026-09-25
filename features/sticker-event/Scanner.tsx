import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { XIcon, SwitchCameraIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { Button } from '../../components/shared/ui/Button';
import { Flashlight, FlashlightOff, Keyboard, CornerDownLeft } from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

/** `torch` là thuộc tính NGOÀI chuẩn (Chrome Android hỗ trợ, iOS Safari thì không) nên không có
 *  trong kiểu MediaTrackCapabilities của TypeScript — khai riêng ở đây thay vì dùng `any`. */
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean };
type TorchConstraint = MediaTrackConstraints & { advanced?: Array<{ torch: boolean }> };

interface CameraDevice {
  id: string;
  label: string;
}

interface ScannerProps {
  onScanSuccess: (scannedCode: string) => boolean;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const readerId = "html5-qrcode-reader";
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIframeError, setIsIframeError] = useState(false);
  const [status, setStatus] = useState<string>('Yêu cầu quyền truy cập máy ảnh...');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isScanningPaused = useRef(false);
  const scanTimeoutRef = useRef<number | null>(null);
  /** Đèn pin: kệ hàng siêu thị thiếu sáng là tình huống thường trực, không có đèn thì quét trượt liên tục */
  const [hasTorch, setHasTorch] = useState(false);
  const [isTorchOn, setIsTorchOn] = useState(false);
  /** Nhập mã bằng tay — đường thoát khi mã vạch mờ/rách hoặc máy ảnh bị từ chối quyền */
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCode, setManualCode] = useState('');
  /** Đếm số mã quét được trong phiên này để khỏi phải đóng máy quét ra đếm */
  const [scannedCount, setScannedCount] = useState(0);
  /** Mã vừa quét xong — dùng để phân biệt "vẫn đang chĩa vào tem cũ" với "đã sang sản phẩm khác" */
  const maVuaQuetRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    };
  }, []);

  const onScanSuccessRef = useRef(onScanSuccess);
  useEffect(() => {
    onScanSuccessRef.current = onScanSuccess;
  });

  const playSound = useCallback((type: 'success' | 'error') => {
    // Web Audio API to play sounds without needing an <audio> element
    try {
      // Safari cũ chỉ có webkitAudioContext, không có trong lib.dom chuẩn
      const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof window.AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextCtor();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      if (type === 'success') {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A6 note
        gainNode.gain.setValueAtTime(5.0, audioContext.currentTime); // Maximized volume
      } else {
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3 note
        gainNode.gain.setValueAtTime(5.0, audioContext.currentTime); // Maximized volume
      }
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 0.15); // Beep for 150ms
    } catch (e) {
      console.warn("Could not play sound:", e);
    }
  }, []);

  /** Dùng chung cho mã quét được từ camera VÀ mã gõ tay — để hai đường đi cho cùng phản hồi
   *  (âm thanh, rung, màn báo kết quả, bộ đếm), người dùng không phải học 2 kiểu hành vi. */
  const handleDecodedCode = useCallback((decodedText: string) => {
    if (isScanningPaused.current) return;
    // Quét liên tục nhiều sản phẩm: chỉ chặn ĐÚNG mã vừa quét (tránh cộng đôi khi máy còn hướng
    // vào tem cũ), mã khác thì nhận ngay chứ không phải chờ hết nhịp nghỉ.
    maVuaQuetRef.current = decodedText;
    
    isScanningPaused.current = true;
    
    const success = onScanSuccessRef.current(decodedText);
    
    if (success) {
      if (navigator.vibrate) navigator.vibrate(200); // Vibrate once on success
      playSound('success');
      setScannedCount(c => c + 1);
      setScanResult({ type: 'success', message: `Đã tìm thấy: ${decodedText}` });
    } else {
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // Short pattern for error
      playSound('error');
      setScanResult({ type: 'error', message: `Không có trong danh sách: ${decodedText}` });
    }

    if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
    scanTimeoutRef.current = window.setTimeout(() => {
      isScanningPaused.current = false;
      setScanResult(null);
    }, 1200);
  }, [playSound]);

  const qrCodeSuccessCallback = handleDecodedCode;

  const handleDecodedCodeRef = useRef(handleDecodedCode);
  useEffect(() => { handleDecodedCodeRef.current = handleDecodedCode; });

  /** Bật/tắt đèn pin của camera đang chạy */
  const handleToggleTorch = useCallback(async () => {
    const scanner = scannerRef.current;
    if (!scanner || !scanner.isScanning) return;
    const next = !isTorchOn;
    try {
      await scanner.applyVideoConstraints({ advanced: [{ torch: next }] } as TorchConstraint);
      setIsTorchOn(next);
    } catch (err) {
      console.warn('Không bật/tắt được đèn pin:', err);
      setHasTorch(false); // thiết bị báo có nhưng không dùng được -> ẩn nút đi cho đỡ gây hiểu nhầm
    }
  }, [isTorchOn]);

  /** Gửi mã gõ tay đi đúng đường xử lý như mã quét được */
  const handleSubmitManualCode = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const code = manualCode.trim();
    if (!code) return;
    isScanningPaused.current = false; // gõ tay thì không phải chờ nhịp nghỉ của camera
    handleDecodedCode(code);
    setManualCode('');
  }, [manualCode, handleDecodedCode]);

  /** Hỏi camera đang chạy xem có đèn pin không (Chrome Android có, iOS Safari không) */
  const detectTorch = useCallback(() => {
    try {
      const caps = scannerRef.current?.getRunningTrackCapabilities() as TorchCapabilities | undefined;
      setHasTorch(!!caps && caps.torch === true);
    } catch {
      setHasTorch(false);
    }
  }, []);

  const config = useMemo(() => ({
    fps: 10, // Giữ 10 để máy không nóng: đường quét nhanh ở trên mới là đường chính trên Android
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        // Vùng quét CÀNG TO CÀNG NÉT: html5-qrcode vẽ vùng này vào canvas đúng bằng kích thước
        // CSS của nó rồi mới giải mã, nên kích thước ở đây CHÍNH LÀ độ phân giải mà bộ giải mã
        // nhìn thấy. Trước đây 85% x (50% chiều RỘNG) cho ra 311x183 — quá bé cho mã vạch hơi xa.
        const width = Math.floor(viewfinderWidth * 0.94);
        const height = Math.floor(Math.min(viewfinderHeight * 0.62, viewfinderWidth * 0.78));
        return { width, height };
    },
    // Mã vạch/QR trên tem không bao giờ bị lật gương — bỏ lượt thử ảnh lật để đỡ nửa khối lượng
    // giải mã của ZXing (đường dự phòng cho iOS).
    disableFlip: true,
    // Xin độ phân giải cao và lấy nét liên tục. Camera càng nhiều điểm ảnh thì vạch mã càng rõ;
    // `focusMode: continuous` để máy tự lấy nét lại khi người dùng đưa tem ra xa/lại gần.
    videoConstraints: {
        facingMode: 'environment',
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // focusMode là thuộc tính NGOÀI chuẩn (Chrome Android hỗ trợ) nên không có trong kiểu
        // MediaTrackConstraints — ép kiểu ở dòng dưới thay vì dùng `any`.
        focusMode: 'continuous',
    } as MediaTrackConstraints,
    rememberLastUsedCamera: true,
    // KHÔNG ép aspectRatio 1.0 nữa: khung vuông cắt mất chiều cao trên điện thoại cầm dọc, trong
    // khi mã vạch EAN-13 là vệt dài — vùng nhìn càng rộng càng dễ bắt. Khung do CSS quyết định
    // (video đã `object-fit: cover`), mobile dùng khung cao 3:4, desktop giữ vuông.
  }), []);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(readerId, { 
      verbose: false,
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.ITF
      ],
      useBarCodeDetectorIfSupported: true
    });
    scannerRef.current = html5Qrcode;
    
    const startWithFallback = (devices: CameraDevice[]) => {
      // Method 1: Try to start with the environment-facing camera constraint. This is the most reliable way.
      html5Qrcode.start(
        { facingMode: "environment" },
        config,
        qrCodeSuccessCallback,
        () => {} // qrCodeErrorCallback
      ).then(() => {
        const stream = html5Qrcode.getRunningTrackCapabilities();
        if (stream) setActiveCameraId(stream.deviceId);
        setStatus('Hướng máy ảnh vào mã vạch hoặc mã QR.');
        setError(null);
        detectTorch();
      }).catch((err: unknown) => {
        console.warn("Could not start scanner with ideal facingMode constraint, falling back to manual selection.", err);
        // Method 2 (Fallback): If the constraint fails, find a camera with "back" in its label or use the first available camera.
        const rearCamera = devices.find(device => device.label.toLowerCase().includes('back'));
        const fallbackCameraId = rearCamera ? rearCamera.id : devices[0].id;
        
        html5Qrcode.start(
          fallbackCameraId,
          config,
          qrCodeSuccessCallback,
          () => {} // qrCodeErrorCallback
        ).then(() => {
          setActiveCameraId(fallbackCameraId);
          setStatus('Hướng máy ảnh vào mã vạch hoặc mã QR.');
          setError(null);
          detectTorch();
        }).catch((startErr: Error) => {
          let userFriendlyError = 'Không thể khởi động máy ảnh.';
          if (startErr.name === 'NotAllowedError') {
            userFriendlyError = 'Vui lòng cấp quyền truy cập máy ảnh cho trang web.';
          } else if (startErr.name === 'NotFoundError') {
            userFriendlyError = 'Không tìm thấy máy ảnh nào trên thiết bị này.';
          }
          setError(userFriendlyError);
        });
      });
    };

    Html5Qrcode.getCameras().then((devices: CameraDevice[]) => {
      if (devices && devices.length) {
        setCameras(devices);
        startWithFallback(devices);
      } else {
        setError('Không tìm thấy máy ảnh nào.');
      }
    }).catch(() => {
        // Check if the app is running in an iframe
        if (window.self !== window.top) {
            setError('Trang web mẹ (Google Sites) đã chặn quyền truy cập máy ảnh. Đây là một tính năng bảo mật.');
            setIsIframeError(true);
        } else {
            setError('Không thể truy cập máy ảnh. Vui lòng cấp quyền trong cài đặt trình duyệt.');
        }
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((error: unknown) => {
          // console.warn("Lỗi khi dừng máy quét lúc dọn dẹp (có thể bỏ qua):", error);
        });
      }
    };
  }, [config, qrCodeSuccessCallback, detectTorch]);

  /**
   * ĐƯỜNG QUÉT NHANH — lý do tồn tại (đo thật 2026-09-25, Playwright + camera giả phát mã EAN-13):
   *
   * html5-qrcode cắt vùng quét rồi VẼ LẠI vào canvas đúng bằng kích thước CSS của khung
   * (đo được 311x183px) trước khi giải mã — xem `drawImage(..., dWidth = qrRegion.width)` trong
   * html5-qrcode.ts. Camera 640x480 (điện thoại thật còn cao hơn nhiều) bị nén xuống 311px, nên
   * phần lớn chi tiết bị vứt đi. Hậu quả đo được: mã vạch rộng 95px trong khung 640x480
   * **KHÔNG nhận được sau 40 giây**, vì mỗi vạch còn chưa tới 1 pixel.
   *
   * Thêm nữa, html5-qrcode luân phiên mỗi khung hình một bộ giải mã (`getDecoder()`): một khung
   * dùng BarcodeDetector gốc, khung kế dùng ZXing chạy bằng JS (chậm hơn nhiều). Tức là chỉ một
   * nửa số lần thử là đi đường nhanh.
   *
   * Vòng dưới đây gọi thẳng `BarcodeDetector.detect(video)` trên THẺ VIDEO ở độ phân giải GỐC —
   * không qua canvas, không bị thu nhỏ, không luân phiên. Chạy song song với html5-qrcode chứ
   * không thay thế: máy nào không có BarcodeDetector (iOS Safari) vẫn quét như cũ. Cờ
   * `isScanningPaused` dùng chung nên không có chuyện một mã bị cộng hai lần.
   */
  useEffect(() => {
    type NativeDetector = { detect(src: CanvasImageSource): Promise<Array<{ rawValue: string }>> };
    type DetectorCtor = {
      new (o: { formats: string[] }): NativeDetector;
      getSupportedFormats(): Promise<string[]>;
    };
    const ctor = (window as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    if (!ctor) return; // iOS Safari: không có API này, dùng đường của html5-qrcode

    const MONG_MUON = ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'itf'];
    let dungLai = false;
    let hengio: number | null = null;

    (async () => {
      let detector: NativeDetector;
      try {
        const hoTro = await ctor.getSupportedFormats();
        const formats = MONG_MUON.filter(f => hoTro.includes(f));
        if (formats.length === 0) return;
        detector = new ctor({ formats });
      } catch (err) {
        console.warn('[Scanner] Không dùng được BarcodeDetector gốc:', err);
        return;
      }

      const quet = async () => {
        if (dungLai) return;
        if (!isScanningPaused.current) {
          const video = document.querySelector<HTMLVideoElement>(`#${readerId} video`);
          // readyState >= 2 (HAVE_CURRENT_DATA): đã có khung hình để đọc
          if (video && video.readyState >= 2 && video.videoWidth > 0) {
            try {
              const codes = await detector.detect(video);
              if (codes && codes.length > 0 && codes[0].rawValue) {
                handleDecodedCodeRef.current(codes[0].rawValue);
              }
            } catch {
              /* khung hình lỗi/đang đổi camera — bỏ qua, thử lại ở nhịp sau */
            }
          }
        }
        if (!dungLai) hengio = window.setTimeout(quet, 100); // ~10 lần/giây, luôn ở độ phân giải gốc
      };
      quet();
    })();

    return () => {
      dungLai = true;
      if (hengio) clearTimeout(hengio);
    };
  }, []);

  const handleSwitchCamera = useCallback(() => {
    if (cameras.length > 1 && activeCameraId && scannerRef.current?.isScanning) {
      const currentIndex = cameras.findIndex(c => c.id === activeCameraId);
      const nextIndex = (currentIndex + 1) % cameras.length;
      const nextCamera = cameras[nextIndex];

      setStatus(`Đang chuyển sang camera: ${nextCamera.label}...`);
      scannerRef.current.stop().then(() => {
        scannerRef.current.start(
          nextCamera.id,
          config,
          qrCodeSuccessCallback,
          () => {}
        )
        .then(() => {
          setActiveCameraId(nextCamera.id);
          setStatus('Hướng máy ảnh vào mã vạch hoặc mã QR.');
          setIsTorchOn(false); // camera mới luôn bắt đầu với đèn tắt
          detectTorch();
        });
      });
    }
  }, [activeCameraId, cameras, config, qrCodeSuccessCallback, detectTorch]);

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[60] bg-slate-900/40 flex flex-col items-center justify-center p-3 backdrop-blur-md overflow-y-auto"
      style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        #html5-qrcode-reader {
          border: none !important;
        }
        #html5-qrcode-reader video {
          object-fit: cover !important;
          border-radius: 0.375rem;
          width: 100% !important;
          height: 100% !important;
        }
        @keyframes scan-laser {
          0%, 100% { top: 8%; }
          50% { top: 92%; }
        }
        .animate-laser {
          animation: scan-laser 2s infinite ease-in-out;
        }
      ` }} />
      <div className="relative w-full max-w-md bg-slate-900 rounded-md overflow-hidden shadow-xl">
        {/* Khung cao 3:4 trên điện thoại (mã vạch là vệt dài, vùng nhìn càng rộng càng dễ bắt),
            trở lại vuông từ sm trở lên cho vừa màn hình ngang. */}
        <div id={readerId} className="w-full aspect-3/4 sm:aspect-square max-h-[52vh]"></div>

        {/* Bộ đếm số mã đã quét trong phiên — khỏi phải đóng máy quét ra đếm */}
        {scannedCount > 0 && !scanResult && (
          <div className="absolute top-3 left-3 z-20 flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded">
            <CheckCircleIcon className="h-3.5 w-3.5" />
            Đã quét {scannedCount}
          </div>
        )}
        
        {/* Overlay for scanning frame */}
        {!scanResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
              <div className="w-[85%] h-[50%] border-4 border-dashed border-white/70 rounded-2xl relative flex flex-col justify-between">
                  {/* Glowing laser line to indicate scanning */}
                  <div className="absolute left-1 right-1 h-0.5 bg-rose-500 shadow-[0_0_8px_#ef4444] animate-laser"></div>
              </div>
          </div>
        )}
        
        {/* Result Overlay - Covers the camera view */}
        {scanResult && (
          <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center text-white font-bold transition-all duration-300 ${scanResult.type === 'success' ? 'bg-slate-800/95' : 'bg-rose-950/95'}`}>
            <div className={`p-6 rounded-full mb-4 ${scanResult.type === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
              {scanResult.type === 'success' ? 
                <CheckCircleIcon className="h-24 w-24 text-emerald-400 animate-bounce" /> : 
                <XCircleIcon className="h-24 w-24 text-rose-400 animate-pulse" />
              }
            </div>
            <h3 className="text-2xl mb-2">{scanResult.type === 'success' ? 'THÀNH CÔNG' : 'LỖI'}</h3>
            <p className="text-lg px-6 text-center font-medium opacity-90">{scanResult.message}</p>
            <div className="mt-8 flex items-center gap-2 text-sm font-normal text-slate-400">
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              Đang chuẩn bị quét tiếp...
            </div>
          </div>
        )}

      </div>
      <div className="text-center text-white mt-3 w-full max-w-md shrink-0">
        {error ? (
          <div className="font-semibold text-rose-100 bg-rose-900/60 px-4 py-3 rounded space-y-2.5">
              <p>{error}</p>
              <p className="text-[11px] font-medium text-rose-200/90">
                  Máy ảnh không dùng được vẫn thêm sản phẩm được: bấm <strong>"Nhập mã tay"</strong> bên dưới.
              </p>
              {isIframeError && (
                  <Button variant="primary" size="none" onClick={handleOpenInNewTab} className="w-full h-10 rounded text-sm font-bold">
                      Mở trong Tab Mới để Quét
                  </Button>
              )}
          </div>
        ) : (
          <p className="font-medium text-sm bg-slate-900/60 px-4 py-2 rounded">{!scanResult ? status : ' '}</p>
        )}
        
        {/* Nhập mã bằng tay: mã vạch mờ/rách hoặc máy ảnh bị chặn thì vẫn thêm được sản phẩm */}
        {showManualInput && (
          <form onSubmit={handleSubmitManualCode} className="mt-3 flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Gõ mã sản phẩm rồi Enter..."
              className="flex-1 min-w-0 h-11 px-3 text-sm rounded border border-slate-300 bg-white text-slate-800 placeholder-slate-400 focus:outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30"
            />
            <Button type="submit" variant="primary" size="none" disabled={!manualCode.trim()} className="h-11 px-4 rounded text-sm font-bold gap-1.5">
              <CornerDownLeft className="h-4 w-4" />
              Thêm
            </Button>
          </form>
        )}

        {/* Hàng thao tác: đèn pin và nhập tay đứng cạnh nhau, nút đóng tách riêng bên dưới để
            không bấm nhầm khi đang quét bằng một tay. */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            variant="secondary"
            size="none"
            onClick={handleToggleTorch}
            disabled={!hasTorch}
            title={hasTorch ? 'Bật/tắt đèn pin' : 'Thiết bị này không có đèn pin'}
            className={`h-11 rounded text-sm font-bold gap-2 ${isTorchOn ? 'bg-amber-400 border-amber-400 text-slate-900 hover:bg-amber-300' : ''}`}
          >
            {isTorchOn ? <Flashlight className="h-4 w-4" /> : <FlashlightOff className="h-4 w-4" />}
            {isTorchOn ? 'Tắt đèn' : 'Đèn pin'}
          </Button>
          <Button
            variant="secondary"
            size="none"
            onClick={() => setShowManualInput(v => !v)}
            className={`h-11 rounded text-sm font-bold gap-2 ${showManualInput ? 'bg-sky-100 border-sky-300 text-sky-800 hover:bg-sky-200' : ''}`}
          >
            <Keyboard className="h-4 w-4" />
            Nhập mã tay
          </Button>
        </div>

        {/* Nút đóng/dừng quét */}
        <Button
          variant="danger"
          size="none"
          onClick={onClose}
          className="w-full mt-2 h-12 rounded text-base font-bold gap-2"
        >
          <XIcon className="h-5 w-5" />
          Đóng / Dừng quét
        </Button>
      </div>
       <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {cameras.length > 1 && (
            <Button
                variant="unstyled"
                onClick={handleSwitchCamera}
                className="p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors"
                aria-label="Chuyển camera"
            >
                <SwitchCameraIcon className="h-6 w-6" />
            </Button>
          )}
          <Button
            variant="unstyled"
            onClick={onClose}
            className="p-2 rounded-full bg-slate-900/60 text-white hover:bg-slate-900/80 transition-colors"
            aria-label="Đóng máy quét"
          >
            <XIcon className="h-6 w-6" />
          </Button>
       </div>
    </div>,
    document.body
  );
};

export default Scanner;