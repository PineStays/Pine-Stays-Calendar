











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

const baseInputClass = "w-full border border-input rounded-xl shadow-sm px-4 py-3 text-base bg-input/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted";
const baseButtonClass = "px-6 py-3 rounded-xl font-semibold text-base shadow-sm transition-colors disabled:opacity-50";

// --- QUOTE BUILDER ---
interface QuoteBuilderProps {
    selectedCells: { propertyId: string; date: string }[];
    properties: Property[];
    calendarData: Map<string, CalendarEntry>;
    onClear: () => void;
    numGuests: number;
}
const QuoteBuilder: React.FC<QuoteBuilderProps> = ({ selectedCells, properties, calendarData, onClear, numGuests }) => {
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
            const basePrice = entry?.price ?? property.basePrice;
            
            let dailyPrice = basePrice;
            if (numGuests > property.capacity) {
                const extraGuests = Math.min(numGuests, property.maxCapacity) - property.capacity;
                dailyPrice += extraGuests * (property.extraGuestCost || 0);
            }

            totalPrice += dailyPrice;
            return { date: cell.date, price: dailyPrice };
        });

        return { property, checkIn, checkOut, totalPrice, dateDetails };
    }, [selectedCells, properties, calendarData, numGuests]);

    if (!quoteDetails) return null;

    const handleCopyToClipboard = () => {
        if (!quoteDetails || 'error' in quoteDetails) return;
        const { property, checkIn, checkOut, totalPrice } = quoteDetails;
        
        const guestsText = numGuests > 0 ? `Guests: ${numGuests}` : `Guests: Up to ${property.capacity} (Max ${property.maxCapacity})`;

        const combinedText = `
QUOTE: Quote for ${property.name}
-----------------------------
Check-in: ${checkIn.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
Check-out: ${checkOut.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
${guestsText}
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
            <div className="glass-ui rounded-2xl shadow-2xl p-4 space-y-3 animate-fade-in">
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
                            {numGuests > 0 && <p>Guests: <span className="font-medium text-foreground">{numGuests}</span></p>}
                        </div>
                        <div className="border-t border-border/50 pt-2 mt-2">
                            <p className="text-lg font-bold text-foreground">Total: ₹{quoteDetails.totalPrice.toLocaleString('en-IN')}</p>
                            {quoteDetails.property.securityDeposit && <p className="text-xs text-muted-foreground">+ ₹{quoteDetails.property.securityDeposit.toLocaleString('en-IN')} refundable deposit</p>}
                        </div>
                        <button onClick={handleCopyToClipboard} className={`${baseButtonClass} w-full mt-2 flex items-center justify-center gap-2 text-sm ${copied ? 'bg-emerald-600' : 'bg-primary'} text-primary-foreground hover:bg-primary/90`}>
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
    isPast: boolean;
    numGuests: number;
}>(({ prop, date, calendarData, isSelected, onCellSelect, isPast, numGuests }) => {
    const dateStr = formatDate(date);
    const entry = calendarData.get(`${prop.id}-${dateStr}`);
    const status = entry?.status || 'available';
    
    const basePrice = entry?.price ?? prop.basePrice;
    let price = basePrice;
    
    if (numGuests > prop.capacity) {
        const extraGuests = Math.min(numGuests, prop.maxCapacity) - prop.capacity;
        price += extraGuests * (prop.extraGuestCost || 0);
    }

    const isClickable = status === 'available' && !isPast;

    const statusClasses = STATUS_COLORS[status];
    const cellClasses = `border border-border/30 text-center transition-all relative ${
        isPast && status === 'available' ? 'bg-muted/30 text-muted-foreground/50' : `${statusClasses.bg} ${statusClasses.text}`
    } ${isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'}`;

    return (
        <td
            className={`${cellClasses} ${isSelected ? 'ring-2 ring-primary ring-offset-background ring-offset-2 z-10 bg-primary/20' : isClickable ? 'hover:shadow-md' : ''}`}
            onClick={() => isClickable && onCellSelect(prop.id, dateStr, status !== 'available')}
        >
            <div className="p-1.5 font-medium text-sm">
                {price > 0 ? `₹${price.toLocaleString('en-IN', { maximumFractionDigits: 0 })}` : <span className="capitalize text-xs">{status === 'owner' ? 'Booked O' : status}</span>}
            </div>
            {entry?.notes && <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" title={entry.notes}></span>}
        </td>
    );
});

// --- FILTER SIDEBAR ---
interface FilterSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    filters: any;
    setFilters: (filters: any) => void;
    allAmenities: Amenity[];
    properties: Property[];
}
const FilterSidebar: React.FC<FilterSidebarProps> = ({ isOpen, onClose, filters, setFilters, allAmenities, properties }) => {
    
    const handleFilterChange = (key: string, value: any) => {
        setFilters({ ...filters, [key]: value });
    };

    const handleAmenityChange = (amenity: string) => {
        const currentAmenities = filters.amenities || [];
        const newAmenities = currentAmenities.includes(amenity)
            ? currentAmenities.filter((a: string) => a !== amenity)
            : [...currentAmenities, amenity];
        handleFilterChange('amenities', newAmenities);
    };

    const resetFilters = () => {
        setFilters({ location: 'all', type: 'all', amenities: [] });
    };
    
    return (
        <>
          <div 
              className={`fixed inset-0 bg-black/60 z-40 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
              onClick={onClose}
          />
          <div className={`fixed top-0 left-0 bottom-0 w-80 bg-card/80 backdrop-blur-2xl border-r border-border/50 shadow-2xl z-50 p-6 flex flex-col transform transition-transform ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
              <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-foreground">Filters</h2>
                  <button onClick={onClose} className="p-2 -m-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
              </div>
              <div className="flex-grow min-h-0 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Location</label>
                      <select value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} className={baseInputClass}>
                          <option value="all">All Locations</option>
                          {LOCATIONS.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Property Type</label>
                      <select value={filters.type} onChange={e => handleFilterChange('type', e.target.value)} className={baseInputClass}>
                          <option value="all">All Types</option>
                          {PROPERTY_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                      </select>
                  </div>
                  <div>
                      <label className="block text-sm font-semibold text-foreground mb-2">Amenities</label>
                      <div className="space-y-3 max-h-60 overflow-y-auto p-1">
                          {allAmenities.map(amenity => (
                              <label key={amenity} className="flex items-center space-x-3">
                                  <input type="checkbox" checked={filters.amenities.includes(amenity)} onChange={() => handleAmenityChange(amenity)} className="h-4 w-4 rounded text-primary focus:ring-ring" />
                                  <span className="text-sm text-foreground">{amenity}</span>
                              </label>
                          ))}
                      </div>
                  </div>
              </div>
              <div className="pt-6 border-t border-border/50">
                  <button onClick={resetFilters} className={`${baseButtonClass} w-full bg-secondary text-secondary-foreground hover:bg-secondary/80 text-sm`}>Reset Filters</button>
              </div>
          </div>
        </>
    );
};

// --- MAIN PORTAL ---
const AgentPortal: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [allAmenities, setAllAmenities] = useState<Amenity[]>([]);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    
    const getToday = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    };

    const [startDate, setStartDate] = useState(getToday());
    const [selectedCells, setSelectedCells] = useState<{ propertyId: string; date: string }[]>([]);
    const [selectionAnchor, setSelectionAnchor] = useState<{ propertyId: string; date: string } | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [filters, setFilters] = useState({
        location: 'all',
        type: 'all',
        amenities: [] as string[],
    });
    const [checkinDate, setCheckinDate] = useState(formatDate(new Date()));
    const [numGuests, setNumGuests] = useState<number>(2);
    const { user } = useAuth();
    
    const dates = useMemo(() => {
        return getDatesInRange(startDate, 30);
    }, [startDate]);

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
            if (numGuests > 0 && p.maxCapacity < numGuests) return false;
            if (filters.amenities.length > 0 && !filters.amenities.every(a => p.amenities.includes(a))) return false;
            return true;
        });
    }, [properties, filters, numGuests]);

    const clearSelection = () => {
        setSelectedCells([]);
        setSelectionAnchor(null);
    };

    const handleCellSelect = useCallback((propertyId: string, dateStr: string, isBooked: boolean) => {
        if (isBooked) {
            clearSelection();
            return;
        }

        // If the clicked cell is the only one selected, clear the selection.
        if (selectedCells.length === 1 && selectedCells[0].propertyId === propertyId && selectedCells[0].date === dateStr) {
            clearSelection();
            return;
        }

        // If a range is already selected or switching properties, start a new selection.
        if (selectedCells.length > 1 || (selectionAnchor && selectionAnchor.propertyId !== propertyId)) {
            setSelectedCells([{ propertyId, date: dateStr }]);
            setSelectionAnchor({ propertyId, date: dateStr });
            return;
        }

        // If no anchor is set, this is the first click (start of a range).
        if (!selectionAnchor) {
            setSelectedCells([{ propertyId, date: dateStr }]);
            setSelectionAnchor({ propertyId, date: dateStr });
            return;
        }

        // An anchor is set; this is the second click (end of a range).
        const startDate = new Date(selectionAnchor.date + 'T00:00:00');
        const endDate = new Date(dateStr + 'T00:00:00');

        const rangeStart = startDate < endDate ? startDate : endDate;
        const rangeEnd = startDate < endDate ? endDate : startDate;

        const datesInRange: string[] = [];
        const tempDate = new Date(rangeStart);

        // Validate all dates within the proposed range.
        while (tempDate <= rangeEnd) {
            const currentDateStr = formatDate(tempDate);
            const entry = calendarData.get(`${propertyId}-${currentDateStr}`);
            const status = entry?.status || 'available';

            if (status !== 'available') {
                alert('Your selection includes unavailable dates. Please choose a different date range.');
                // Start a new selection from the clicked date.
                setSelectedCells([{ propertyId, date: dateStr }]);
                setSelectionAnchor({ propertyId, date: dateStr });
                return;
            }
            datesInRange.push(currentDateStr);
            tempDate.setDate(tempDate.getDate() + 1);
        }

        // If the range is valid, select all dates within it.
        setSelectedCells(datesInRange.map(date => ({ propertyId, date })));
        setSelectionAnchor(null); // Reset anchor as selection is complete.
    }, [selectionAnchor, selectedCells, calendarData]);
    
    const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filters.location !== 'all') count++;
      if (filters.type !== 'all') count++;
      count += filters.amenities.length;
      return count;
    }, [filters]);

    const handleCheckinDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newDateStr = e.target.value;
        setCheckinDate(newDateStr);
        if (newDateStr) {
            const newDate = new Date(newDateStr + 'T00:00:00');
            const today = getToday();
            setStartDate(newDate < today ? today : newDate);
        }
    };
    
    const todayForComparison = getToday();

    return (
        <div className="min-h-screen">
            <Header
                title="Agent Calendar"
                subtitle={`Welcome, ${user?.name}`}
            />

            <main className={`max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-6 sm:py-8 transition-all duration-300 ${selectedCells.length > 0 ? 'pb-80 sm:pb-64' : ''}`}>
                <div className="glass-ui p-4 sm:p-6 rounded-2xl shadow-2xl">
                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold text-foreground">Availability Calendar</h2>
                             <button onClick={() => setIsFilterOpen(true)} className={`${baseButtonClass} bg-secondary text-secondary-foreground hover:bg-secondary/80 flex items-center gap-2 text-sm`}>
                                <FunnelIcon className="w-4 h-4" /> Filter {activeFilterCount > 0 && <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">{activeFilterCount}</span>}
                            </button>
                        </div>
                        <div className="flex justify-end">
                             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-border/50 p-3 rounded-2xl bg-muted/30 w-full sm:w-auto">
                                <div>
                                    <label htmlFor="checkin-date" className="block text-xs font-semibold text-muted-foreground mb-1.5">CHECK-IN DATE</label>
                                    <input
                                        id="checkin-date"
                                        type="date"
                                        value={checkinDate}
                                        min={formatDate(new Date())}
                                        onChange={handleCheckinDateChange}
                                        className={`${baseInputClass} p-3`}
                                        aria-label="Check-in date"
                                    />
                                </div>
                                <div>
                                    <label htmlFor="num-guests" className="block text-xs font-semibold text-muted-foreground mb-1.5">GUESTS</label>
                                    <input
                                        id="num-guests"
                                        type="number"
                                        value={numGuests > 0 ? numGuests : ''}
                                        min="1"
                                        onChange={(e) => setNumGuests(Number(e.target.value))}
                                        className={`${baseInputClass} p-3`}
                                        aria-label="Number of guests"
                                        placeholder="e.g. 4"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>


                    {activeFilterCount > 0 && (
                      <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm font-semibold text-foreground">Active Filters:</span>
                        <div className="flex flex-wrap gap-2">
                           {filters.location !== 'all' && <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{filters.location}</span>}
                           {filters.type !== 'all' && <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{filters.type}</span>}
                           {filters.amenities.map(a => <span key={a} className="bg-primary/10 text-primary text-xs font-bold px-2 py-1 rounded-full">{a}</span>)}
                        </div>
                        <button onClick={() => setFilters({ location: 'all', type: 'all', amenities: [] })} className="ml-auto text-sm font-semibold text-primary hover:underline">Clear</button>
                      </div>
                    )}
                    <div className="overflow-x-auto relative custom-scrollbar">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr className="bg-muted/50">
                                    <th className="sticky left-0 glass-ui p-3 border-b border-r border-border/50 w-24 min-w-[96px] sm:w-32 sm:min-w-[128px] text-left text-sm font-semibold text-foreground z-30">Property</th>
                                    <th className="sticky left-[96px] sm:left-[128px] glass-ui p-3 border-b border-r border-border/50 w-16 min-w-[64px] text-center text-sm font-semibold text-foreground z-20">Beds</th>
                                    {dates.map(date => {
                                        const isToday = date.toDateString() === new Date().toDateString();
                                        return (
                                            <th key={date.toISOString()} className={`p-2 border-b border-border/50 text-center text-xs font-semibold text-muted-foreground bg-muted/30 ${isToday ? 'bg-primary/10' : ''}`}>
                                                <div className="min-w-[70px]">
                                                  <div className={`${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary font-bold' : ''} ${isToday ? 'text-primary font-bold' : ''}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                                  <div className="mt-1">{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {filteredProperties.map(prop => (
                                    <tr key={prop.id} className="hover:bg-muted/50">
                                        <td className="sticky left-0 bg-card/60 hover:bg-muted/50 z-10 p-2.5 border-b border-r border-border/30 font-semibold text-foreground w-24 min-w-[96px] sm:w-32 sm:min-w-[128px] truncate" title={prop.name}>{prop.name}</td>
                                        <td className="sticky left-[96px] sm:left-[128px] bg-card/60 hover:bg-muted/50 z-10 p-2.5 border-b border-r border-border/30 text-center text-muted-foreground">{prop.bedrooms}</td>
                                        {dates.map(date => {
                                            const dateStr = formatDate(date);
                                            const isSelected = selectedCells.some(c => c.propertyId === prop.id && c.date === dateStr);
                                            const isPast = date < todayForComparison;
                                            return (
                                                <MemoizedCalendarCell
                                                    key={`${prop.id}-${dateStr}`}
                                                    prop={prop}
                                                    date={date}
                                                    calendarData={calendarData}
                                                    isSelected={isSelected}
                                                    onCellSelect={handleCellSelect}
                                                    isPast={isPast}
                                                    numGuests={numGuests}
                                                />
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                         {loading && <div className="absolute inset-0 bg-card/70 flex items-center justify-center rounded-2xl"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div></div>}
                         {!loading && filteredProperties.length === 0 && (
                            <div className="text-center py-12">
                                <BuildingLibraryIcon className="mx-auto h-12 w-12 text-muted-foreground" />
                                <h3 className="mt-2 text-lg font-semibold text-foreground">No Properties Found</h3>
                                <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or the number of guests.</p>
                            </div>
                         )}
                    </div>
                </div>
            </main>
            <QuoteBuilder selectedCells={selectedCells} properties={properties} calendarData={calendarData} onClear={clearSelection} numGuests={numGuests} />
            <FilterSidebar isOpen={isFilterOpen} onClose={() => setIsFilterOpen(false)} filters={filters} setFilters={setFilters} allAmenities={allAmenities} properties={properties} />
        </div>
    );
};

export default AgentPortal;