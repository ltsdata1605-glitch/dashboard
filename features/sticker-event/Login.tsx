import React, { useState, useEffect } from 'react';
import { auth } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithCustomToken, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { Button } from '../../components/shared/ui/Button';
import { StickerEventUserData } from './types';
import { stickerRegister, stickerResolveSession, stickerStaffAuth } from './services/sessionService';
import { getErrorMessage, getErrorCode } from '../../utils/dataUtils';

interface LoginProps {
  onLoginSuccess: (user: User, userData: StickerEventUserData) => void;
}

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
              const isNotFound = code.includes('not-found');
              console.warn(`Lỗi tải phiên đăng nhập (còn ${retries - 1} lần thử):`, err);
              lastError = err;
              retries--;
              if (retries === 0 || !isNotFound) throw lastError;
              await new Promise(resolve => setTimeout(resolve, 1200));
            }
          }

          if (profile) {
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

    const cleanUsername = username.trim();
    if (!cleanUsername) {
        setError('Vui lòng nhập tên đăng nhập.');
        setLoading(false);
        return;
    }

    let cleanStoreId = storeId.trim().toUpperCase();
    if (!isLogin && role === 'staff' && !cleanStoreId) {
        setError('Vui lòng nhập mã kho siêu thị.');
        setLoading(false);
        return;
    }

    // ───────── STAFF AUTHENTICATION (NO PASSWORD) ─────────
    if (role === 'staff') {
      const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@example.com`;
      const staffDefaultPassword = `staff_${cleanUsername.toLowerCase()}_123456`;

      // 1. Try Cloud Function stickerStaffAuth first
      try {
        const staffRes = await stickerStaffAuth({
          username: cleanUsername,
          storeId: cleanStoreId,
          isLogin
        });
        await signInWithCustomToken(auth, staffRes.customToken);
        setLoading(false);
        return;
      } catch (fnErr: unknown) {
        const fnCode = getErrorCode(fnErr) || (fnErr as AuthErrorLike).code || '';
        const fnMsg = getErrorMessage(fnErr) || (fnErr as AuthErrorLike).message || '';

        // If Cloud Function returns business error
        if (fnCode.includes('not-found') || fnMsg.includes('chưa có tài khoản') || fnMsg.includes('chưa tồn tại')) {
          setError('Tên đăng nhập chưa có tài khoản. Vui lòng chọn "Đăng ký" bên dưới.');
          setLoading(false);
          return;
        }
        if (fnCode.includes('permission-denied') || fnMsg.includes('Quản lý')) {
          setError('Tài khoản này là Quản lý (Admin). Vui lòng chọn vai trò Admin (Quản lý) và nhập mật khẩu.');
          setLoading(false);
          return;
        }
        if (fnCode.includes('failed-precondition') || fnMsg.includes('chưa được khởi tạo')) {
          setError('Lưu ý: Nhân viên chỉ có thể đăng ký vào mã kho sau khi Quản lý (Admin) của kho đó đã đăng ký tài khoản trước. Vui lòng liên hệ Quản lý tạo tài khoản Admin trước.');
          setLoading(false);
          return;
        }

        // 2. If Cloud Function returns internal / not-deployed error, fallback to client-side Auth
        console.warn("Cloud Function stickerStaffAuth unavailable, using client-side fallback:", fnErr);
        try {
          if (isLogin) {
            // Client Staff Login Fallback
            try {
              await signInWithEmailAndPassword(auth, email, staffDefaultPassword);
            } catch (clientLoginErr: unknown) {
              const code = (clientLoginErr as AuthErrorLike).code || '';
              if (code === 'auth/too-many-requests') {
                setError('Hệ thống tạm khóa thao tác do đăng nhập sai nhiều lần. Vui lòng thử lại sau 2-3 phút.');
                setLoading(false);
                return;
              }
              const fallbacks = [`${cleanUsername}123456`, '123456123456', 'staff123456'];
              let loggedIn = false;
              for (const fbPass of fallbacks) {
                try {
                  await signInWithEmailAndPassword(auth, email, fbPass);
                  loggedIn = true;
                  break;
                } catch { /* continue */ }
              }
              if (!loggedIn) {
                setError('Tên đăng nhập chưa có tài khoản. Vui lòng chọn "Đăng ký" bên dưới.');
                setLoading(false);
                return;
              }
            }
          } else {
            // Client Staff Register Fallback
            let user;
            try {
              const userCredential = await createUserWithEmailAndPassword(auth, email, staffDefaultPassword);
              user = userCredential.user;
            } catch (regErr: unknown) {
              const code = (regErr as AuthErrorLike).code || '';
              if (code === 'auth/email-already-in-use') {
                try {
                  const userCredential = await signInWithEmailAndPassword(auth, email, staffDefaultPassword);
                  user = userCredential.user;
                } catch {
                  try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, `${cleanUsername}123456`);
                    user = userCredential.user;
                  } catch {
                    setError('Tên đăng nhập này đã được khởi tạo. Vui lòng chọn "Đăng nhập".');
                    setLoading(false);
                    return;
                  }
                }
              } else {
                throw regErr;
              }
            }

            if (user) {
              try {
                await stickerRegister({ username: cleanUsername, storeId: cleanStoreId, requestedRole: 'staff' });
              } catch (regFnErr: unknown) {
                const code = getErrorCode(regFnErr) || '';
                if (code.includes('failed-precondition')) {
                  setError('Lưu ý: Nhân viên chỉ có thể đăng ký vào mã kho sau khi Quản lý (Admin) của kho đó đã đăng ký tài khoản trước. Vui lòng liên hệ Quản lý tạo tài khoản Admin trước.');
                } else {
                  setError(getErrorMessage(regFnErr) || 'Đăng ký Nhân viên thất bại.');
                }
                setLoading(false);
                return;
              }
            }
          }
          setLoading(false);
          return;
        } catch (fallbackErr: unknown) {
          console.error("Staff fallback auth error:", fallbackErr);
          const errCode = (fallbackErr as AuthErrorLike).code || '';
          if (errCode === 'auth/too-many-requests') {
            setError('Hệ thống tạm khóa thao tác do đăng nhập sai nhiều lần. Vui lòng thử lại sau 2-3 phút.');
          } else {
            setError('Xác thực thất bại. Vui lòng kiểm tra lại tên đăng nhập hoặc chọn "Đăng ký".');
          }
          setLoading(false);
          return;
        }
      }
    }

    // ───────── ADMIN AUTHENTICATION (REQUIRES PASSWORD) ─────────
    const email = cleanUsername.includes('@') ? cleanUsername : `${cleanUsername}@example.com`;

    let finalPassword = password;
    if (password && password.length < 6) {
        finalPassword = password.repeat(Math.ceil(6 / password.length)).substring(0, 6);
    }

    try {
      if (isLogin) {
        // Admin Login Logic
        try {
          await signInWithEmailAndPassword(auth, email, finalPassword);
        } catch (loginErr: unknown) {
          const code = (loginErr as AuthErrorLike).code;
          if (code === 'auth/too-many-requests') {
            throw {
              code: 'auth/too-many-requests',
              message: 'Tài khoản tạm thời bị khóa do đăng nhập sai nhiều lần. Vui lòng thử lại sau 2-3 phút.'
            };
          } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
            throw {
              code: 'auth/invalid-credential',
              message: 'Tên đăng nhập hoặc mật khẩu Admin không đúng.'
            };
          }
          throw loginErr;
        }
      } else {
        // Admin Register Logic
        if ((cleanUsername === '21707' || cleanUsername === 'admin') && !cleanStoreId) {
            cleanStoreId = 'SUPERADMIN';
        }

        if (!cleanStoreId) {
            setError('Vui lòng nhập mã kho siêu thị.');
            setLoading(false);
            return;
        }

        let user;
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
            user = userCredential.user;
        } catch (regErr: unknown) {
            if ((regErr as AuthErrorLike).code === 'auth/email-already-in-use') {
                try {
                    const userCredential = await signInWithEmailAndPassword(auth, email, finalPassword);
                    user = userCredential.user;
                } catch {
                    throw {
                        code: 'auth/email-already-in-use',
                        message: 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn "Đăng nhập" hoặc kiểm tra lại mật khẩu.'
                    };
                }
            } else {
                throw regErr;
            }
        }

        if (user) {
            try {
                await stickerRegister({ username: cleanUsername, storeId: cleanStoreId, requestedRole: role });
            } catch (fnErr: unknown) {
                const code = getErrorCode(fnErr) || '';
                let message = 'Đăng ký Admin thất bại. Vui lòng thử lại.';
                if (code.includes('already-exists')) {
                    message = `Mã kho "${cleanStoreId}" đã có quản trị viên. Mỗi mã kho chỉ được có 1 tài khoản Admin duy nhất.`;
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
        setError(authErr.message || 'Tên đăng nhập này đã được sử dụng. Vui lòng chọn "Đăng nhập".');
      } else if (authErr.code === 'auth/too-many-requests') {
        setError(authErr.message || 'Hệ thống tạm khóa thao tác do đăng nhập sai nhiều lần. Vui lòng thử lại sau 2-3 phút.');
      } else if (authErr.code === 'auth/invalid-email') {
        setError('Tên đăng nhập không hợp lệ.');
      } else if (authErr.code === 'auth/weak-password') {
        setError('Mật khẩu không hợp lệ.');
      } else if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/user-not-found' || authErr.code === 'auth/wrong-password') {
        setError('Tên đăng nhập hoặc mật khẩu không đúng. Vui lòng kiểm tra lại.');
      } else if (authErr.code === 'auth/operation-not-allowed') {
        setError('Lỗi hệ thống: Đăng nhập bằng Email/Password chưa được bật trong Firebase Console.');
      } else if (authErr.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet.');
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
                <li>Nếu bạn là <strong>Nhân viên</strong>: Vui lòng tạo tài khoản Nhân viên (chỉ cần nhập User và Mã kho, không cần mật khẩu).</li>
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
              <label className="flex items-center cursor-pointer text-sm font-medium">
                  <input
                  type="radio"
                  value="staff"
                  checked={role === 'staff'}
                  onChange={() => setRole('staff')}
                  className="mr-2 text-indigo-600 focus:ring-indigo-500"
                  />
                  Nhân viên
              </label>
              <label className="flex items-center cursor-pointer text-sm font-medium">
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

          {/* Mật khẩu — Chỉ bắt buộc và hiển thị khi Vai trò là Admin */}
          {role === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Mật khẩu
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                required={role === 'admin'}
                placeholder="Nhập mật khẩu..."
              />
            </div>
          )}

          {/* Store ID required during Registration */}
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
