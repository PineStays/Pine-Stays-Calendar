



import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, CalendarEntry } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { STATUS_COLORS } from '../constants';
import { Header } from '../Header';
import { XMarkIcon } from '../Icons';

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


interface NoteEditModalProps {
    cell: { property: Property; date: string; entry?: CalendarEntry };
    onClose: () => void;
    onSave: () => void;
}
const NoteEditModal: React.FC<NoteEditModalProps> = ({ cell, onClose, onSave }) => {
    const { property, date, entry } = cell;
    const [note, setNote] = useState(entry?.notes || '');
    const [loading, setLoading] = useState(false);
    
    const status = entry?.status || 'available';
    const price = entry?.price ?? property.basePrice;

    const handleSave = async () => {
        setLoading(true);
        await db.upsertCalendarEntry({
            propertyId: property.id,
            date,
            status,
            price,
            notes: note,
        });
        setLoading(false);
        onSave();
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-ui rounded-2xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl font-bold text-foreground">Add/Edit Note</h2>
                    <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
                </div>
                <div className="space-y-4">
                    <p className="text-sm">
                        <span className="font-semibold text-muted-foreground">Property:</span> {property.name} <br/>
                        <span className="font-semibold text-muted-foreground">Date:</span> {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                    <div className={`p-2 rounded-lg text-sm font-medium ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`}>
                        Current Status: <span className="font-bold capitalize">{status}</span> at <span className="font-bold">₹{price.toLocaleString('en-IN')}</span>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">Your Note (Visible to Admin)</label>
                        <textarea
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                            rows={4}
                            className={baseInputClass}
                            placeholder="e.g., 'Price seems too high for a weekday', 'Suggest increasing price due to local event'"
                        />
                    </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                    <button type="button" onClick={onClose} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Cancel</button>
                    <button type="button" onClick={handleSave} disabled={loading} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>
                        {loading ? 'Saving...' : 'Save Note'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- NOTE VIEWER (OWNER) ---
const OwnerNoteViewer: React.FC<{
    note: { property: Property; date: string; entry: CalendarEntry };
    onClose: () => void;
    onEdit: () => void;
}> = ({ note, onClose, onEdit }) => {
    const formattedDate = new Date(note.date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-xl sm:p-0">
            <div className="glass-ui rounded-2xl shadow-2xl p-4 space-y-2 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-foreground">Note for {note.property.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-muted"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <p className="text-sm font-semibold text-muted-foreground">{formattedDate}</p>
                <p className="text-sm bg-muted/50 p-3 rounded-lg">{note.entry.notes}</p>
                <div className="flex justify-end pt-2">
                    <button onClick={onEdit} className={`${baseButtonClass} bg-primary text-primary-foreground hover:bg-primary/90 text-sm`}>
                       Edit Note
                    </button>
                </div>
            </div>
        </div>
    );
};


const OwnerDashboard: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [editingCell, setEditingCell] = useState<{ property: Property; date: string; entry?: CalendarEntry } | null>(null);
    const [viewingNote, setViewingNote] = useState<{ property: Property; date: string; entry: CalendarEntry } | null>(null);
    const { user } = useAuth();
    
    const dates = useMemo(() => {
        const year = startDate.getFullYear();
        const month = startDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        return getDatesInRange(startDate, daysInMonth);
    }, [startDate]);

    const fetchOwnerData = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        const allProps = await db.getProperties();
        const myProps = allProps.filter(p => p.ownerId === user.id && p.status === 'active');
        setProperties(myProps);

        if (myProps.length > 0 && dates.length > 0) {
            const start = formatDate(dates[0]);
            const end = formatDate(dates[dates.length - 1]);
            const entries = await db.getCalendarEntries(start, end);
            setCalendarEntries(entries.filter(e => myProps.some(p => p.id === e.propertyId)));
        }
        setLoading(false);
    }, [user, dates]);

    useEffect(() => {
        fetchOwnerData();
    }, [fetchOwnerData]);
    
    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);
    
    const handleSaveNote = () => {
        setEditingCell(null);
        fetchOwnerData();
    };
    
    const handleEditNote = () => {
        if(viewingNote) {
            setEditingCell(viewingNote);
        }
        setViewingNote(null);
    }

    return (
        <div className="min-h-screen">
            <Header
                title="Owner Dashboard"
                subtitle={`Welcome, ${user?.name}`}
            />
            <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8">
                {loading ? (
                    <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div></div>
                ) : (
                    <div className="glass-ui p-4 sm:p-6 rounded-2xl shadow-2xl">
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                             <h2 className="text-2xl font-bold text-foreground">My Properties</h2>
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
                                    {properties.map(prop => (
                                        <tr key={prop.id} className="hover:bg-muted/50">
                                            <td className="sticky left-0 bg-card/60 hover:bg-muted/50 z-10 p-2.5 border-b border-r border-border/30 font-semibold text-foreground w-32 min-w-[128px] sm:w-40 sm:min-w-[160px]">{prop.name}</td>
                                            {dates.map(date => {
                                                const dateStr = formatDate(date);
                                                const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                                const status = entry?.status || 'available';
                                                const price = entry?.price ?? prop.basePrice;
                                                const statusText = status === 'owner' ? 'Booked O' : status;

                                                return (
                                                    <td 
                                                        key={dateStr} 
                                                        className={`border border-border/30 text-center transition-colors cursor-pointer ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`}
                                                        onClick={() => {
                                                            if (entry?.notes) {
                                                                setViewingNote({ property: prop, date: dateStr, entry });
                                                            } else {
                                                                setEditingCell({ property: prop, date: dateStr, entry });
                                                            }
                                                        }}
                                                    >
                                                        <div className="p-1.5 font-medium relative text-sm">
                                                            {price > 0 ? `₹${price.toLocaleString('en-IN', {maximumFractionDigits: 0})}` : <span className="capitalize text-xs">{statusText}</span>}
                                                            {entry?.notes && <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-primary rounded-full"></span>}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>
            {viewingNote && <OwnerNoteViewer note={viewingNote} onClose={() => setViewingNote(null)} onEdit={handleEditNote} />}
            {editingCell && <NoteEditModal cell={editingCell} onClose={() => setEditingCell(null)} onSave={handleSaveNote} />}
        </div>
    );
};

export default OwnerDashboard;