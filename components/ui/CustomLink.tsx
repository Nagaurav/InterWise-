'use client';

import { useRouter } from 'next/navigation';
import { handleRouteChange, handleRouteComplete } from '@/utils/routeTransition';

interface CustomLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function CustomLink({ href, children, className, onClick }: CustomLinkProps) {
  const router = useRouter();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleRouteChange();
    
    // Simulate navigation delay for smooth transition
    setTimeout(() => {
      router.push(href);
      handleRouteComplete();
    }, 100);
    
    if (onClick) {
      onClick();
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
}
