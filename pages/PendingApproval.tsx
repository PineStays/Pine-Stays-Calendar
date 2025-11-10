import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const PendingApprovalPage: React.FC = () => {
    // FIX: Property 'user' does not exist on type 'AuthContextType'.
    const { logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="max-w-md w-full text-center space-y-6">
                 <div>
                    <h1 className="text-4xl font-bold text-slate-800">
                        Pine Stays
                    </h1>
                </div>
                <div className="bg-white rounded-xl shadow-lg p-8 space-y-4">
                    <h2 className="text-2xl font-semibold text-slate-800">Approval Pending</h2>
                    <p className="text-slate-600">
                        {/* FIX: Removed reference to user.name as it's not available in the auth context. */}
                        Thank you for signing up! Your account is currently awaiting approval from an administrator.
                    </p>
                    <p className="text-slate-600">
                        You will be able to access the calendar portal once your account has been approved.
                    </p>
                     <button
                        onClick={handleLogout}
                        className="w-full mt-4 flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-slate-600 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
                    >
                        Logout
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PendingApprovalPage;