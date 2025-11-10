import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, CalendarEntry } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { STATUS_COLORS } from '../constants';
import { Header } from '../Header';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getDatesInRange = (startDate: Date, days: number) => {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
    });
};

const OwnerDashboard: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const { user } = useAuth();
    
    const dates = useMemo(() => getDatesInRange(startDate, 30), [startDate]);

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
    
    return (
        <div className="bg-background min-h-screen">
            <Header
                title="Owner Dashboard"
                subtitle={`Welcome, ${user?.name}`}
            />
            <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-8">
                {loading ? (
                    <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div></div>
                ) : (
                    <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg border border-border">
                        <div className="flex justify-between items-center mb-4">
                             <h2 className="text-xl font-bold text-foreground">My Properties</h2>
                              <div className="flex items-center space-x-1">
                                <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&lt;</button>
                                <span className="font-semibold text-foreground text-lg w-36 text-center">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                                <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&gt;</button>
                             </div>
                        </div>
                         <div className="overflow-x-auto relative custom-scrollbar">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-muted/50">
                                        <th className="sticky left-0 bg-card z-10 p-2 border border-border w-40 min-w-[160px] text-left text-sm font-semibold text-foreground">Property</th>
                                        {dates.map(date => (
                                            <th key={date.toISOString()} className="p-2 border border-border text-center text-xs font-semibold text-muted-foreground">
                                                <div className="min-w-[50px]">
                                                  <div className={`${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary font-bold' : ''}`}>{date.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0)}</div>
                                                  <div>{date.getDate()}</div>
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {properties.map(prop => (
                                        <tr key={prop.id} className="hover:bg-muted/50">
                                            <td className="sticky left-0 bg-card hover:bg-muted/50 z-10 p-2 border border-border font-semibold text-foreground">{prop.name}</td>
                                            {dates.map(date => {
                                                const dateStr = formatDate(date);
                                                const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                                const status = entry?.status || 'available';
                                                const color = STATUS_COLORS[status];
                                                const statusText = status === 'owner' ? 'O' : status === 'booked' ? 'B' : status === 'blocked' ? 'X' : 'A';
                                                return (
                                                    <td key={dateStr} className={`border border-border text-center transition-colors ${color.bg} ${color.text}`}>
                                                        <div className="p-1 font-medium text-xs" title={status.charAt(0).toUpperCase() + status.slice(1)}>
                                                            {statusText}
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
        </div>
    );
};

export default OwnerDashboard;
