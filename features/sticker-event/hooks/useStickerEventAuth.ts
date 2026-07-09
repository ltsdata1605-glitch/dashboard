import { useState, useCallback } from 'react';
import { User } from 'firebase/auth';
import { StickerEventUserData } from '../types';

export function useStickerEventAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<StickerEventUserData | null>(null);
  const [isInitializing, setIsInitializing] = useState<boolean>(true);

  const handleLoginSuccess = useCallback((u: User, data: StickerEventUserData) => {
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
