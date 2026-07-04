import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';

export function useStickerEventAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const handleLoginSuccess = useCallback((u: User, data: any) => {
    setUser(u);
    setUserData(data);
  }, []);

  return {
    user,
    setUser,
    userData,
    setUserData,
    isInitializing,
    setIsInitializing,
    handleLoginSuccess,
  };
}
