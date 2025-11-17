

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const UnauthorizedPage: React.FC = () => {
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                <div>
                    <h1 className="text-5xl font-bold text-foreground">
                        Pine Stays
                    </h1>
                </div>
                <div className="glass-ui rounded-2xl shadow-2xl p-8 sm:p-10 space-y-6">
                    <h2 className="text-2xl font-semibold text-destructive">Unauthorized Access</h2>
                    <p className="text-muted-foreground">
                        Sorry, your account does not have permission to access this portal.
                    </p>
                    <p className="text-muted-foreground text-sm">
                        If you believe this is an error, please contact an administrator.
                    </p>
                     <button
                        onClick={handleLogout}
                        className="w-full mt-4 flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UnauthorizedPage;