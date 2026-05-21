
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
    <nav className="hidden md:flex items-center gap-1">
      {navItems.map((item) => {
        const isActive = item.view === currentView || (item.activeMatch && item.activeMatch.includes(currentView));
        return (
          <button
            key={item.label}
            onClick={() => setView(item.view)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 relative active:scale-95 ${
              isActive 
                ? 'text-gray-900 dark:text-white' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            {item.label}
            {isActive && (
              <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-600 dark:bg-blue-400 rounded-full" />
            )}
          </button>
        );
      })}
    </nav>
  );

  const MobileNav = () => (
    <div className={`fixed inset-0 z-40 bg-black/20 backdrop-blur-sm md:hidden ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMobileMenuOpen(false)}>
      <div className={`fixed top-0 right-0 h-full w-64 bg-white dark:bg-gray-800 shadow-2xl p-6 transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
         <nav className="flex flex-col gap-2 pt-16">
           {navItems.map((item) => {
             const isActive = item.view === currentView || (item.activeMatch && item.activeMatch.includes(currentView));
             return (
               <button
                 key={item.label}
                 onClick={() => setView(item.view)}
                 className={`px-4 py-3 rounded-lg text-left text-base font-medium transition-all duration-200 ${
                   isActive 
                     ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' 
                     : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                 }`}
               >
                 {item.label}
               </button>
             );
           })}
         </nav>
      </div>
    </div>
  );


  return (
    <>
    <header 
      className="sticky top-0 left-0 right-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 shadow-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div 
          className="flex items-center gap-3 cursor-pointer group"
          onClick={() => setView(AppView.HOME)}
        >
          <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
            <Rocket size={18} />
          </div>
          <h1 className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">Marketing Assistant</h1>
        </div>

        <DesktopNav />

        <div className="flex items-center gap-3">
          
          {/* Notification Dropdown */}
          <div className="relative" ref={notifRef}>
            <button 
              onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
              className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition relative active:scale-95"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-900"></span>
              )}
            </button>
            
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pop-in origin-top-right ring-1 ring-black/5">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                  <h3 className="font-semibold text-gray-900 dark:text-white">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1">
                      <Check size={12} /> Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">No notifications</div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`p-4 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${n.unread ? 'bg-blue-50/40 dark:bg-blue-900/10' : ''}`}>
                        <div className="flex justify-between items-start gap-2">
                          <p className={`text-sm text-gray-800 dark:text-gray-200 leading-snug ${n.unread ? 'font-semibold' : ''}`}>{n.text}</p>
                          {n.unread && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1 shrink-0"></span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">{n.time}</p>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-center">
                  <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition font-medium">View All Activity</button>
                </div>
              </div>
            )}
          </div>

          {/* User Menu Dropdown */}
          <div className="relative" ref={userRef}>
            <button 
              onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
              className="w-9 h-9 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full flex items-center justify-center hover:bg-orange-200 dark:hover:bg-orange-900/50 transition border border-orange-200 dark:border-orange-800 active:scale-95"
            >
              <User size={18} />
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden animate-pop-in origin-top-right ring-1 ring-black/5">
                <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                  <p className="font-bold text-gray-900 dark:text-white text-sm">Business Admin</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">admin@localbusiness.com</p>
                </div>
                <div className="p-1.5">
                  <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-3 transition-colors group">
                    <User size={16} className="text-gray-400 group-hover:text-orange-500 transition-colors" /> 
                    Profile
                  </button>
                  <button 
                    onClick={() => { setView(AppView.SETTINGS); setShowUserMenu(false); }}
                    className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-3 transition-colors group"
                  >
                    <Settings size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors" /> 
                    Settings
                  </button>
                  <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/70 flex items-center gap-3 transition-colors group">
                    <CreditCard size={16} className="text-gray-400 group-hover:text-green-500 transition-colors" /> 
                    Billing
                  </button>
                  <div className="h-px bg-gray-100 dark:bg-gray-700 my-1 mx-1"></div>
                  <button className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors">
                    <LogOut size={16} /> 
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
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
