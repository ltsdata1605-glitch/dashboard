import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '../../components/shared/ui/Button';
import { StickerEventUserData } from './types';
import { stickerRegister, stickerResolveSession } from './services/sessionService';
import { getErrorMessage, getErrorCode } from '../../utils/dataUtils';

interface LoginProps {
  onLoginSuccess: (user: User, userData: StickerEventUserData) => void;
}

// Firebase Auth ném FirebaseError (code + message), nhưng code trong file này cũng tự throw
// object thường { code, message } (không phải instance Error thật) — dùng chung 1 shape lỏng
// thay vì catch (e: any) để vẫn giữ được .code/.message nhưng hẹp hơn any.
interface AuthErrorLike {
  code?: string;
  message?: string;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [storeId, setStoreId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Try cached userData first to save a Firestore read — nhưng chỉ tin cache
          // nếu token hiện tại đã có custom claim stickerRole. Phiên đăng nhập từ
          // TRƯỚC khi 3 Cloud Function này tồn tại (hoặc trước khi tài khoản này
          // từng gọi stickerResolveSession) sẽ có token không claim gì cả — nếu cứ
          // tin cache thì mọi thao tác đọc stores/{storeId}/** sẽ bị Rules từ chối
          // vĩnh viễn cho tới khi user tự xoá sessionStorage (đăng xuất/đăng nhập lại
          // cùng uid vẫn trúng cache cũ, không tự sửa được).
          const cacheKey = `userData_${user.uid}`;
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              const parsed = JSON.parse(cachedData) as StickerEventUserData;
              const tokenResult = await user.getIdTokenResult();
              if (tokenResult.claims.stickerRole) {
                onLoginSuccess(user, parsed);
                return;
              }
              // Claim chưa đồng bộ — bỏ qua cache, rơi xuống gọi stickerResolveSession() bên dưới.
            } catch { /* cache invalid, fall through to server */ }
          }

          let profile;
          let retries = 3;
          let lastError: unknown;

          while (retries > 0) {
            try {
              profile = await stickerResolveSession();
              break; // Success
            } catch (err: unknown) {
              const code = getErrorCode(err) || '';
              // "not-found" = hồ sơ Firestore chưa kịp ghi xong ngay sau khi đăng ký
              // (stickerRegister vẫn đang chạy) — thử lại thay vì báo lỗi ngay.
              const isNotFound = code.includes('not-found');
              console.warn(`Lỗi tải phiên đăng nhập (còn ${retries - 1} lần thử):`, err);
              lastError = err;
              retries--;
              if (retries === 0 || !isNotFound) throw lastError;
              await new Promise(resolve => setTimeout(resolve, 1200));
            }
          }

          if (profile) {
            // Đồng bộ custom claims (stickerRole/stickerStoreId) mới nhất vào ID token
            // để các thao tác tiếp theo (đọc danh sách user theo kho...) dùng đúng quyền.
            await user.getIdToken(true);

            const data: StickerEventUserData = {
              uid: user.uid,
              username: profile.username ?? undefined,
              email: user.email ?? undefined,
              role: profile.role,
              storeId: profile.storeId ?? undefined,
              storeHasAdmin: profile.storeHasAdmin,
            };
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            onLoginSuccess(user, data);
          }
        } catch (err: unknown) {
          console.error("Lỗi lấy thông tin người dùng:", err);
          const code = getErrorCode(err) || '';
          const msg = getErrorMessage(err) || '';

          if (code.includes('not-found')) {
            setError('Không tìm thấy thông tin người dùng. Tài khoản có thể đã bị xóa.');
            await signOut(auth);
          } else if (code.includes('permission-denied') || msg.includes('permissions') || msg.includes('Quyền')) {
            setError('Lỗi phân quyền. Vui lòng tải lại trang (F5) hoặc liên hệ Admin.');
          } else if (code.includes('unavailable') || code.includes('deadline-exceeded')) {
            setError('Không thể kết nối đến máy chủ dữ liệu. Vui lòng kiểm tra internet hoặc thử lại sau.');
          } else {
            setError(`Lỗi kết nối (${code || 'unknown'}): ${msg || 'Vui lòng kiểm tra mạng và thử lại.'}`);
          }
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [onLoginSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Append a dummy domain to create a valid email format for Firebase Auth
    const email = username.includes('@') ? username : `${username}@example.com`;

    // Firebase requires at least 6 characters — nếu user nhập mật khẩu ngắn
    // hơn thì lặp lại cho đủ 6 ký tự (áp dụng cho cả admin lẫn staff — không
    // còn mật khẩu mặc định dùng chung nữa, mỗi người tự đặt mật khẩu riêng).
    let finalPassword = password;
    if (password && password.length < 6) {
        finalPassword = password.repeat(Math.ceil(6 / password.length)).substring(0, 6);
    }

    try {
      if (isLogin) {
        // Login Logic
        try {
          await signInWithEmailAndPassword(auth, email, finalPassword);
        } catch (loginErr: unknown) {
          const code = (loginErr as AuthErrorLike).code;
          if (code === 'auth/invalid-credential' || code === 'auth/user-not-found') {
            throw {
              code: 'auth/invalid-credential',
              message: 'Tên đăng nhập hoặc mật khẩu không đúng.'
            };
          }
          throw loginErr;
        }
      } else {
        // Register Logic
        let cleanStoreId = storeId.trim().toUpperCase();

        // Special case for Super Admin 21707 and admin: allow registration without storeId or with a default one
        if ((username === '21707' || username === 'admin') && !cleanStoreId) {
            cleanStoreId = 'SUPERADMIN';
        }

        if (!cleanStoreId) {
            setError('Vui lòng nhập mã kho siêu thị.');
            setLoading(false);
            return;
        }

        // Việc kiểm tra "kho đã có admin chưa" giờ do server (stickerRegister)
        // quyết định — client không tự đọc Firestore rồi tự tin ghi thẳng nữa.

        let user;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
            user = userCredential.user;
        } catch (regErr: unknown) {
            if ((regErr as AuthErrorLike).code === 'auth/email-already-in-use') {
                // If email exists, try to login to update the profile (allows updating storeId)
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, finalPassword);
                    user = userCredential.user;
                } catch {
                    // If login fails, it means password was wrong or some other issue
                    throw {
                        code: 'auth/email-already-in-use',
                        message: 'Tên đăng nhập này đã được sử dụng. Nếu bạn muốn cập nhật mã kho, vui lòng nhập đúng mật khẩu cũ.'
                    };
                }
            } else {
                throw regErr;
            }
        }

        if (user) {
            try {
                await stickerRegister({ username, storeId: cleanStoreId, requestedRole: role });
            } catch (fnErr: unknown) {
                const code = getErrorCode(fnErr) || '';
                let message = 'Đăng ký thất bại. Vui lòng thử lại.';
                if (code.includes('already-exists')) {
                    message = `Mã kho "${cleanStoreId}" đã có quản trị viên. Mỗi mã kho chỉ được có 1 tài khoản Admin duy nhất.`;
                } else if (code.includes('failed-precondition')) {
                    message = `Lưu ý về lỗi "Mã kho chưa được khởi tạo": Lỗi này xuất hiện khi một Nhân viên đăng ký vào một mã kho mà chưa có Quản lý (Admin) nào đăng ký trước đó cho kho đó. Bạn hãy thông tin Quản lý, cần đăng ký tài khoản cho mã kho, sau đó Nhân viên mới có thể đăng ký vào.`;
                } else {
                    message = getErrorMessage(fnErr) || message;
                }
                throw { code: 'sticker/register-failed', message };
            }
        }
      }
      setLoading(false);
    } catch (err: unknown) {
      const authErr = err as AuthErrorLike;
      console.error("Auth Error Details:", authErr.code, authErr.message);

      if (authErr.code === 'sticker/register-failed') {
        setError(authErr.message || 'Đăng ký thất bại. Vui lòng thử lại.');
      } else if (authErr.code === 'auth/email-already-in-use') {
        setError(authErr.message || 'Tên đăng nhập này đã được sử dụng. Vui lòng thử Đăng nhập.');
      } else if (authErr.code === 'auth/invalid-email') {
        setError('Tên đăng nhập không hợp lệ.');
      } else if (authErr.code === 'auth/weak-password') {
        setError('Mật khẩu không hợp lệ.');
      } else if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
        if (isLogin) {
            setError('Tên đăng nhập hoặc mật khẩu không đúng. Nếu bạn chưa có tài khoản hoặc vừa xóa dữ liệu, vui lòng chọn "Đăng ký" bên dưới.');
        } else {
            setError('Thông tin đăng ký không hợp lệ.');
        }
      } else if (authErr.code === 'auth/operation-not-allowed') {
        setError('Lỗi hệ thống: Đăng nhập bằng Email/Password chưa được bật trong Firebase Console.');
      } else if (authErr.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet.');
      } else {
        setError('Lỗi: ' + (authErr.message || 'Vui lòng thử lại sau.'));
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-800">
            {isLogin ? 'Đăng Nhập' : 'Đăng Ký'}
            </h2>
        </div>
        
        {/* Welcome / Instruction Message */}
        <div className="bg-indigo-50 text-indigo-800 p-4 rounded-lg mb-6 text-sm border border-indigo-100">
            <p className="font-semibold mb-2">👋 Chào mừng bạn!</p>
            <ul className="list-disc pl-5 space-y-1">
                <li>Nếu bạn là <strong>Quản lý</strong>: Vui lòng tạo tài khoản Admin để tải lên dữ liệu giá và tồn kho.</li>
                <li>Nếu bạn là <strong>Nhân viên</strong>: Vui lòng tạo tài khoản Nhân viên để quét mã và in tem giá.</li>
            </ul>
        </div>

        {error && (
          <div className="bg-rose-50 border-l-4 border-rose-500 text-rose-700 p-4 mb-4 rounded text-sm" role="alert">
            <p>{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Role Selection */}
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vai trò</label>
              <div className="flex gap-4">
              <label className="flex items-center cursor-pointer text-sm">
                  <input
                  type="radio"
                  value="staff"
                  checked={role === 'staff'}
                  onChange={() => setRole('staff')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  Nhân viên
              </label>
              <label className="flex items-center cursor-pointer text-sm">
                  <input
                  type="radio"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  Admin (Quản lý)
              </label>
              </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập (User)</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
              placeholder="Nhập tên đăng nhập..."
            />
          </div>

          {/* Mật khẩu — bắt buộc cho cả 2 vai trò, mỗi người tự đặt riêng
              (không còn dùng chung 1 mật khẩu mặc định cho mọi nhân viên) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Mật khẩu
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              required
              placeholder="Nhập mật khẩu..."
            />
          </div>

          {/* Store ID required for both Admin and Staff only during Registration */}
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Mã kho siêu thị</label>
              <input
                type="text"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required={!isLogin}
                placeholder="Nhập mã kho..."
              />
            </div>
          )}

          <Button
            type="submit"
            variant="ghost"
            disabled={loading}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all font-bold shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý...</span>
                </div>
            ) : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
          </Button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <Button
            variant="ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setPassword('');
            }}
            className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Login;
