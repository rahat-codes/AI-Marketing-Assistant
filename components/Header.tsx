
import React, { useState, useRef, useEffect } from 'react';
import { Rocket, Bell, User, Settings, LogOut, CreditCard, Check, Menu, X as CloseIcon } from 'lucide-react';
import { AppView } from '../types';

interface HeaderProps {
  currentView: AppView;
  setView: (view: AppView) => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView }) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  // Mock Notifications State
  const [notifications, setNotifications] = useState([
    { id: 1, text: "New campaign 'Summer Sale' generated", time: "2m ago", unread: true },
    { id: 2, text: "Veo video generation completed", time: "1h ago", unread: true },
    { id: 3, text: "Welcome to Marketing Assistant!", time: "1d ago", unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const markAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, unread: false })));
  };

  // Handle clicking outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (userRef.current && !userRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Close mobile menu on view change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [currentView]);


  const navItems = [
    { label: 'Home', view: AppView.HOME },
    { label: 'Campaign', view: AppView.CAMPAIGN_STEP_1, activeMatch: [AppView.CAMPAIGN_STEP_1, AppView.CAMPAIGN_STEP_2, AppView.CAMPAIGN_STEP_3] },
    { label: 'Studio', view: AppView.STUDIO },
    { label: 'History', view: AppView.HISTORY },
    { label: 'Settings', view: AppView.SETTINGS },
    { label: 'Help', view: AppView.HELP },
  ];

  const DesktopNav = () => (
    <nav className="hidden md:flex items-center gap-1.5">
      {navItems.map((item) => {
        const isActive = item.view === currentView || (item.activeMatch && item.activeMatch.includes(currentView));
        return (
          <button
            key={item.label}
            onClick={() => setView(item.view)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold tracking-tight transition-all duration-350 relative active:scale-95 ${
              isActive 
                ? 'text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 border border-blue-500/10 shadow-sm' 
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white border border-transparent'
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );

  const MobileNav = () => (
    <div className={`fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-md md:hidden transition-all duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
      <div className={`fixed top-0 right-0 h-full w-72 bg-white dark:bg-[#0F172A] border-l border-slate-200/50 dark:border-slate-800/55 shadow-2xl p-6 transition-transform duration-300 flex flex-col justify-between ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
         <div className="flex flex-col gap-6 pt-16">
            <div className="flex items-center gap-2.5 px-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                <svg className="w-4.5 h-4.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">AIMA Suite</span>
            </div>
            
            <nav className="flex flex-col gap-1.5">
              {navItems.map((item) => {
                const isActive = item.view === currentView || (item.activeMatch && item.activeMatch.includes(currentView));
                return (
                  <button
                    key={item.label}
                    onClick={() => setView(item.view)}
                    className={`px-4 py-3 rounded-xl text-left text-sm font-semibold transition-all duration-300 flex items-center justify-between ${
                      isActive 
                        ? 'bg-blue-50/70 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-500/10' 
                        : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400" />}
                  </button>
                );
              })}
            </nav>
         </div>
         <div className="border-t border-slate-100 dark:border-slate-800/50 pt-4 text-center">
           <p className="text-xs text-slate-400 dark:text-slate-500 font-medium font-mono">Enterprise v1.2</p>
         </div>
      </div>
    </div>
  );


  return (
    <>
    <header 
      className="sticky top-0 left-0 right-0 z-30 bg-white/80 dark:bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800/50 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-2.5 cursor-pointer group"
          onClick={() => setView(AppView.HOME)}
        >
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-600 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/15 group-hover:scale-105 transition-all duration-300">
            <svg className="w-5.5 h-5.5 text-white" stroke="currentColor" fill="none" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth="2.5" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight leading-none">AIMA</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider mt-1">Marketing Suite</span>
          </div>
        </div>

        <DesktopNav />

        <div className="flex items-center gap-3">
          
          {/* Notification Dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition relative active:scale-95"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full border border-white dark:border-slate-950 animate-pulse"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-850 overflow-hidden animate-pop-in origin-top-right ring-1 ring-black/5 z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/25">
                  <h3 className="font-semibold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">Active Alerts</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-bold flex items-center gap-1">
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 dark:text-slate-550 text-sm">All caught up! No notifications.</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-slate-50 dark:border-slate-800/40 hover:bg-slate-50/40 dark:hover:bg-slate-800/30 transition-colors ${n.unread ? 'bg-blue-50/30 dark:bg-blue-950/15' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-xs text-slate-700 dark:text-slate-200 leading-relaxed ${n.unread ? 'font-bold' : 'font-medium'}`}>{n.text}</p>
                          {n.unread && <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-1.5 shrink-0"></span>}
                        </div>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1.5">{n.time}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/25 text-center">
                  <button className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white font-semibold transition">View Strategy Logs</button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userRef}>
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="w-10 h-10 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800/85 transition-all border border-slate-200/50 dark:border-slate-800/50 active:scale-95 shadow-sm"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-3 w-64 bg-white dark:bg-[#0F172A] rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-850 overflow-hidden animate-pop-in origin-top-right ring-1 ring-black/5 z-50">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/25">
                  <p className="font-extrabold text-slate-900 dark:text-white text-sm">Business Admin</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-1">admin@localbusiness.com</p>
                </div>
                <div className="p-2">
                  <button className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors group">
                    <User size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                    Profile Accounts
                  </button>
                  <button 
                    onClick={() => { setView(AppView.SETTINGS); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors group"
                  >
                    <Settings size={15} className="text-slate-400 group-hover:text-blue-500 transition-colors" /> 
                    Preferences Space
                  </button>
                  <button className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 flex items-center gap-3 transition-colors group">
                    <CreditCard size={15} className="text-slate-400 group-hover:text-cyan-500 transition-colors" /> 
                    Billing System
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800/70 my-1.5 mx-1"></div>
                  <button className="w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold text-red-650 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-3 transition-colors">
                    <LogOut size={15} /> 
                    Logout System
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition">
              {isMobileMenuOpen ? <CloseIcon size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </div>
    </header>
    <MobileNav />
    </>
  );
};
