import React from 'react';
import brandLogo from '../assets/brand_logo.png';

export const InteractiveBackground: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    return (
        <div className="relative min-h-screen w-full overflow-x-hidden bg-slate-50 dark:bg-slate-950">
            {/* Optimized Static Mesh Background (Hardware Accelerated) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute top-0 left-[-10%] w-[70%] h-[70%] rounded-full opacity-30 bg-radial from-brand-teal via-transparent to-transparent blur-[120px]" />
                <div className="absolute bottom-0 right-[-10%] w-[60%] h-[60%] rounded-full opacity-30 bg-radial from-brand-blue via-transparent to-transparent blur-[120px]" />
                <div className="absolute top-[30%] left-[50%] w-[50%] h-[50%] rounded-full opacity-20 bg-radial from-brand-rose via-transparent to-transparent blur-[100px]" />
            </div>

            {/* Subdued Brand Logo Watermark */}
            <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-0 opacity-[0.03] dark:opacity-[0.02]">
                <img src={brandLogo} alt="" className="w-[800px] h-[800px] object-contain grayscale" />
            </div>

            {/* Static Gradient Overlay (Flicker-Free) */}
            <div className="fixed inset-0 pointer-events-none z-[1] opacity-40 bg-[radial-gradient(circle_at_20%_20%,_rgba(14,165,233,0.1),_transparent_80%)]" />

            {/* Main Content */}
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
