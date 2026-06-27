import { useState, useEffect } from 'react';

export const useAdmin = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
   const ADMIN_ID = [8335140994, 5694828046]; // ВАШ ID
      if (ADMIN_ID.includes(window.Telegram?.WebApp?.initDataUnsafe?.user?.id)) setIsAdmin(true);
  }, []);
 return isAdmin;
};