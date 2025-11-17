

import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const PendingApprovalPage: React.FC = () => {
    const { user, logout } = useAuth();
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
                    <h2 className="text-2xl font-semibold text-foreground">Approval Pending</h2>
                    <p className="text-muted-foreground">
                        Thank you for signing up, <span className="font-semibold text-foreground">{user?.name}</span>! Your account is currently awaiting approval from an administrator.
                    </p>
                    <p className="text-muted-foreground">
                        You will be able to access the calendar portal once your account has been approved.
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

export default PendingApprovalPage;