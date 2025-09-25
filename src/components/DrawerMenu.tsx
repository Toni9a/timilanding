'use client';

import Link from 'next/link';

interface DrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DrawerMenu({ isOpen, onClose }: DrawerMenuProps) {
  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black bg-opacity-50 z-60 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-70 transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="p-6">
          {/* Close button */}
          <div className="flex justify-end mb-8">
            <button
              onClick={onClose}
              className="text-2xl text-gray-600 hover:text-gray-800 transition-colors"
            >
              ×
            </button>
          </div>
          
          {/* Menu items */}
          <nav className="space-y-6">
            <Link 
              href="/gallery"
              className="block text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors"
              onClick={onClose}
            >
              Gallery
            </Link>
            
            <Link 
              href="/explore"
              className="block text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors"
              onClick={onClose}
            >
              Explore Music
            </Link>
            
            <Link 
              href="/sheetify"
              className="block text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors"
              onClick={onClose}
            >
              Sheetify
            </Link>
            
            <Link 
              href="/live"
              className="block text-lg font-medium text-gray-800 hover:text-gray-600 transition-colors"
              onClick={onClose}
            >
              Live Requests
            </Link>
          </nav>
        </div>
      </div>
    </>
  );
}