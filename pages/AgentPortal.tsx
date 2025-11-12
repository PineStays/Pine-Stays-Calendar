import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Property, CalendarEntry, CalendarStatus, Location, PropertyType, Amenity } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { STATUS_COLORS, LOCATIONS, PROPERTY_TYPES } from '../constants';
import { Header } from '../Header';
import { FunnelIcon, XMarkIcon, ClipboardIcon, CheckIcon, BuildingLibraryIcon } from '../Icons';

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

const baseInputClass = "w-full border border-input rounded-lg shadow-sm px-3 py-2.5 text-sm leading-snug bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted";
const baseButtonClass = "px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-50";

// --- QUOTE BUILDER ---
interface QuoteBuilderProps {
    selectedCells: { propertyId: string; date: string }[];
    properties: Property[];
    calendarData: Map<string, CalendarEntry>;
    onClear: () => void;
}
const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ selectedCells, properties, calendarData, onClear }) => {
    const [copied, setCopied] = useState(false);

    const quoteDetails = useMemo(() => {
        if (selectedCells.length === 0) return null;

        const propertyId = selectedCells[0].propertyId;
        const property = properties.find(p => p.id === propertyId);
        if (!property) return null;

        if (!selectedCells.every(c => c.propertyId === propertyId)) {
            return { error: 'Please select dates for only one property at a time to build a quote.' };
        }

        const sortedCells = [...selectedCells].sort((a, b) => a.date.localeCompare(b.date));
        const checkIn = new Date(sortedCells[0].date + 'T00:00:00');
        const checkOut = new Date(sortedCells[sortedCells.length - 1].date + 'T00:00:00');
        checkOut.setDate(checkOut.getDate() + 1);

        let totalPrice = 0;
        const dateDetails = sortedCells.map(cell => {
            const entry = calendarData.get(`${cell.propertyId}-${cell.date}`);
            const price = entry?.price ?? property.basePrice;
            totalPrice += price;
            return { date: cell.date, price };
        });

        return { property, checkIn, checkOut, totalPrice, dateDetails };
    }, [selectedCells, properties, calendarData]);

    if (!quoteDetails) return null;

    const handleCopyToClipboard = () => {
        if (!quoteDetails || 'error' in quoteDetails) return;
        const { property, checkIn, checkOut, totalPrice } = quoteDetails;

        const combinedText = `
QUOTE: Quote for ${property.name}
-----------------------------
Check-in: ${checkIn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
Check-out: ${checkOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
Guests: Up to ${property.capacity} (Max ${property.maxCapacity})
-----------------------------
Extra Guest Cost: ₹${(property.extraGuestCost || 0).toLocaleString('en-IN')}/person
Refundable Security Deposit: ₹${(property.securityDeposit || 0).toLocaleString('en-IN')}
Total Stay Price: ₹${totalPrice.toLocaleString('en-IN')}
-----------------------------
(Prices are exclusive of taxes)

---------------------------------
Property Code: ${property.propertyCode || 'NA'}
Location: ${property.location || 'NA'}
Type: ${property.type || 'NA'}
Bedrooms: ${property.bedrooms || 'NA'}
Bathrooms: ${property.bathrooms || 'NA'}
Swimming Pool: ${property.poolType !== 'none' ? (property.poolType.charAt(0).toUpperCase() + property.poolType.slice(1) + ' Pool') : 'None'}
Base Occupancy: ${property.capacity || 'NA'}
Max Occupancy: ${property.maxCapacity || 'NA'}
---------------------------------
*Amenities*
${property.amenities.join(', ') || 'NA'}
---------------------------------
*Links*
Photos: ${property.photoLink || 'NA'}
PDF Brochure: ${property.pdfLink || 'NA'}
Video: ${property.videoLink || 'NA'}
Menu Card: ${property.menuCardLink || 'NA'}
---------------------------------
*House Rules*
${property.houseRules || 'NA'}
        `.trim();
        
        navigator.clipboard.writeText(combinedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-md sm:p-0">
            <div className="bg-card/80 backdrop-blur-lg rounded-xl shadow-2xl border border-border p-4 space-y-3 animate-fade-in">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-foreground">Quote Builder</h3>
                    <button onClick={onClear} className="text-sm font-semibold text-primary hover:text-primary/90">Clear Selection</button>
                </div>

                {'error' in quoteDetails ? (
                    <p className="text-destructive text-sm font-medium">{quoteDetails.error}</p>
                ) : (
                    <>
                        <p className="font-semibold text-foreground">{quoteDetails.property.name}</p>
                        <div className="text-sm space-y-1 text-muted-foreground">
                            <p>Check-in: <span className="font-medium text-foreground">{quoteDetails.checkIn.toLocaleDateString('en-GB')}</span></p>
                            <p>Check-out: <span className="font-medium text-foreground">{quoteDetails.checkOut.toLocaleDateString('en-GB')}</span></p>
                            <p>Nights: <span className="font-medium text-foreground">{quoteDetails.dateDetails.length}</span></p>
                        </div>
                        <div className="border-t border-border pt-2 mt-2">
                            <p className="text-lg font-bold text-foreground">Total: ₹{quoteDetails.totalPrice.toLocaleString('en-IN')}</p>
                            {quoteDetails.property.securityDeposit && <p className="text-xs text-muted-foreground">+ ₹{quoteDetails.property.securityDeposit.toLocaleString('en-IN')} refundable deposit</p>}
                        </div>
                        <button onClick={handleCopyToClipboard} className={`${baseButtonClass} w-full mt-2 flex items-center justify-center gap-2 ${copied ? 'bg-emerald-600' : 'bg-primary'} text-primary-foreground hover:bg-primary/90`}>
                            {copied ? <><CheckIcon className="w-5 h-5"/> Copied!</> : <><ClipboardIcon className="w-5 h-5"/> Copy Quote</>}
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- CALENDAR CELL ---
const MemoizedCalendarCell = React.memo<{
    prop: Property;
    date: Date;
    calendarData: Map<string, CalendarEntry>;
    isSelected: boolean;
    onCellSelect: (propertyId: string, date: string, isBooked: boolean) => void;
}>(({ prop, date, calendarData, isSelected, onCellSelect }) => {
    const dateStr = formatDate(date);
    const entry = calendarData.get(`${prop.id}-${dateStr}`);
    const status = entry?.status || 'available';
    const price = entry?.price ?? prop.basePrice;
    const isClickable = status === 'available';

    const statusClasses = STATUS_COLORS[status];
    const cellClasses = `border border-border text-center transition-all relative ${statusClasses.bg} ${statusClasses.text} ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`;

    return (
        <td
            className={`${cellClasses} ${isSelected ? 'ring-2 ring-primary ring-offset-background ring-offset-2 z-10 bg-primary/20' : isClickable ? 'hover:shadow-md' : ''}`}
            onClick={() => isClickable && onCellSelect(prop.id, dateStr, status !== 'available')}
        >
            <div className="p-1 font-medium text-xs sm:text-sm">
                {price > 0 ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : <span className="capitalize text-xs">{status === 'owner' ? 'Booked O' : status}</span>}
            </div>
            {entry?.notes && <span className="absolute top-1 right-1 w-2 h-2 bg-blue-500 rounded-full" title={entry.notes}></span>}
        </td>
    );
});

// --- MAIN PORTAL ---
const AgentPortal: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(new Date());
    const [selectedCells, setSelectedCells] = useState<{ propertyId: string; date: string }[]>([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        location: 'all',
        type: 'all',
        amenities: [] as string[],
        minCapacity: 0,
    });
    const { user } = useAuth();
    
    const dates = useMemo(() => getDatesInRange(startDate, 30), [startDate]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [props, amenitiesData] = await Promise.all([db.getProperties(), db.getAmenities()]);
        setProperties(props.filter(p => p.status === 'active'));
        setAllAmenities(amenitiesData);
        
        if (dates.length > 0) {
            const start = formatDate(dates[0]);
            const end = formatDate(dates[dates.length - 1]);
            const entries = await db.getCalendarEntries(start, end);
            setCalendarEntries(entries);
        }
        setLoading(false);
    }, [dates]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => {
            if (filters.location !== 'all' && p.location !== filters.location) return false;
            if (filters.type !== 'all' && p.type !== filters.type) return false;
            if (filters.minCapacity > 0 && p.capacity < filters.minCapacity) return false;
            if (filters.amenities.length > 0 && !filters.amenities.every(a => p.amenities.includes(a))) return false;
            return true;
        });
    }, [properties, filters]);

    const handleCellSelect = useCallback((propertyId: string, date: string, isBooked: boolean) => {
        if (isBooked) return;

        const isSameProperty = selectedCells.length === 0 || selectedCells[0].propertyId === propertyId;
        if (!isSameProperty) {
            setSelectedCells([{ propertyId, date }]);
            return;
        }

        const key = `${propertyId}-${date}`;
        const index = selectedCells.findIndex(c => `${c.propertyId}-${c.date}` === key);
        if (index > -1) {
            setSelectedCells(prev => [...prev.slice(0, index), ...prev.slice(index + 1)]);
        } else {
            setSelectedCells(prev => [...prev, { propertyId, date }]);
        }
    }, [selectedCells]);

    return (
        <div className="bg-muted/40 dark:bg-background min-h-screen">
            <Header
                title="Agent Calendar"
                subtitle={`Welcome, ${user?.name}`}
            >
              <button onClick={() => setIsFilterOpen(true)} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2`}>
                <FunnelIcon className="w-4 h-4" /> Filter
              </button>
            </Header>

            <main className={`max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8 transition-all duration-300 ${selectedCells.length > 0 ? 'pb-80 sm:pb-64' : ''}`}>
                <div className="bg-card p-4 sm:p-6 rounded-xl shadow-lg border border-border">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                         <h2 className="text-xl font-bold text-foreground">Availability Calendar</h2>
                          <div className="flex items-center space-x-1 self-end sm:self-center">
                            <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&lt;</button>
                            <span className="font-semibold text-foreground text-base sm:text-lg w-36 text-center">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                            <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&gt;</button>
                         </div>
                    </div>
                    <div className="overflow-x-auto relative custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="sticky left-0 bg-card z-10 p-2 border border-border w-32 min-w-[128px] sm:w-40 sm:min-w-[160px] text-left text-sm font-semibold text-foreground">Property</th>
                                    <th className="sticky left-[128px] sm:left-[160px] bg-card z-10 p-2 border border-border w-16 min-w-[64px] text-center text-sm font-semibold text-foreground">Beds</th>
                                    {dates.map(date => (
                                        <th key={date.toISOString()} className="p-2 border border-border text-center text-xs font-semibold text-muted-foreground">
                                            <div className="min-w-[60px]">
                                              <div className={`${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary font-bold' : ''}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                              <div>{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredProperties.map(prop => (
                                    <tr key={prop.id} className="hover:bg-muted/50">
                                        <td className="sticky left-0 bg-card hover:bg-muted/50 z-10 p-2 border border-border font-semibold text-foreground w-32 min-w-[128px] sm:w-40 sm:min-w-[160px]">{prop.name}</td>
                                        <td className="sticky left-[128px] sm:left-[160px] bg-card hover:bg-muted/50 z-10 p-2 border border-border text-center text-muted-foreground">{prop.bedrooms}</td>
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
                         {loading && <div className="absolute inset-0 bg-card/70 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}
                    </div>
                </div>
            </main>
            <QuoteBuilder selectedCells={selectedCells} properties={properties} calendarData={calendarData} onClear={() => setSelectedCells([])} />
        </div>
    );
};

export default AgentPortal;