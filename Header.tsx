import React, { useState, useEffect } from 'react';
import { useTheme } from './Theme';
import { useAuth } from './hooks/useAuth';

// --- ICONS ---
const SunIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.95-4.243l-1.591 1.591M5.25 12H3m4.243-4.95l-1.591-1.591M12 9a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
);
const MoonIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.833 0 5.404-1.225 7.252-3.248z" />
    </svg>
);
const ComputerDesktopIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-1.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25A2.25 2.25 0 015.25 3h13.5A2.25 2.25 0 0121 5.25z" />
    </svg>
);
const Bars3Icon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </svg>
);
const XMarkIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);

// --- THEME TOGGLE ---
export const ThemeToggle: React.FC = () => {
    const { theme, setTheme } = useTheme();
    
    return (
        <div className="flex items-center p-1 bg-secondary rounded-lg">
            <button onClick={() => setTheme('light')} className={`p-1.5 rounded-md transition-colors ${theme === 'light' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`} aria-label="Light mode">
                <SunIcon className="w-5 h-5" />
            </button>
            <button onClick={() => setTheme('dark')} className={`p-1.5 rounded-md transition-colors ${theme === 'dark' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`} aria-label="Dark mode">
                <MoonIcon className="w-5 h-5" />
            </button>
             <button onClick={() => setTheme('system')} className={`p-1.5 rounded-md transition-colors ${theme === 'system' ? 'bg-card text-primary shadow' : 'text-muted-foreground hover:text-foreground'}`} aria-label="System mode">
                <ComputerDesktopIcon className="w-5 h-5" />
            </button>
        </div>
    );
};


// --- HEADER ---
interface NavItem {
  id: string;
  label: string;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
  onClick?: () => void;
  href?: string;
  isActive?: boolean;
}

interface HeaderProps {
    title: string;
    subtitle: string;
    navItems?: NavItem[];
    children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = ({ title, subtitle, navItems = [], children }) => {
    const { logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const NavLink: React.FC<{ item: NavItem, isMobile?: boolean }> = ({ item, isMobile = false }) => {
        const classes = `flex items-center gap-x-3 px-3 py-2.5 rounded-lg font-semibold transition-colors ${
            item.isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
        } ${isMobile ? 'text-lg w-full' : 'text-sm'}`;

        const content = (
            <>
                {item.icon && <item.icon className="w-6 h-6" />}
                <span>{item.label}</span>
            </>
        );

        const handleClick = () => {
            if (item.onClick) item.onClick();
            if (isMobile) setIsMenuOpen(false);
        };

        if (item.href) {
            return <a href={item.href} className={classes} onClick={handleClick}>{content}</a>;
        }
        return <button onClick={handleClick} className={classes}>{content}</button>;
    };

    return (
        <>
            <header className="bg-card/80 backdrop-blur-lg sticky top-0 z-30 border-b border-border">
                <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-x-2">
                            {navItems.length > 0 && (
                                <div className="md:hidden">
                                    <button onClick={() => setIsMenuOpen(true)} className="p-2.5 -m-2.5 rounded-lg text-muted-foreground hover:bg-muted">
                                        <Bars3Icon className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                            <div>
                                <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-tight">{title}</h1>
                                <p className="text-xs sm:text-sm text-muted-foreground">{subtitle}</p>
                            </div>
                        </div>

                        <nav className="hidden md:flex items-center gap-x-1">
                            {navItems.map(item => <NavLink key={item.id} item={item} />)}
                        </nav>

                        <div className="flex items-center gap-x-2 sm:gap-x-3">
                            <div className="hidden sm:flex items-center gap-x-2 sm:gap-x-4">{children}</div>
                            <ThemeToggle />
                            <button onClick={logout} className="px-3 py-2 bg-destructive/10 text-destructive text-sm font-semibold rounded-lg hover:bg-destructive/20 transition-colors">
                               Logout
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Mobile Drawer */}
            <div 
                className={`fixed inset-0 z-40 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMenuOpen(false)}
            >
                <div className="absolute inset-0 bg-black/50" />
            </div>
            <div className={`fixed inset-y-0 left-0 w-4/5 max-w-sm bg-card z-50 p-6 flex flex-col transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                 <div className="flex justify-between items-center mb-8">
                     <h2 className="text-2xl font-bold text-primary">Pine Stays</h2>
                     <button onClick={() => setIsMenuOpen(false)} className="p-2 -m-2 rounded-full text-muted-foreground hover:bg-muted">
                       <XMarkIcon className="w-7 h-7" />
                     </button>
                </div>
                
                <nav className="flex-grow space-y-2">
                    {navItems.map(item => <NavLink key={item.id} item={item} isMobile />)}
                </nav>
                
                <div className="pt-6 border-t border-border">
                    <div className="flex flex-col gap-4 items-center">{children}</div>
                </div>
            </div>
        </>
    );
};
