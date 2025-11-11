import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Property, CalendarEntry, PropertyType, Location } from '../types';
import { db } from '../services/databaseService';
import { STATUS_COLORS, LOCATIONS, PROPERTY_TYPES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../Header';
import { ClipboardIcon, CheckIcon, XMarkIcon, CalendarIcon, FunnelIcon } from '../Icons';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

const AgentPortal: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [locationFilter, setLocationFilter] = useState<Location | 'all'>('all');
    const [typeFilter, setTypeFilter] = useState<PropertyType | 'all'>('all');

    // UI State
    const [view, setView] = useState<'month' | 'week'>('month');
    const [startDate, setStartDate] = useState(new Date());
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [selectedDateString, setSelectedDateString] = useState<string | null>(null);
    const { user } = useAuth();
    
    const dates = useMemo(() => {
        const daysToShow = view === 'week' ? 7 : 30;
        const d = [];
        for (let i = 0; i < daysToShow; i++) {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            d.push(date);
        }
        return d;
    }, [startDate, view]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        if (dates.length === 0) return;
        const [props, entries] = await Promise.all([
            db.getProperties(),
            db.getCalendarEntries(formatDate(dates[0]), formatDate(dates[dates.length - 1])),
        ]);
        
        const activeProperties = props.filter(p => p.status === 'active');

        setProperties(activeProperties);
        setCalendarEntries(entries);
        setLastUpdated(new Date());
        setLoading(false);
    }, [dates]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 60000); // Auto-refresh every 1 minute
        return () => clearInterval(interval);
    }, [fetchData]);

    const filteredProperties = useMemo(() => {
        return properties
            .filter(p => searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true)
            .filter(p => locationFilter !== 'all' ? p.location === locationFilter : true)
            .filter(p => typeFilter !== 'all' ? p.type === typeFilter : true);
    }, [properties, searchTerm, locationFilter, typeFilter]);

    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);

    const handleCellClick = (property: Property, date: string) => {
        setSelectedProperty(property);
        setSelectedDateString(date);
    };
    
    const handleDateNav = (offset: number) => {
        setStartDate(current => {
            const newDate = new Date(current);
            if (view === 'month') {
                newDate.setMonth(newDate.getMonth() + offset);
            } else {
                newDate.setDate(newDate.getDate() + (offset * 7));
            }
            return newDate;
        })
    }
    
    const headerNavItems = user?.role === 'admin' ? [{
        id: 'admin',
        label: 'Admin',
        href: '#/admin'
    }] : [];

    return (
        <div className="bg-muted/40 dark:bg-background min-h-screen font-sans">
            <Header
                title="Pine Stays"
                subtitle={`Welcome, ${user?.name}`}
                navItems={headerNavItems}
            >
                 <span className="text-sm text-muted-foreground hidden md:block">
                    Updated: {lastUpdated ? `${Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)}s ago` : '...'}
                 </span>
                 <button onClick={fetchData} className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg hover:bg-accent transition-colors">
                    Refresh
                 </button>
            </Header>
            <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-6">
                <FilterBar
                    searchTerm={searchTerm} setSearchTerm={setSearchTerm}
                    locationFilter={locationFilter} setLocationFilter={setLocationFilter}
                    typeFilter={typeFilter} setTypeFilter={setTypeFilter}
                    view={view} setView={setView}
                    propertyCount={filteredProperties.length}
                    onClear={() => { setSearchTerm(''); setLocationFilter('all'); setTypeFilter('all'); }}
                    onDateNav={handleDateNav}
                    currentDate={startDate}
                    onDateChange={setStartDate}
                />
                <PropertyCalendarGrid
                    properties={filteredProperties}
                    dates={dates}
                    calendarData={calendarData}
                    onCellClick={handleCellClick}
                    loading={loading}
                />
            </main>
            {selectedProperty && (
                <PropertyDetailsModal
                    property={selectedProperty}
                    date={selectedDateString}
                    calendarEntry={selectedDateString ? calendarData.get(`${selectedProperty.id}-${selectedDateString}`) : undefined}
                    onClose={() => { setSelectedProperty(null); setSelectedDateString(null); }}
                />
            )}
        </div>
    );
};

