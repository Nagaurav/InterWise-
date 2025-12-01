'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

const PageTransition = ({ children }: { children: React.ReactNode }) => {
  const [isLoading, setIsLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleStart = () => {
      setIsLoading(true);
    };
    
    const handleComplete = () => {
      setTimeout(() => setIsLoading(false), 300);
    };

    // Add event listeners for route changes
    window.addEventListener('routeChangeStart', handleStart);
    window.addEventListener('routeChangeComplete', handleComplete);
    window.addEventListener('routeChangeError', handleComplete);

    // Initial load
    handleComplete();

    return () => {
      window.removeEventListener('routeChangeStart', handleStart);
      window.removeEventListener('routeChangeComplete', handleComplete);
      window.removeEventListener('routeChangeError', handleComplete);
    };
  }, [pathname]);

  return (
    <div className={`page-transition ${isLoading ? 'opacity-0' : 'animate-fade-in'}`}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="three-body">
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
            <div className="three-body__dot"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PageTransition;
