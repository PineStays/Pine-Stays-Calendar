import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Property, CalendarEntry } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../Header';
import { STATUS_COLORS } from '../constants';
import { PropertyFormModal } from '../components/PropertyFormModal';
import { BuildingLibraryIcon } from '../Icons';

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

const PropertyDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [property, setProperty] = useState<Property | null>(null);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    
    // For admin editing
    const [users, setUsers] = useState<any[]>([]);
    const [allAmenities, setAllAmenities] = useState<string[]>([]);

    const dates = useMemo(() => {
        const d = new Date(startDate);
        d.setHours(0,0,0,0);
        return getDatesInRange(d, 35); // Show 5 weeks
    }, [startDate]);

    const fetchData = useCallback(async () => {
        if (!id) return;
        setLoading(true);
        const props = await db.getProperties();
        const found = props.find(p => p.id === id);
        setProperty(found || null);

        if (found) {
            const start = formatDate(dates[0]);
            const end = formatDate(dates[dates.length - 1]);
            const entries = await db.getCalendarEntries(start, end);
            setCalendarEntries(entries.filter(e => e.propertyId === id));
        }
        
        // If admin, fetch auxiliary data for editing
        if (user?.role === 'admin') {
            const [usersData, amenitiesData] = await Promise.all([db.getUsers(), db.getAmenities()]);
            setUsers(usersData);
            setAllAmenities(amenitiesData);
        }

        setLoading(false);
    }, [id, dates, user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);
    
    if (loading) {
        return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div></div>;
    }

    if (!property) {
        return (
            <div className="min-h-screen">
                <Header title="Property Not Found" subtitle="" onBack={() => navigate(-1)} />
                <div className="p-8 text-center">
                    <p className="text-muted-foreground">The property you are looking for does not exist.</p>
                    <Link to="/" className="text-primary hover:underline mt-4 inline-block">Go Home</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-12">
            <Header title={property.name} subtitle={property.location} onBack={() => navigate(-1)}>
                {user?.role === 'admin' && (
                    <button 
                        onClick={() => setIsEditModalOpen(true)}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg font-semibold text-sm hover:bg-primary/90"
                    >
                        Edit Property
                    </button>
                )}
            </Header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
                {/* Hero / Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <div className="aspect-video rounded-2xl overflow-hidden bg-muted relative shadow-lg">
                            {property.photoLink ? (
                                <img src={property.photoLink} alt={property.name} className="w-full h-full object-cover" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/800x600?text=No+Image')} />
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground bg-secondary/30">
                                    <BuildingLibraryIcon className="w-16 h-16 opacity-50"/>
                                </div>
                            )}
                            <div className="absolute top-4 right-4">
                                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${property.status === 'active' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                    {property.status}
                                </span>
                            </div>
                        </div>
                         <div className="flex flex-wrap gap-3">
                            {property.pdfLink && <a href={property.pdfLink} target="_blank" rel="noreferrer" className="flex-1 py-2 px-4 bg-card border border-border rounded-xl text-center text-sm font-semibold hover:bg-muted transition-colors">PDF Brochure</a>}
                            {property.videoLink && <a href={property.videoLink} target="_blank" rel="noreferrer" className="flex-1 py-2 px-4 bg-card border border-border rounded-xl text-center text-sm font-semibold hover:bg-muted transition-colors">Video Tour</a>}
                            {property.menuCardLink && <a href={property.menuCardLink} target="_blank" rel="noreferrer" className="flex-1 py-2 px-4 bg-card border border-border rounded-xl text-center text-sm font-semibold hover:bg-muted transition-colors">Menu Card</a>}
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="glass-ui p-6 rounded-2xl">
                             <h2 className="text-xl font-bold mb-4">Details</h2>
                             <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Type</p>
                                    <p className="font-semibold text-foreground">{property.type}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Code</p>
                                    <p className="font-semibold text-foreground">{property.propertyCode || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Capacity</p>
                                    <p className="font-semibold text-foreground">{property.capacity} (Max {property.maxCapacity})</p>
                                </div>
                                 <div>
                                    <p className="text-muted-foreground">Configuration</p>
                                    <p className="font-semibold text-foreground">{property.bedrooms} Beds • {property.bathrooms} Baths</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Area</p>
                                    <p className="font-semibold text-foreground">{property.area || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Pool</p>
                                    <p className="font-semibold text-foreground capitalize">{property.poolType} Pool</p>
                                </div>
                             </div>
                        </div>
                        
                        <div className="glass-ui p-6 rounded-2xl">
                             <h2 className="text-xl font-bold mb-4">Pricing</h2>
                             <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-sm">
                                <div>
                                    <p className="text-muted-foreground">Base Price</p>
                                    <p className="font-semibold text-foreground text-lg">₹{property.basePrice.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Security Deposit</p>
                                    <p className="font-semibold text-foreground">₹{(property.securityDeposit || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground">Extra Guest</p>
                                    <p className="font-semibold text-foreground">₹{(property.extraGuestCost || 0).toLocaleString()}/person</p>
                                </div>
                             </div>
                        </div>
                    </div>
                </div>

                {/* Description & Amenities */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="md:col-span-2 space-y-8">
                         <div className="glass-ui p-6 rounded-2xl">
                            <h3 className="text-lg font-bold mb-3">About this property</h3>
                            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{property.description || 'No description available.'}</p>
                        </div>
                         <div className="glass-ui p-6 rounded-2xl">
                            <h3 className="text-lg font-bold mb-3">Amenities</h3>
                            <div className="flex flex-wrap gap-2">
                                {property.amenities.map(a => (
                                    <span key={a} className="px-3 py-1 bg-secondary/50 text-secondary-foreground rounded-full text-sm font-medium">{a}</span>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-8">
                        <div className="glass-ui p-6 rounded-2xl">
                            <h3 className="text-lg font-bold mb-3">House Rules</h3>
                            <p className="text-sm text-muted-foreground whitespace-pre-line">{property.houseRules || 'No specific rules listed.'}</p>
                        </div>
                    </div>
                </div>

                {/* Availability Calendar */}
                <div className="glass-ui p-6 rounded-2xl overflow-hidden">
                     <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Availability</h2>
                         <div className="flex items-center space-x-2">
                            <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2 hover:bg-muted rounded-lg text-sm">Previous</button>
                            <span className="font-semibold w-32 text-center text-sm">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                            <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2 hover:bg-muted rounded-lg text-sm">Next</button>
                         </div>
                     </div>
                     
                     <div className="overflow-x-auto pb-4 custom-scrollbar">
                         <div className="flex">
                             {dates.map(date => {
                                 const dateStr = formatDate(date);
                                 const entry = calendarData.get(`${property.id}-${dateStr}`);
                                 const status = entry?.status || 'available';
                                 const price = entry?.price ?? property.basePrice;
                                 const isWeekend = date.getDay() === 0 || date.getDay() === 6;
                                 const isToday = new Date().toDateString() === date.toDateString();
                                 const isPast = date < new Date(new Date().setHours(0,0,0,0));

                                 return (
                                     <div key={dateStr} className={`flex-shrink-0 w-16 sm:w-20 border-r border-border/50 last:border-r-0 flex flex-col items-center ${isToday ? 'bg-primary/5' : ''}`}>
                                         <div className={`text-xs uppercase py-2 w-full text-center border-b border-border/50 ${isWeekend ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                                             {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                         </div>
                                         <div className="text-sm font-medium py-1">
                                             {date.getDate()}
                                         </div>
                                         <div className={`w-full flex-grow min-h-[60px] flex items-center justify-center p-1 border-t border-border/50 ${STATUS_COLORS[status].bg}`}>
                                             {isPast ? (
                                                  <span className="text-xs text-muted-foreground/50">Past</span>
                                             ) : (
                                                <div className="text-center">
                                                    <div className={`text-xs font-bold ${STATUS_COLORS[status].text} capitalize mb-1`}>{status === 'owner' ? 'Owner' : status}</div>
                                                    {status === 'available' && <div className="text-xs font-semibold text-foreground">₹{(price/1000).toFixed(0)}k</div>}
                                                </div>
                                             )}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                </div>
            </main>

            {isEditModalOpen && (
                <PropertyFormModal 
                    property={property} 
                    owners={users} 
                    allAmenities={allAmenities} 
                    onClose={() => setIsEditModalOpen(false)} 
                    onSave={() => {
                        setIsEditModalOpen(false);
                        fetchData();
                    }} 
                    refreshParentData={() => fetchData()}
                />
            )}
        </div>
    );
};

export default PropertyDetails;