import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { XIcon, SwitchCameraIcon, CheckCircleIcon, XCircleIcon } from './Icons';
import { Html5Qrcode } from 'html5-qrcode';

interface CameraDevice {
  id: string;
  label: string;
}

interface ScannerProps {
  onScanSuccess: (scannedCode: string) => boolean;
  onClose: () => void;
}

const Scanner: React.FC<ScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<any>(null);
  const readerId = "html5-qrcode-reader";
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [activeCameraId, setActiveCameraId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isIframeError, setIsIframeError] = useState(false);
  const [status, setStatus] = useState<string>('Yêu cầu quyền truy cập máy ảnh...');
  const [scanResult, setScanResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const isScanningPaused = useRef(false);
  const scanTimeoutRef = useRef<number | null>(null);

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
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  const qrCodeSuccessCallback = useCallback((decodedText: string) => {
    if (isScanningPaused.current) return;
    
    isScanningPaused.current = true;
    
    const success = onScanSuccessRef.current(decodedText);
    
    if (success) {
      if (navigator.vibrate) navigator.vibrate(200); // Vibrate once on success
      playSound('success');
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
    }, 1200); // Slightly reduced delay
  }, [playSound]);

  const config = useMemo(() => ({
    fps: 10, // 10 FPS is sufficient for barcode scanning, saves CPU/battery
    qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        // Use 70% of the smaller screen dimension for the scan box, making it responsive.
        const qrboxSize = Math.floor(minEdge * 0.7);
        return {
            width: qrboxSize,
            height: qrboxSize,
        };
    },
    rememberLastUsedCamera: true,
  }), []);

  useEffect(() => {
    const html5Qrcode = new Html5Qrcode(readerId, { verbose: false });
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
      }).catch((err: any) => {
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
        scannerRef.current.stop().catch((error: any) => {
          // console.warn("Lỗi khi dừng máy quét lúc dọn dẹp (có thể bỏ qua):", error);
        });
      }
    };
  }, [config, qrCodeSuccessCallback]);

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
        });
      });
    }
  }, [activeCameraId, cameras, config, qrCodeSuccessCallback]);

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/30 flex flex-col items-center justify-center p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md bg-slate-900 rounded-2xl overflow-hidden shadow-2xl">
        <div id={readerId} className="w-full aspect-square"></div>
        
        {/* Overlay for scanning frame */}
        {!scanResult && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-2/3 h-2/3 border-4 border-dashed border-white/50 rounded-lg"></div>
          </div>
        )}
        
        {/* Result Overlay - Covers the camera view */}
        {scanResult && (
          <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center text-white font-bold transition-all duration-300 ${scanResult.type === 'success' ? 'bg-slate-800/95' : 'bg-red-950/95'}`}>
            <div className={`p-6 rounded-full mb-4 ${scanResult.type === 'success' ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
              {scanResult.type === 'success' ? 
                <CheckCircleIcon className="h-24 w-24 text-green-400 animate-bounce" /> : 
                <XCircleIcon className="h-24 w-24 text-red-400 animate-pulse" />
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
      <div className="text-center text-white mt-4 max-w-md">
        {error ? (
          <div className="font-semibold text-red-400 bg-red-900 bg-opacity-50 px-4 py-3 rounded-lg space-y-3">
              <p>{error}</p>
              {isIframeError && (
                  <button
                      onClick={handleOpenInNewTab}
                      className="w-full inline-flex items-center justify-center rounded-md text-sm font-medium bg-indigo-600 text-indigo-50 hover:bg-indigo-700 h-10 px-6 py-2"
                  >
                      Mở trong Tab Mới để Quét
                  </button>
              )}
          </div>
        ) : (
          <p className="font-medium bg-slate-900 bg-opacity-50 px-4 py-2 rounded-lg">{!scanResult ? status : ' '}</p>
        )}
      </div>
       <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
          {cameras.length > 1 && (
            <button
                onClick={handleSwitchCamera}
                className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
                aria-label="Chuyển camera"
            >
                <SwitchCameraIcon className="h-6 w-6" />
            </button>
          )}
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-black bg-opacity-50 text-white hover:bg-opacity-75 transition-colors"
            aria-label="Đóng máy quét"
          >
            <XIcon className="h-6 w-6" />
          </button>
       </div>
    </div>
  );
};

export default Scanner;