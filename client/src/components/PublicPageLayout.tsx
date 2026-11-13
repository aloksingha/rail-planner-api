import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import brandLogo from '../assets/brand_logo.webp';
import { LogIn, ArrowLeft, ShieldCheck } from 'lucide-react';

interface PublicPageLayoutProps {
  children: React.ReactNode;
}

const navLinks = [
  { label: 'About Us', path: '/about' },
  { label: 'Pricing', path: '/pricing' },
  { label: 'Contact', path: '/contact' },
  { label: 'Terms', path: '/terms' },
  { label: 'Privacy', path: '/privacy' },
  { label: 'Refund Policy', path: '/refund-policy' },
  { label: 'Travel Guide', path: '/travel-guide' },
];

export default function PublicPageLayout({ children }: PublicPageLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-brand-blue selection:text-white">
      {/* Sticky Top Header */}
      <header className="sticky top-0 z-50 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Brand */}
          <Link to="/" className="flex items-center gap-3 group">
            <img 
              src={brandLogo} 
              alt="Tickets Pro Logo" 
              className="w-8 h-8 rounded-xl object-contain shadow-md group-hover:scale-105 transition-transform" 
            />
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tight text-white flex items-center gap-1.5 leading-none">
                Tickets Pro
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
              </span>
              <span className="text-[8px] font-bold text-slate-400 tracking-widest uppercase mt-0.5">IR-Intelligence</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-brand-blue/15 text-brand-blue border border-brand-blue/30 shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          {/* Login Action Button */}
          <div className="flex items-center gap-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-blue to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-brand-blue/20 transition-all hover:scale-105 active:scale-95"
            >
              <LogIn size={14} />
              <span>Sign In</span>
            </Link>
          </div>
        </div>

        {/* Mobile Horizontal Subnav */}
        <div className="md:hidden overflow-x-auto custom-scrollbar border-t border-slate-900 px-3 py-2 flex items-center gap-1.5 text-[10px]">
          <Link to="/" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 font-bold uppercase shrink-0">
            <ArrowLeft size={10} /> Back
          </Link>
          {navLinks.map((link) => (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-lg font-bold uppercase tracking-wider whitespace-nowrap shrink-0 transition-all ${
                  isActive
                    ? 'bg-brand-blue text-white shadow-sm'
                    : 'text-slate-400 hover:text-white bg-slate-900/40'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 animate-in fade-in duration-300">
        {children}
      </main>

      {/* Public Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path} className="hover:text-brand-blue transition-colors">
                {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest font-bold">
            <ShieldCheck size={12} className="text-brand-teal" />
            <span>IATA Accredited Facilitation Platform • 256-Bit SSL Encrypted</span>
          </div>

          <div className="text-[10px] text-slate-600 font-medium">
            © 2026 Tickets Pro. All rights reserved. Indian Railways, IRCTC, and related trademarks belong to their respective authorities.
          </div>
        </div>
      </footer>
    </div>
  );
}
