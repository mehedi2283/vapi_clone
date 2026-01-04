import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClosed?: () => void;
  children: React.ReactNode;
  className?: string; // Class for the inner content container (e.g. max-w-md)
  fullScreen?: boolean;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, onClosed, children, className = 'max-w-md', fullScreen = false }) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Main Effect: Handles Open/Close animations and state
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    if (isOpen) {
      setShouldRender(true);
      // Slight delay ensures the browser paints the component with opacity-0 first, 
      // allowing the CSS transition to opacity-100 to trigger visibly.
      timer = setTimeout(() => setIsVisible(true), 10);
      
      // Prevent scroll and handle layout shift
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.paddingRight = `${scrollbarWidth}px`;
      document.body.style.overflow = 'hidden';
    } else {
      setIsVisible(false);
      // Wait for animation to finish before unmounting
      // 300ms matches the duration in CSS
      timer = setTimeout(() => {
          document.body.style.paddingRight = '';
          document.body.style.overflow = '';
      }, 300);
    }

    return () => {
      clearTimeout(timer);
    };
  }, [isOpen]);

  // Safety Effect: Cleanup body styles strictly on Unmount
  useEffect(() => {
      return () => {
          document.body.style.paddingRight = '';
          document.body.style.overflow = '';
      };
  }, []);

  const handleTransitionEnd = (e: React.TransitionEvent) => {
    // Ensure we only react to the fade-out of the wrapper, not children
    if (e.target === e.currentTarget && !isOpen) {
      setShouldRender(false);
      onClosed?.();
    }
  };

  if (!shouldRender || !mounted) return null;

  const modalContent = (
    <>
        {/* Full Screen Variant */}
        {fullScreen ? (
            <div 
                className={`fixed inset-0 z-[9999] bg-vapi-bg flex flex-col p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] 
                  ${isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-95 pointer-events-none'}`}
                onTransitionEnd={handleTransitionEnd}
            >
                {children}
            </div>
        ) : (
            /* Standard Modal Variant */
            <div 
                className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    ${isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onTransitionEnd={handleTransitionEnd}
            >
                {/* Backdrop */}
                <div 
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 ease-out"
                    style={{ opacity: isVisible ? 1 : 0 }}
                    onClick={onClose}
                />
                
                {/* Content Container */}
                <div 
                    className={`relative w-full ${className} transform transition-all duration-300 cubic-bezier(0.23, 1, 0.32, 1)
                    ${isVisible ? 'scale-100 translate-y-0 opacity-100' : 'scale-95 translate-y-4 opacity-0'}`}
                    onClick={e => e.stopPropagation()}
                >
                    {children}
                </div>
            </div>
        )}
    </>
  );

  return createPortal(modalContent, document.body);
};