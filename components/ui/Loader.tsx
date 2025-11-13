import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loader: React.FC<{ text?: string; className?: string }> = ({ text = 'جار التحميل...', className = '' }) => (
  <div className={`flex flex-col items-center justify-center text-gray-400 h-full ${className}`}>
    <Loader2 className="animate-spin text-primary" size={48} />
    {text && <p className="mt-4 text-lg font-medium">{text}</p>}
  </div>
);
