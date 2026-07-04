import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';

interface LoginProps {
  onLoginSuccess: (user: User, userData: any) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'admin' | 'staff'>('staff');
  const [storeId, setStoreId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Default password for staff to enable "passwordless" experience
  const STAFF_DEFAULT_PASSWORD = "staff_default_password_123";

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Try cached userData first to save a Firestore read
          const cacheKey = `userData_${user.uid}`;
          const cachedData = sessionStorage.getItem(cacheKey);
          if (cachedData) {
            try {
              onLoginSuccess(user, JSON.parse(cachedData));
              return;
            } catch { /* cache invalid, fall through to Firestore */ }
          }

          let userDoc;
          let retries = 3;
          let lastError;

          while (retries > 0) {
            try {
              userDoc = await getDoc(doc(db, 'users', user.uid));
              break; // Success
            } catch (err: any) {
              console.warn(`Lỗi tải dữ liệu người dùng (còn ${retries - 1} lần thử):`, err);
              lastError = err;
              retries--;
              if (retries === 0) throw lastError;
              // Đợi 1 giây trước khi thử lại (giúp xử lý lỗi token chưa kịp refresh hoặc mạng chậm)
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
          
          // Handle race condition during registration where doc is created right after auth
          if (userDoc && !userDoc.exists()) {
              await new Promise(resolve => setTimeout(resolve, 1500));
              userDoc = await getDoc(doc(db, 'users', user.uid));
          }

          if (userDoc && userDoc.exists()) {
            const data = userDoc.data();
            // Cache to sessionStorage to avoid Firestore read on next page load
            sessionStorage.setItem(cacheKey, JSON.stringify(data));
            onLoginSuccess(user, data);
          } else {
            setError('Không tìm thấy thông tin người dùng. Tài khoản có thể đã bị xóa.');
            await signOut(auth);
            setLoading(false);
          }
        } catch (err: any) {
          console.error("Lỗi kết nối Firestore:", err);
          const errMsg = err.message || "";
          const errCode = err.code || "";
          
          if (errMsg.includes("permissions") || errMsg.includes("Quyền") || errCode === 'permission-denied') {
             setError('Lỗi phân quyền. Vui lòng tải lại trang (F5) hoặc liên hệ Admin.');
          } else if (errCode === 'unavailable' || errCode === 'deadline-exceeded') {
             setError('Không thể kết nối đến máy chủ dữ liệu. Vui lòng kiểm tra internet hoặc thử lại sau.');
          } else {
             setError(`Lỗi kết nối (${errCode || 'unknown'}): ${errMsg || 'Vui lòng kiểm tra mạng và thử lại.'}`);
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
    
    // Determine password to use
    let finalPassword = password;
    
    if (role === 'staff') {
        finalPassword = STAFF_DEFAULT_PASSWORD;
    } else {
        // Firebase requires at least 6 characters. 
        // If user enters '123', we pad it to '123123' to meet the requirement.
        if (password && password.length < 6) {
            finalPassword = password.repeat(Math.ceil(6 / password.length)).substring(0, 6);
        }
    }

    try {
      if (isLogin) {
        // Login Logic
        try {
          await signInWithEmailAndPassword(auth, email, finalPassword);
        } catch (loginErr: any) {
          if (loginErr.code === 'auth/invalid-credential' || loginErr.code === 'auth/user-not-found') {
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

        // Check if Store ID is already taken by another Admin (if registering as Admin)
        // Or check if Store ID exists (if registering as Staff)
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('storeId', '==', cleanStoreId), where('role', '==', 'admin'), limit(1));
        const adminCheckSnapshot = await getDocs(q);
        
        if (role === 'admin') {
            if (!adminCheckSnapshot.empty) {
                setError(`Mã kho "${cleanStoreId}" đã có quản trị viên. Mỗi mã kho chỉ được có 1 tài khoản Admin duy nhất.`);
                setLoading(false);
                return;
            }
        } else if (role === 'staff') {
            if (adminCheckSnapshot.empty) {
                setError(`Lưu ý về lỗi "Mã kho chưa được khởi tạo": Lỗi này xuất hiện khi một Nhân viên đăng ký vào một mã kho mà chưa có Quản lý (Admin) nào đăng ký trước đó cho kho đó. Bạn hãy thông tin Quản lý, cần đăng ký tài khoản cho mã kho, sau đó Nhân viên mới có thể đăng ký vào.`);
                setLoading(false);
                return;
            }
        }

        // Password check removed as per user request

        try {
            let user;
            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, finalPassword);
                user = userCredential.user;
            } catch (regErr: any) {
                if (regErr.code === 'auth/email-already-in-use') {
                    // If email exists, try to login to update the profile (allows updating storeId)
                    try {
                        const userCredential = await signInWithEmailAndPassword(auth, email, finalPassword);
                        user = userCredential.user;
                    } catch (loginErr: any) {
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
                // Create or update user document in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                  uid: user.uid,
                  username: username,
                  email: user.email,
                  role: role,
                  storeId: cleanStoreId,
                  createdAt: new Date()
                }, { merge: true });
            }
        } catch (regErr: any) {
            throw regErr;
        }
      }
      setLoading(false);
    } catch (err: any) {
      console.error("Auth Error Details:", err.code, err.message);
      
      if (err.code === 'auth/email-already-in-use') {
        setError(err.message || 'Tên đăng nhập này đã được sử dụng. Vui lòng thử Đăng nhập.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Tên đăng nhập không hợp lệ.');
      } else if (err.code === 'auth/weak-password') {
        setError('Mật khẩu không hợp lệ.');
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        if (isLogin) {
            setError('Tên đăng nhập hoặc mật khẩu không đúng. Nếu bạn chưa có tài khoản hoặc vừa xóa dữ liệu, vui lòng chọn "Đăng ký" bên dưới.');
        } else {
            setError('Thông tin đăng ký không hợp lệ.');
        }
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Lỗi hệ thống: Đăng nhập bằng Email/Password chưa được bật trong Firebase Console.');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Lỗi kết nối mạng. Vui lòng kiểm tra internet.');
      } else {
        setError('Lỗi: ' + (err.message || 'Vui lòng thử lại sau.'));
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
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded text-sm" role="alert">
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

          {/* Password field only for Admin */}
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

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all font-bold shadow-sm disabled:opacity-50 mt-2"
          >
            {loading ? (
                <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Đang xử lý...</span>
                </div>
            ) : (isLogin ? 'Đăng Nhập' : 'Đăng Ký')}
          </button>
        </form>

        <div className="mt-6 text-center border-t border-slate-100 pt-4">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setPassword('');
            }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-semibold"
          >
            {isLogin ? 'Chưa có tài khoản? Đăng ký ngay' : 'Đã có tài khoản? Đăng nhập'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
