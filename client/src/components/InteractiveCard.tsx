import React from 'react';

interface InteractiveCardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export const InteractiveCard: React.FC<InteractiveCardProps> = ({ children, className = '', onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
                relative group cursor-pointer overflow-hidden rounded-3xl transition-all duration-300
                ${className.includes('bg-') ? '' : 'bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-white/5 shadow-xl dark:shadow-none'} 
                ${className}
                hover:shadow-2xl hover:border-brand-blue/30 active:scale-[0.98]
            `}
        >
            {/* Opaque Static Glow (Hardware Accelerated) */}
            <div className="absolute inset-0 z-0 bg-radial from-brand-blue/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
};
