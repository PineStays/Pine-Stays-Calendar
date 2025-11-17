



import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Property, CalendarEntry, CalendarStatus, Amenity, User, UserRole, UserStatus } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { INITIAL_AMENITIES, LOCATIONS, PROPERTY_TYPES, STATUS_COLORS, STATUSES } from '../constants';
import { Header } from '../Header';
import { SparklesIcon, CalendarIcon, BuildingLibraryIcon, UsersIcon, XMarkIcon } from '../Icons';

const formatDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};
const getDatesInRange = (startDate: Date, days: number) => {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
    });
};
const baseInputClass = "w-full border border-input rounded-xl shadow-sm px-4 py-3 text-base bg-input/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted";
const baseButtonClass = "px-6 py-3 rounded-xl font-semibold text-base shadow-sm transition-colors disabled:opacity-50";

// --- SELECTION EDITOR ---
interface SelectionEditorProps {
    selectedCellCount: number;
    onApply: (action: any) => Promise<void>;
    onClear: () => void;
    activeNote: { propertyName: string; date: string; content: string } | null;
}
const SelectionEditor: React.FC<SelectionEditorProps> = ({ selectedCellCount, onApply, onClear, activeNote }) => {
    const [action, setAction] = useState<'setStatus' | 'setPrice' | 'adjustPrice' | 'setWeekendPrice' | 'setWeekdayPrice'>('setStatus');
    const [status, setStatus] = useState<CalendarStatus>('available');
    const [price, setPrice] = useState(0);
    const [percentage, setPercentage] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleApply = async () => {
        let updateAction: any;
        if (action === 'setStatus') updateAction = { type: 'setStatus', status };
        if (action === 'setPrice') updateAction = { type: 'setPrice', price: Number(price) };
        if (action === 'setWeekendPrice') updateAction = { type: 'setWeekendPrice', price: Number(price) };
        if (action === 'setWeekdayPrice') updateAction = { type: 'setWeekdayPrice', price: Number(price) };
        if (action === 'adjustPrice') updateAction = { type: 'adjustPrice', percentage };
        
        setLoading(true);
        await onApply(updateAction);
        setLoading(false);
    };

    if (selectedCellCount === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-4xl sm:p-0">
            <div className="glass-ui rounded-xl shadow-2xl p-4 space-y-3 animate-fade-in">
                {activeNote && (
                    <div className="border-b border-border/50 pb-3 mb-3">
                        <h3 className="font-bold text-foreground">Note for {activeNote.propertyName}</h3>
                        <p className="text-sm font-semibold text-muted-foreground">{new Date(activeNote.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <p className="text-sm bg-muted/50 p-3 rounded-lg mt-1">{activeNote.content}</p>
                    </div>
                )}
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-foreground">{selectedCellCount} Date{selectedCellCount > 1 ? 's' : ''} Selected</h3>
                    <button onClick={onClear} className="text-sm font-semibold text-primary hover:text-primary/90">Clear</button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <select value={action} onChange={e => setAction(e.target.value as any)} className={`${baseInputClass} flex-grow py-3`}>
                        <option value="setStatus">Set Status</option>
                        <option value="setPrice">Set Price (All)</option>
                        <option value="setWeekendPrice">Set Weekend Price (Sat/Sun)</option>
                        <option value="setWeekdayPrice">Set Weekday Price (Mon-Fri)</option>
                        <option value="adjustPrice">Adjust Price by %</option>
                    </select>
                    {action === 'setStatus' && (
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className={`${baseInputClass} flex-grow py-3`}>
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s === 'owner' ? 'Booked O' : s}</option>)}
                        </select>
                    )}
                    {['setPrice', 'setWeekendPrice', 'setWeekdayPrice'].includes(action) && (
                        <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="e.g. 25000" className={`${baseInputClass} flex-grow`} />
                    )}
                    {action === 'adjustPrice' && (
                        <input type="number" value={percentage} onChange={e => setPercentage(Number(e.target.value))} placeholder="e.g. 20 for +20%" className={`${baseInputClass} flex-grow`} />
                    )}
                    <button onClick={handleApply} disabled={loading} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 w-full sm:w-auto text-sm`}>
                        {loading ? 'Applying...' : 'Apply Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- CALENDAR CELL (MEMOIZED) ---
const MemoizedCalendarCell = React.memo<{
    prop: Property;
    date: Date;
    calendarData: Map<string, CalendarEntry>;
    isSelected: boolean;
    onCellSelect: (propertyId: string, date: string) => void;
}>(({ prop, date, calendarData, isSelected, onCellSelect }) => {
    const dateStr = formatDate(date);
    const entry = calendarData.get(`${prop.id}-${dateStr}`);
    const status = entry?.status || 'available';
    const price = entry?.price ?? prop.basePrice;
    const statusText = status === 'owner' ? 'Booked O' : status;

    return (
        <td
            className={`border border-border/30 text-center cursor-pointer transition-all relative ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text} ${isSelected ? 'ring-2 ring-primary ring-offset-background ring-offset-2 z-10 bg-primary/20' : 'hover:shadow-md'}`}
            onClick={() => onCellSelect(prop.id, dateStr)}
        >
            <div className="p-1.5 font-medium text-sm">
                {price > 0 ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : <span className="capitalize text-xs">{statusText}</span>}
            </div>
            {entry?.notes && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full"></span>}
        </td>
    );
});


// --- CALENDAR MANAGEMENT ---
interface CalendarManagementProps {
    properties: Property[];
    refreshAllData: () => void;
}
const CalendarManagement: React.FC<CalendarManagementProps> = ({ properties, refreshAllData }) => {
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCells, setSelectedCells] = useState<{ propertyId: string; date: string }[]>([]);
    const [activeNote, setActiveNote] = useState<{ propertyName: string; date: string; content: string } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    
    const dates = useMemo(() => {
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return getDatesInRange(startDate, daysInMonth);
    }, [startDate]);

    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        if (dates.length === 0) {
            setLoading(false);
            return;
        }
        const start = formatDate(dates[0]);
        const end = formatDate(dates[dates.length - 1]);
        const entries = await db.getCalendarEntries(start, end);
        setCalendarEntries(entries);
        setLoading(false);
    }, [dates]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);
    
    const activeProperties = useMemo(() => {
      return properties
        .filter(p => p.status === 'active')
        .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [properties, searchTerm]);

    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);

    const handleCellSelect = useCallback((propertyId: string, date: string) => {
        const key = `${propertyId}-${date}`;
        const index = selectedCells.findIndex(c => `${c.propertyId}-${c.date}` === key);
        let newSelectedCells;

        if (index > -1) {
            newSelectedCells = [...selectedCells.slice(0, index), ...selectedCells.slice(index + 1)];
        } else {
            newSelectedCells = [...selectedCells, { propertyId, date }];
        }
        
        setSelectedCells(newSelectedCells);

        if (newSelectedCells.length === 1) {
            const singleSelection = newSelectedCells[0];
            const entry = calendarData.get(`${singleSelection.propertyId}-${singleSelection.date}`);
            const prop = activeProperties.find(p => p.id === singleSelection.propertyId);
            if (entry?.notes && prop) {
                setActiveNote({
                    propertyName: prop.name,
                    date: singleSelection.date,
                    content: entry.notes
                });
            } else {
                setActiveNote(null);
            }
        } else {
            setActiveNote(null);
        }
    }, [selectedCells, calendarData, activeProperties]);
    
    const handleBulkUpdate = async (action: any) => {
        if (selectedCells.length === 0) return;
        await db.bulkUpdateCells(selectedCells, action);
        setSelectedCells([]);
        setActiveNote(null);
        fetchCalendarData();
    };

    return (
        <div className="space-y-8">
            <div className="glass-ui p-4 sm:p-6 rounded-2xl shadow-2xl">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                     <div className="flex-grow">
                        <h2 className="text-2xl font-bold text-foreground">Availability Calendar</h2>
                     </div>
                     <div className="w-full sm:w-auto sm:max-w-xs">
                        <input
                            type="text"
                            placeholder="Search property..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={baseInputClass}
                        />
                     </div>
                      <div className="flex items-center space-x-1 self-end sm:self-center">
                        <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-3 rounded-md hover:bg-muted text-muted-foreground">&lt;</button>
                        <span className="font-semibold text-foreground text-lg w-40 text-center">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                        <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-3 rounded-md hover:bg-muted text-muted-foreground">&gt;</button>
                     </div>
                </div>
                <div className="overflow-x-auto relative custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-muted/50">
                                <th className="sticky left-0 glass-ui p-3 border-b border-border/50 w-32 min-w-[128px] sm:w-40 sm:min-w-[160px] text-left text-sm font-semibold text-foreground z-20">Property</th>
                                {dates.map(date => (
                                    <th key={date.toISOString()} className="p-2 border-b border-border/50 text-center text-xs font-semibold text-muted-foreground bg-muted/30">
                                        <div className="min-w-[70px]">
                                          <div className={`${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary font-bold' : ''}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                          <div className="mt-1">{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {activeProperties.map(prop => (
                                <tr key={prop.id} className="hover:bg-muted/50">
                                    <td className="sticky left-0 bg-card/60 hover:bg-muted/50 z-10 p-2.5 border-b border-r border-border/30 font-semibold text-foreground w-32 min-w-[128px] sm:w-40 sm:min-w-[160px]">{prop.name}</td>
                                    {dates.map(date => {
                                        const dateStr = formatDate(date);
                                        const isSelected = selectedCells.some(c => c.propertyId === prop.id && c.date === dateStr);
                                        return (
                                            <MemoizedCalendarCell
                                                key={`${prop.id}-${dateStr}`}
                                                prop={prop}
                                                date={date}
                                                calendarData={calendarData}
                                                isSelected={isSelected}
                                                onCellSelect={handleCellSelect}
                                            />
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {loading && <div className="absolute inset-0 bg-card/70 flex items-center justify-center rounded-2xl"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}
                </div>
            </div>
            <SelectionEditor
                selectedCellCount={selectedCells.length}
                onApply={handleBulkUpdate}
                onClear={() => {
                    setSelectedCells([]);
                    setActiveNote(null);
                }}
                activeNote={activeNote}
            />
        </div>
    );
};

// --- PROPERTY MANAGEMENT ---
interface PropertyManagementProps {
    properties: Property[];
    users: User[];
    allAmenities: Amenity[];
    refreshAllData: () => void;
    refreshSubData: () => void;
}
const PropertyManagement: React.FC<PropertyManagementProps> = ({ properties, users, allAmenities, refreshAllData, refreshSubData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
    const [icalProperty, setIcalProperty] = useState<Property | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [properties, searchTerm]);

    const handleSave = () => {
        setIsModalOpen(false);
        refreshAllData();
    };
    
    const handleIcalImport = async (propertyId: string) => {
        await db.mockIcalImport(propertyId);
        setIsIcalModalOpen(false);
        alert('iCal calendar synced successfully! The calendar view has been updated.');
        refreshAllData();
    };
    
    const handleConfirmDelete = async () => {
        if (!propertyToDelete) return;
        setIsDeleting(true);
        try {
            await db.deletePropertyAndEntries(propertyToDelete.id);
            setIsDeleteModalOpen(false);
            setPropertyToDelete(null);
            refreshAllData();
        } catch (error) {
            console.error("Failed to delete property:", error);
            alert("An error occurred while deleting the property and its calendar entries.");
            setIsDeleteModalOpen(false);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="glass-ui p-4 sm:p-6 rounded-2xl shadow-2xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-foreground">Manage Properties</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <input type="text" placeholder="Search properties..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${baseInputClass} w-full sm:w-auto`} />
                    <button onClick={() => { setEditingProperty(null); setIsModalOpen(true); }} className={`flex-shrink-0 ${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>Add New Property</button>
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-muted-foreground">
                    <thead className="text-xs text-foreground uppercase bg-muted/50">
                        <tr>
                            <th scope="col" className="px-6 py-4">Name</th>
                            <th scope="col" className="px-6 py-4 hidden md:table-cell">Location</th>
                            <th scope="col" className="px-6 py-4 hidden lg:table-cell">Owner</th>
                            <th scope="col" className="px-6 py-4">Status</th>
                            <th scope="col" className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProperties.map(prop => {
                            const owner = users.find(u => u.id === prop.ownerId);
                            return (
                                <tr key={prop.id} className="bg-card/50 border-b border-border/50 hover:bg-muted/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{prop.name}</th>
                                    <td className="px-6 py-4 hidden md:table-cell">{prop.location}</td>
                                    <td className="px-6 py-4 hidden lg:table-cell">{owner?.name || 'Unassigned'}</td>
                                    <td className="px-6 py-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${prop.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {prop.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 flex space-x-2 sm:space-x-4 justify-end">
                                        <button onClick={() => { setIcalProperty(prop); setIsIcalModalOpen(true); }} className="font-semibold text-primary/90 hover:underline text-xs sm:text-sm">iCal Sync</button>
                                        <button onClick={() => { setEditingProperty(prop); setIsModalOpen(true); }} className="font-semibold text-primary/90 hover:underline text-xs sm:text-sm">Edit</button>
                                        <button onClick={() => { setPropertyToDelete(prop); setIsDeleteModalOpen(true); }} className="font-semibold text-destructive/90 hover:underline text-xs sm:text-sm">Delete</button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
             {isModalOpen && <PropertyFormModal property={editingProperty} owners={users.filter(u => u.role === 'owner')} allAmenities={allAmenities} onClose={() => setIsModalOpen(false)} onSave={handleSave} refreshParentData={refreshSubData} />}
             {isIcalModalOpen && icalProperty && <IcalImportModal property={icalProperty} onClose={() => setIsIcalModalOpen(false)} onImport={handleIcalImport} />}
             <DeleteConfirmationModal 
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onConfirm={handleConfirmDelete}
                title="Confirm Property Deletion"
                description={`Are you sure you want to permanently delete the property "${propertyToDelete?.name || ''}"? This action is irreversible and will also delete all associated calendar data.`}
                loading={isDeleting}
            />
        </div>
    );
};

// --- USER MANAGEMENT ---
interface UserManagementProps {
    users: User[];
    refreshUsers: () => void;
}
const UserManagement: React.FC<UserManagementProps> = ({ users, refreshUsers }) => {
    const { user: currentUser } = useAuth();
    const [isUserAddModalOpen, setIsUserAddModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [isDeleteUserModalOpen, setIsDeleteUserModalOpen] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const filteredUsers = useMemo(() => {
        return users.filter(user =>
            user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [users, searchTerm]);

    const handleSaveUser = () => {
        setIsUserAddModalOpen(false);
        setEditingUser(null);
        refreshUsers();
    };

    const handleConfirmUserDelete = async () => {
        if (!userToDelete) return;
        setIsDeletingUser(true);
        try {
            await db.deleteUser(userToDelete.id);
            setIsDeleteUserModalOpen(false);
            setUserToDelete(null);
            refreshUsers();
        } catch (error) {
            console.error("Failed to delete user:", error);
            alert("An error occurred while deleting the user.");
            setIsDeleteUserModalOpen(false);
        } finally {
            setIsDeletingUser(false);
        }
    };

    return (
        <div className="glass-ui p-4 sm:p-6 rounded-2xl shadow-2xl">
             <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-foreground">Manage Users</h2>
                 <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <input
                        type="text"
                        placeholder="Search user..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`${baseInputClass} w-full sm:w-auto`}
                    />
                    <button onClick={() => setIsUserAddModalOpen(true)} className={`flex-shrink-0 ${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>Add New User</button>
                </div>
            </div>
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-sm text-left text-muted-foreground">
                     <thead className="text-xs text-foreground uppercase bg-muted/50">
                        <tr>
                            <th scope="col" className="px-6 py-4">Name</th>
                            <th scope="col" className="px-6 py-4 hidden md:table-cell">Email</th>
                            <th scope="col" className="px-6 py-4">Role</th>
                            <th scope="col" className="px-6 py-4">Status</th>
                            <th scope="col" className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="bg-card/50 border-b border-border/50 hover:bg-muted/50">
                                <td className="px-6 py-4 font-medium text-foreground whitespace-nowrap">{user.name}</td>
                                <td className="px-6 py-4 hidden md:table-cell">{user.email}</td>
                                <td className="px-6 py-4 capitalize">{user.role}</td>
                                <td className="px-6 py-4">
                                     <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${
                                        user.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 
                                        user.status === 'pending' ? 'bg-amber-500/10 text-amber-400' : 'bg-red-500/10 text-red-400'
                                     }`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right space-x-4">
                                    <button onClick={() => setEditingUser(user)} className="font-semibold text-primary/90 hover:underline">Edit</button>
                                    <button 
                                        onClick={() => { setUserToDelete(user); setIsDeleteUserModalOpen(true); }} 
                                        className="font-semibold text-destructive/90 hover:underline disabled:text-muted-foreground/50 disabled:no-underline"
                                        disabled={currentUser?.id === user.id}
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isUserAddModalOpen && <UserFormModal onClose={() => setIsUserAddModalOpen(false)} onSave={handleSaveUser} />}
            {editingUser && <UserEditFormModal user={editingUser} onClose={() => setEditingUser(null)} onSave={handleSaveUser} />}
            <DeleteConfirmationModal
                isOpen={isDeleteUserModalOpen}
                onClose={() => setIsDeleteUserModalOpen(false)}
                onConfirm={handleConfirmUserDelete}
                title="Confirm User Deletion"
                description={`Are you sure you want to permanently delete the user "${userToDelete?.name || ''}"? This action is irreversible.`}
                loading={isDeletingUser}
            />
        </div>
    )
};

// --- MODALS ---
interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    loading: boolean;
}
const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, description, loading }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-ui rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <h2 className="text-xl font-bold text-destructive">{title}</h2>
                <p className="mt-2 text-muted-foreground whitespace-pre-wrap">{description}</p>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} disabled={loading} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                    <button onClick={onConfirm} disabled={loading} className={`${baseButtonClass} bg-destructive text-destructive-foreground hover:bg-destructive/90 text-sm`}>
                        {loading ? 'Deleting...' : 'Confirm Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
};

interface UserFormModalProps {
    onClose: () => void;
    onSave: () => void;
    initialRole?: UserRole;
}
const UserFormModal: React.FC<UserFormModalProps> = ({ onClose, onSave, initialRole = 'agent' }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState<UserRole>(initialRole);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const existingUsers = await db.getUsers();
            if(existingUsers.some(u => u.email === email)) {
                setError('A user with this email already exists.');
                setLoading(false);
                return;
            }

            await db.addUser({
                name,
                email,
                role,
                status: role === 'agent' ? 'pending' : 'active',
            });
            alert('User created. Please ask them to use the "Forgot Password" link on the login page to set their password.');
            onSave();
        } catch (err: any) {
            setError(err.message || 'Failed to create user.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-ui rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-foreground">Add New User</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={baseInputClass} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Email</label>
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={baseInputClass} required />
                        </div>
                        <p className="text-xs text-muted-foreground p-3 bg-muted/50 rounded-lg">The user will be created without a password. They must use the "Forgot Password" feature on the login screen to set their own password.</p>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={baseInputClass}>
                                <option value="agent">Agent</option>
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                         {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                        <button type="submit" disabled={loading} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

interface UserEditFormModalProps {
    user: User;
    onClose: () => void;
    onSave: () => void;
}
const UserEditFormModal: React.FC<UserEditFormModalProps> = ({ user, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        name: user.name,
        role: user.role,
        status: user.status
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const updates: Partial<User> = {
                name: formData.name,
                role: formData.role,
                status: formData.status
            };
            
            await db.updateUser(user.id, updates);
            onSave();
        } catch (err: any) {
            setError(err.message || 'Failed to update user.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-ui rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <form onSubmit={handleSubmit}>
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-foreground">Edit User</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                    <div className="space-y-4">
                         <div>
                            <label className="block text-sm font-medium text-muted-foreground mb-2">Email (cannot be changed)</label>
                            <input type="email" value={user.email} className={`${baseInputClass} text-muted-foreground`} disabled />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                            <input name="name" type="text" value={formData.name} onChange={handleChange} className={baseInputClass} required />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Role</label>
                            <select name="role" value={formData.role} onChange={handleChange} className={baseInputClass}>
                                <option value="agent">Agent</option>
                                <option value="owner">Owner</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                            <select name="status" value={formData.status} onChange={handleChange} className={baseInputClass}>
                                <option value="active">Active</option>
                                <option value="pending">Pending</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                         {error && <p className="text-sm text-destructive">{error}</p>}
                    </div>
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                        <button type="submit" disabled={loading} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

interface IcalImportModalProps {
    property: Property;
    onClose: () => void;
    onImport: (propertyId: string) => void;
}
const IcalImportModal: React.FC<IcalImportModalProps> = ({ property, onClose, onImport }) => {
    const [url, setUrl] = useState('');
    const [loading, setLoading] = useState(false);

    const handleImport = async () => {
        setLoading(true);
        await new Promise(res => setTimeout(res, 1500));
        onImport(property.id);
        setLoading(false);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-ui rounded-2xl shadow-2xl p-6 w-full max-w-lg">
                <div className="flex items-start justify-between">
                     <h2 className="text-xl font-bold text-foreground">Sync iCal Calendar</h2>
                     <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">For <span className="font-semibold text-foreground">{property.name}</span></p>
                <p className="mt-4 text-sm text-muted-foreground">
                    Paste a calendar link (.ics) from another platform like Airbnb or VRBO to import and block out dates on your calendar. This is a one-way sync, meaning changes from the external calendar will be reflected here, but not the other way around.
                </p>
                <div className="mt-4">
                    <label htmlFor="ical-url" className="block text-sm font-medium text-foreground mb-2">Calendar URL (.ics)</label>
                    <input id="ical-url" type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://www.airbnb.com/calendar/ical/..." className={baseInputClass} />
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                    <button onClick={handleImport} disabled={loading || !url} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 text-sm`}>
                        {loading ? 'Importing...' : 'Import Calendar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const generatePropertyCode = (data: Pick<Property, 'location' | 'bedrooms'>) => {
    if (!data.location || !data.bedrooms) return '';
    const loc = data.location.slice(0, 3).toUpperCase();
    const beds = `B${data.bedrooms}`;
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${loc}-${beds}-${random}`;
};

interface PropertyFormModalProps {
    property: Property | null;
    owners: User[];
    allAmenities: Amenity[];
    onClose: () => void;
    onSave: () => void;
    refreshParentData: () => void;
}
const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ property, owners, allAmenities, onClose, onSave, refreshParentData }) => {
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
        name: '', type: 'Villas', location: 'Lonavala', capacity: 8, basePrice: 20000,
        photoLink: '', pdfLink: '', amenities: [], description: '', status: 'active',
        propertyCode: '', bedrooms: 3, bathrooms: 3, area: '', maxCapacity: 10,
        poolType: 'none', videoLink: '', extraGuestCost: 0, houseRules: '', menuCardLink: '', ownerId: '',
        securityDeposit: 0,
        ...(property || {}),
    });
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isAddingOwner, setIsAddingOwner] = useState(false);
    const [customAmenity, setCustomAmenity] = useState('');

    useEffect(() => {
        if (property) {
           const {id, ...rest} = property;
           setFormData(rest);
        } else if (formData.location || formData.bedrooms) {
           setFormData(prev => ({ ...prev, propertyCode: generatePropertyCode(prev) }));
        }
    }, [property, formData.location, formData.bedrooms]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: ['capacity', 'basePrice', 'bedrooms', 'bathrooms', 'maxCapacity', 'extraGuestCost', 'securityDeposit'].includes(name) ? Number(value) : value }));
    };

    const handleAmenityChange = (amenity: Amenity) => {
        setFormData(prev => ({ ...prev, amenities: prev.amenities.includes(amenity) ? prev.amenities.filter(a => a !== amenity) : [...prev.amenities, amenity] }));
    };
    
    const handleAddCustomAmenity = async () => {
        const newAmenity = customAmenity.trim();
        if (newAmenity && !allAmenities.find(a => a.toLowerCase() === newAmenity.toLowerCase())) {
            await db.addAmenity(newAmenity);
            refreshParentData(); // This will re-fetch amenities and update the prop
            handleAmenityChange(newAmenity); // Check the new amenity
            setCustomAmenity('');
        }
    };

    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `Generate a compelling, short marketing description for a vacation rental property.
            Property Name: "${formData.name}" Type: ${formData.type} in ${formData.location}
            Sleeps: ${formData.capacity} to ${formData.maxCapacity}, Key Amenities: ${formData.amenities.join(', ')}
            The description should be inviting and highlight the key features. Keep it under 60 words.`;
            
            const response = await ai.models.generateContent({model: 'gemini-2.5-flash', contents: prompt});
            setFormData(prev => ({...prev, description: response.text.trim() }));

        } catch (error) {
            console.error("AI description generation failed:", error);
            alert("Failed to generate description. Please check your API key and try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        if (property) {
            await db.updateProperty(property.id, formData);
        } else {
            await db.addProperty(formData);
        }
        setLoading(false);
        onSave();
    };

    const handleOwnerSave = () => {
        setIsAddingOwner(false);
        refreshParentData();
    };

    return (
         <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="glass-ui rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto custom-scrollbar">
                <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-8">
                     <div className="flex justify-between items-center sticky top-0 glass-ui -m-8 p-6 z-10 border-b border-border/50 mb-6">
                        <h2 className="text-xl font-bold text-foreground">{property ? 'Edit Property' : 'Add New Property'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
                     </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-b border-border/50 pb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className={baseInputClass} required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Property Code</label>
                            <input name="propertyCode" value={formData.propertyCode} onChange={handleChange} className={baseInputClass} required/>
                        </div>
                         <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Owner</label>
                            <div className="flex items-center space-x-2">
                                <select name="ownerId" value={formData.ownerId} onChange={handleChange} className={`${baseInputClass} flex-grow`}>
                                    <option value="">Unassigned</option>
                                    {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                                </select>
                                <button type="button" onClick={() => setIsAddingOwner(true)} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Add New</button>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Location</label>
                            <select name="location" value={formData.location} onChange={handleChange} className={baseInputClass}>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-foreground mb-2">Status</label>
                             <select name="status" value={formData.status} onChange={handleChange} className={baseInputClass}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className={baseInputClass}>
                                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Bedrooms / Bathrooms</label>
                            <div className="flex space-x-2">
                                <input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} className={baseInputClass} required/>
                                <input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} className={baseInputClass} required/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Area (e.g. 4000 sq ft)</label>
                            <input name="area" value={formData.area} onChange={handleChange} className={baseInputClass} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Base / Max Occupancy</label>
                            <div className="flex space-x-2">
                                <input name="capacity" type="number" value={formData.capacity} onChange={handleChange} className={baseInputClass} required/>
                                <input name="maxCapacity" type="number" value={formData.maxCapacity} onChange={handleChange} className={baseInputClass} required/>
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Pool Type</label>
                            <select name="poolType" value={formData.poolType} onChange={handleChange} className={baseInputClass}>
                                <option value="none">None</option>
                                <option value="private">Private</option>
                                <option value="shared">Shared</option>
                             </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Base Price (INR)</label>
                            <input name="basePrice" type="number" value={formData.basePrice} onChange={handleChange} className={baseInputClass} required/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Extra Guest Cost (INR)</label>
                            <input name="extraGuestCost" type="number" value={formData.extraGuestCost} onChange={handleChange} className={baseInputClass} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Refundable Security Deposit (INR)</label>
                            <input name="securityDeposit" type="number" value={formData.securityDeposit} onChange={handleChange} className={baseInputClass} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-b border-border/50 pb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-foreground mb-2">Amenities</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 mt-2 border border-input/50 rounded-lg p-4 bg-background/50">
                                {allAmenities.map(amenity => (
                                    <label key={amenity} className="flex items-center space-x-3 text-sm text-foreground font-medium">
                                        <input type="checkbox" checked={formData.amenities.includes(amenity)} onChange={() => handleAmenityChange(amenity)} className="h-4 w-4 rounded text-primary focus:ring-ring" />
                                        <span>{amenity}</span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                                <input type="text" value={customAmenity} onChange={e => setCustomAmenity(e.target.value)} placeholder="Add new amenity..." className={`${baseInputClass} flex-grow`} />
                                <button type="button" onClick={handleAddCustomAmenity} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Add</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">Links (URL)</label>
                            <div className="space-y-2">
                                <input name="photoLink" value={formData.photoLink} onChange={handleChange} className={baseInputClass} placeholder="Photo Link"/>
                                <input name="pdfLink" value={formData.pdfLink} onChange={handleChange} className={baseInputClass} placeholder="PDF Brochure Link"/>
                                <input name="videoLink" value={formData.videoLink} onChange={handleChange} className={baseInputClass} placeholder="Video Link"/>
                                <input name="menuCardLink" value={formData.menuCardLink} onChange={handleChange} className={baseInputClass} placeholder="Menu Card Link"/>
                            </div>
                        </div>
                         <div className="space-y-4">
                             <div>
                                 <div className="flex justify-between items-center mb-2">
                                    <label className="block text-sm font-medium text-foreground">Description</label>
                                    <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="flex items-center space-x-1 text-sm font-semibold text-primary hover:text-primary/90 disabled:opacity-50">
                                        <SparklesIcon />
                                        <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
                                    </button>
                                </div>
                                <textarea name="description" value={formData.description} onChange={handleChange} rows={5} className={baseInputClass} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-foreground mb-2">House Rules</label>
                                <textarea name="houseRules" value={formData.houseRules} onChange={handleChange} rows={4} className={baseInputClass} />
                            </div>
                         </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-3 sticky bottom-0 glass-ui -m-8 p-6 z-10 border-t border-border/50">
                        <button type="button" onClick={onClose} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                        <button type="submit" disabled={loading} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 disabled:bg-primary/50 text-sm`}>{loading ? 'Saving...' : 'Save Property'}</button>
                    </div>
                </form>
                {isAddingOwner && <UserFormModal onClose={() => setIsAddingOwner(false)} onSave={handleOwnerSave} initialRole="owner" />}
            </div>
        </div>
    );
};

// --- MAIN DASHBOARD ---
type AdminView = 'calendar' | 'properties' | 'users';
const AdminDashboard: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<AdminView>('calendar');
    const { user } = useAuth();
    
    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const [props, usersData, amenitiesData] = await Promise.all([
            db.getProperties(), 
            db.getUsers(),
            db.getAmenities()
        ]);
        setProperties(props);
        setUsers(usersData);
        setAllAmenities(amenitiesData);
        setLoading(false);
    }, []);
    
    const refreshSubData = useCallback(async () => {
        const [usersData, amenitiesData] = await Promise.all([
            db.getUsers(),
            db.getAmenities()
        ]);
        setUsers(usersData);
        setAllAmenities(amenitiesData);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    
    const navItems = [
      { id: 'calendar', label: 'Calendar', icon: CalendarIcon },
      { id: 'properties', label: 'Properties', icon: BuildingLibraryIcon },
      { id: 'users', label: 'Users', icon: UsersIcon },
    ];

    return (
        <div className="min-h-screen">
            <Header
                title="Admin Dashboard"
                subtitle={`Welcome, ${user?.name}`}
                navItems={navItems.map(item => ({
                  ...item,
                  onClick: () => setView(item.id as AdminView),
                  isActive: view === item.id
                }))}
            />
            <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8">
                {loading ? (
                     <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div></div>
                ) : (
                    <>
                        <div className={`${view !== 'calendar' ? 'hidden' : 'block'}`}><CalendarManagement properties={properties} refreshAllData={fetchAllData} /></div>
                        <div className={`${view !== 'properties' ? 'hidden' : 'block'}`}><PropertyManagement properties={properties} users={users} allAmenities={allAmenities} refreshAllData={fetchAllData} refreshSubData={refreshSubData} /></div>
                        <div className={`${view !== 'users' ? 'hidden' : 'block'}`}><UserManagement users={users} refreshUsers={fetchAllData} /></div>
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;