
import React from 'react';
import { useAuth } from '../hooks/useAuth';
// FIX: Use react-router-dom v6 import (useNavigate)
import { useNavigate } from 'react-router-dom';

const PendingApprovalPage: React.FC = () => {
    const { user, logout } = useAuth();
    // FIX: Use useNavigate instead of useHistory
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        // FIX: Use navigate instead of history.push
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full text-center space-y-6">
                 <div>
                    <h1 className="text-4xl font-bold text-primary">
                        Pine Stays
                    </h1>
                </div>
                <div className="bg-card rounded-xl shadow-lg p-8 space-y-4 border border-border">
                    <h2 className="text-2xl font-semibold text-foreground">Approval Pending</h2>
                    <p className="text-muted-foreground">
                        Thank you for signing up, <span className="font-semibold text-foreground">{user?.name}</span>! Your account is currently awaiting approval from an administrator.
                    </p>
                    <p className="text-muted-foreground">
                        You will be able to access the calendar portal once your account has been approved.
                    </p>
                     <button
                        onClick={handleLogout}
                        className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-secondary-foreground bg-secondary hover:bg-secondary/80 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ring"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;