interface FilterBarProps {
    searchTerm: string; setSearchTerm: (s: string) => void;
    locationFilter: Location | 'all'; setLocationFilter: (l: Location | 'all') => void;
    typeFilter: PropertyType | 'all'; setTypeFilter: (t: PropertyType | 'all') => void;
    view: 'month' | 'week'; setView: (v: 'month' | 'week') => void;
    propertyCount: number;
    onClear: () => void;
    onDateNav: (offset: number) => void;
    currentDate: Date;
    onDateChange: (date: Date) => void;
}
const FilterBar: React.FC<FilterBarProps> = (props) => {
    const { searchTerm, setSearchTerm, locationFilter, setLocationFilter, typeFilter, setTypeFilter, view, setView, propertyCount, onClear, onDateNav, currentDate, onDateChange } = props;
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const datePickerToggleRef = useRef<HTMLButtonElement>(null);
    const baseInputClass = "w-full border-input bg-background rounded-lg shadow-sm focus:ring-ring focus:border-ring text-sm py-2.5";
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (
                isDatePickerOpen &&
                datePickerRef.current && !datePickerRef.current.contains(event.target as Node) &&
                datePickerToggleRef.current && !datePickerToggleRef.current.contains(event.target as Node)
            ) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isDatePickerOpen]);

    const DatePicker = () => {
        const [viewDate, setViewDate] = useState(currentDate);

        const handleDateSelect = (day: number) => {
            const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
            onDateChange(newDate);
            setIsDatePickerOpen(false);
        }

        const changeMonth = (offset: number) => {
            setViewDate(d => {
                const newD = new Date(d);
                newD.setMonth(d.getMonth() + offset);
                return newD;
            })
        }

        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = new Date(year, month, 1).getDay(); // 0=Sun, 1=Mon...
        const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
        const blanks = Array.from({length: firstDayOfMonth}, (_, i) => i);
        const weekDays = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

        return (
            <div ref={datePickerRef} className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-card border border-border rounded-lg shadow-xl p-3 z-20 animate-fade-in w-72">
                <div className="flex justify-between items-center mb-2">
                    <button onClick={() => changeMonth(-1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">&lt;</button>
                    <span className="font-semibold text-foreground">{viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                    <button onClick={() => changeMonth(1)} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground">&gt;</button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                    {weekDays.map(d => <div key={d} className="w-8 h-8 flex items-center justify-center">{d}</div>)}
                </div>
                <div className="grid grid-cols-7 gap-1 mt-1">
                    {blanks.map((b, index) => <div key={`b-${index}`}></div>)}
                    {days.map(day => (
                        <button 
                            key={day} 
                            onClick={() => handleDateSelect(day)}
                            className={`p-1.5 rounded-full text-sm aspect-square w-8 h-8 flex items-center justify-center transition-colors ${
                                currentDate.getFullYear() === year && currentDate.getMonth() === month && currentDate.getDate() === day
                                ? 'bg-primary text-primary-foreground font-semibold'
                                : 'hover:bg-accent'
                            }`}
                        >{day}</button>
                    ))}
                </div>
            </div>
        );
    };

    const FilterControls = () => (
      <div className="space-y-4">
          <input type="text" placeholder="Search properties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${baseInputClass} px-3`}/>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value as any)} className={`${baseInputClass} px-3`}>
              <option value="all">All Locations</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={`${baseInputClass} px-3`}>
              <option value="all">All Types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { onClear(); setIsFilterOpen(false); }} className="w-full text-sm text-center py-2.5 text-primary bg-primary/10 rounded-lg hover:bg-primary/20">Clear Filters</button>
      </div>
    );

    return (
        <div className="bg-card p-3 rounded-xl shadow-lg mb-4 sm:mb-6 border border-border">
            <div className="flex flex-wrap items-center justify-between gap-3">
                 <div className="flex-1 min-w-0 hidden md:block">
                     <input type="text" placeholder="Search properties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${baseInputClass} pl-4`}/>
                 </div>
                 <div className="flex items-center space-x-1 sm:space-x-2 flex-grow sm:flex-grow-0 justify-center">
                    <button onClick={() => onDateNav(-1)} className="p-2.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">&lt;</button>
                    <div className="relative">
                        <button
                            ref={datePickerToggleRef}
                            onClick={() => setIsDatePickerOpen(prev => !prev)}
                            className="font-bold text-foreground text-base sm:text-lg px-2 py-2.5 rounded-lg hover:bg-muted transition-colors text-center w-40 sm:w-56 flex items-center justify-center gap-x-2"
                        >
                            <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                            <span className="truncate">{currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric'})}</span>
                        </button>
                        {isDatePickerOpen && <DatePicker />}
                    </div>
                    <button onClick={() => onDateNav(1)} className="p-2.5 rounded-full hover:bg-muted text-muted-foreground transition-colors">&gt;</button>
                </div>
                <div className="flex items-center gap-x-3 w-full sm:w-auto">
                    <div className="md:hidden flex-1">
                         <button onClick={() => setIsFilterOpen(true)} className="w-full flex items-center justify-center gap-x-2 text-left px-4 py-2.5 bg-secondary rounded-lg text-sm font-semibold text-secondary-foreground">
                            <FunnelIcon className="w-5 h-5"/>
                            <span>Filters ({propertyCount})</span>
                         </button>
                    </div>
                    <div className="p-1 bg-secondary rounded-lg flex-shrink-0">
                        <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Month</button>
                        <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Week</button>
                    </div>
                </div>
            </div>
            {/* Mobile Filter Slide-over */}
            <div className={`fixed inset-0 z-40 transition-opacity duration-300 ${isFilterOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFilterOpen(false)}>
                <div className="absolute inset-0 bg-black/50"></div>
                <div className={`absolute top-0 right-0 h-full bg-card border-l border-border p-4 shadow-2xl w-full max-w-sm transition-transform duration-300 ease-in-out ${isFilterOpen ? 'translate-x-0' : 'translate-x-full'}`} onClick={e => e.stopPropagation()}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold">Filters</h3>
                        <button onClick={() => setIsFilterOpen(false)} className="p-2 -m-2 rounded-full hover:bg-muted"><XMarkIcon className="w-6 h-6"/></button>
                    </div>
                    <FilterControls />
                </div>
            </div>
        </div>
    );
};

interface PropertyCalendarGridProps {
    properties: Property[];
    dates: Date[];
    calendarData: Map<string, CalendarEntry>;
    onCellClick: (property: Property, date: string) => void;
    loading: boolean;
}
const PropertyCalendarGrid: React.FC<PropertyCalendarGridProps> = ({ properties, dates, calendarData, onCellClick, loading }) => {
    if(properties.length === 0 && !loading) return <div className="text-center py-16 bg-card rounded-xl shadow-lg border border-border"><h3 className="text-xl font-semibold text-foreground">No properties match your filters.</h3></div>;

    return (
        <div className="bg-card rounded-xl shadow-lg overflow-hidden relative border border-border">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="text-xs text-muted-foreground">
                        <tr className="bg-muted/50">
                            <th className="sticky left-0 bg-card z-10 p-2 border-r border-b border-border w-32 sm:w-40 min-w-[128px] sm:min-w-[160px] text-left font-semibold text-foreground">Property</th>
                            {dates.map(date => (
                                <th key={date.toISOString()} className="p-2 border-b border-border text-center font-medium">
                                    <div className={`min-w-[50px] sm:min-w-[60px] ${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary' : ''}`}>
                                        <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div className="text-base sm:text-lg font-semibold">{date.getDate()}</div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {properties.map(prop => (
                            <tr key={prop.id}>
                                <td className="sticky left-0 bg-card hover:bg-muted/50 z-10 p-2 border-r border-b border-border font-bold w-32 sm:w-40 min-w-[128px] sm:min-w-[160px] cursor-pointer text-teal-600 dark:text-teal-400 hover:opacity-80 transition-opacity" onClick={() => onCellClick(prop, formatDate(dates[0]))}>{prop.name}</td>
                                {dates.map(date => {
                                    const dateStr = formatDate(date);
                                    const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                    const status = entry?.status || 'available';
                                    const price = entry?.price ?? prop.basePrice;
                                    const statusText = status === 'owner' ? 'Booked O' : status;
                                    return (
                                        <td key={dateStr} className={`border-b border-border text-center cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-ring hover:z-20 ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`} onClick={() => onCellClick(prop, dateStr)}>
                                            <div className="py-2 px-1 font-semibold text-xs sm:text-sm">
                                                {status === 'available' ? `₹${(price/1000).toFixed(0)}k` : <span className="capitalize">{statusText}</span>}
                                            </div>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {loading && <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary"></div></div>}
            </div>
             <div className="p-3 bg-muted/50 border-t border-border flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {Object.entries(STATUS_COLORS).map(([status, colors]) => (
                    <div key={status} className="flex items-center space-x-1.5">
                        <span className={`w-3 h-3 rounded-full ${colors.bg} ${colors.border} border`}></span>
                        <span className="capitalize">{status === 'owner' ? 'Booked O' : status}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};


interface PropertyDetailsModalProps {
    property: Property;
    date: string | null;
    calendarEntry?: CalendarEntry;
    onClose: () => void;
}
const PropertyDetailsModal: React.FC<PropertyDetailsModalProps> = ({ property, date, calendarEntry, onClose }) => {
    const [copied, setCopied] = useState(false);
    
    const handleCopy = () => {
        const poolText = property.poolType === 'none' ? 'No' : `${property.poolType.charAt(0).toUpperCase() + property.poolType.slice(1)} Pool`;
        
        const extraGuestText = property.extraGuestCost && property.extraGuestCost > 0 
            ? `₹${property.extraGuestCost.toLocaleString('en-IN')}/person` 
            : 'NA';
            
        const securityDepositText = property.securityDeposit && property.securityDeposit > 0 
            ? `₹${property.securityDeposit.toLocaleString('en-IN')}` 
            : 'NA';
    
        const amenitiesText = property.amenities.length > 0 ? property.amenities.join(', ') : 'NA';
        const rulesText = property.houseRules ? `\n${property.houseRules}` : '\nNA';
        
        const photoLinkText = property.photoLink || 'NA';
        const pdfLinkText = property.pdfLink || 'NA';
        const videoLinkText = property.videoLink || 'NA';
        const menuCardLinkText = property.menuCardLink || 'NA';
    
        const textToCopy = `*Property Details: ${property.name}*
---------------------------------
Property Code: ${property.propertyCode}
Location: ${property.location}
Type: ${property.type}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Swimming Pool: ${poolText}
Area: ${property.area}
Base Occupancy: ${property.capacity}
Max Occupancy: ${property.maxCapacity}
---------------------------------
*Pricing*
Tariff (Base Price): ₹${property.basePrice.toLocaleString('en-IN')}/night
Extra Guest Cost: ${extraGuestText}
Refundable Security Deposit: ${securityDepositText}
---------------------------------
*Amenities*
${amenitiesText}
---------------------------------
*Links*
Photos: ${photoLinkText}
PDF Brochure: ${pdfLinkText}
Video: ${videoLinkText}
Menu Card: ${menuCardLinkText}
---------------------------------
*House Rules*${rulesText}`
.trim().replace(/^\s+/gm, '');
    
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const priceForDate = calendarEntry?.price ?? property.basePrice;
    const statusForDate = calendarEntry?.status ?? 'available';
    const statusText = statusForDate === 'owner' ? 'Booked O' : statusForDate;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-0 backdrop-blur-sm animate-fade-in">
            <div className="bg-card w-full h-full sm:w-full sm:max-w-4xl sm:h-auto sm:max-h-[90vh] flex flex-col sm:rounded-2xl shadow-2xl border border-border">
                <div className="relative h-48 sm:h-64 flex-shrink-0 bg-muted/50">
                    {property.photoLink ? (
                        <img src={property.photoLink} alt={property.name} className="object-cover w-full h-full sm:rounded-t-2xl" />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground sm:rounded-t-2xl">
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="mt-2 text-sm">No image available</span>
                        </div>
                    )}
                    <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-1.5 hover:bg-black/60 transition"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-4 sm:p-6 flex flex-col overflow-y-auto flex-grow">
                    <div className="flex-grow">
                        <h2 className="text-2xl sm:text-3xl font-bold mb-1 text-foreground">{property.name}</h2>
                        <p className="text-sm text-muted-foreground mb-4">{property.type} &middot; {property.location}</p>
                        
                        {property.description && <p className="text-foreground/80 text-sm mb-4">{property.description}</p>}

                        <div className="bg-muted/50 p-4 rounded-xl border border-border">
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="text-muted-foreground">Code</div><div className="font-semibold text-foreground truncate">{property.propertyCode}</div>
                                <div className="text-muted-foreground">Bed/Bath</div><div className="font-semibold text-foreground">{property.bedrooms}BR / {property.bathrooms}BA</div>
                                <div className="text-muted-foreground">Area</div><div className="font-semibold text-foreground">{property.area}</div>
                                <div className="text-muted-foreground">Pool</div><div className="font-semibold text-foreground capitalize">{property.poolType === 'none' ? 'No' : property.poolType}</div>
                                <div className="text-muted-foreground">Guests</div><div className="font-semibold text-foreground">{property.capacity} / {property.maxCapacity}</div>
                                {property.extraGuestCost && property.extraGuestCost > 0 &&
                                    <><div className="text-muted-foreground">Extra Guest</div><div className="font-semibold text-foreground">₹{property.extraGuestCost.toLocaleString('en-IN')}/p</div></>
                                }
                                {property.securityDeposit && property.securityDeposit > 0 &&
                                     <><div className="text-muted-foreground">Deposit</div><div className="font-semibold text-foreground">₹{property.securityDeposit.toLocaleString('en-IN')}</div></>
                                }
                             </div>
                            <p className="text-sm text-muted-foreground mt-4">Base Price</p>
                            <p className="text-2xl font-bold text-foreground">₹{property.basePrice.toLocaleString('en-IN')}<span className="font-normal text-base text-muted-foreground">/night</span></p>
                            {date && (
                              <div className={`mt-2 p-2 rounded-lg text-sm font-medium ${STATUS_COLORS[statusForDate].bg} ${STATUS_COLORS[statusForDate].text}`}>
                                  Status for {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}: 
                                  <span className="font-bold ml-2 capitalize">{statusText}</span>
                                  {statusForDate === 'available' && <span className="font-bold"> at ₹{priceForDate.toLocaleString('en-IN')}</span>}
                              </div>
                            )}
                        </div>
                    </div>
                </div>
                <div className="p-4 sm:p-6 mt-auto border-t border-border flex flex-col gap-3 flex-shrink-0">
                    <div className="flex gap-3">
                        <a href={property.pdfLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-sm transition">View Brochure</a>
                        <button onClick={handleCopy} className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold transition">
                            {copied ? <CheckIcon className="w-5 h-5 text-primary"/> : <ClipboardIcon className="w-5 h-5"/>}
                            <span>{copied ? 'Copied!' : 'Copy Details'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentPortal;