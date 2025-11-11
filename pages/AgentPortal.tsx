import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Property, CalendarEntry, PropertyType, Location } from '../types';
import { db } from '../services/databaseService';
import { STATUS_COLORS, LOCATIONS, PROPERTY_TYPES } from '../constants';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../Header';
import { ClipboardIcon, CheckIcon, XMarkIcon } from '../Icons';

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
        <div className="bg-background min-h-screen font-sans">
            <Header
                title="Pine Stays"
                subtitle={`Welcome, ${user?.name}`}
                navItems={headerNavItems}
            >
                 <span className="text-sm text-muted-foreground hidden md:block">
                    Updated: {lastUpdated ? `${Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000)}s ago` : '...'}
                 </span>
                 <button onClick={fetchData} className="px-4 py-2 bg-secondary text-secondary-foreground text-sm font-semibold rounded-lg hover:bg-accent transition">
                    Refresh
                 </button>
            </Header>
            <main className="max-w-full mx-auto px-2 sm:px-4 lg:px-6 py-6">
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
          <input type="text" placeholder="Search properties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={baseInputClass}/>
          <select value={locationFilter} onChange={e => setLocationFilter(e.target.value as any)} className={baseInputClass}>
              <option value="all">All Locations</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={baseInputClass}>
              <option value="all">All Types</option>
              {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={() => { onClear(); setIsFilterOpen(false); }} className="w-full text-sm text-center py-2 text-primary bg-primary/10 rounded-lg hover:bg-primary/20">Clear Filters</button>
      </div>
    );

    return (
        <div className="bg-card p-3 rounded-xl shadow-lg mb-6 border border-border">
            {/* Mobile View: Collapsible Filters */}
            <div className="md:hidden">
              <div className="flex justify-between items-center">
                 <button onClick={() => setIsFilterOpen(true)} className="px-4 py-2.5 bg-secondary rounded-lg text-sm font-semibold text-secondary-foreground">Filters ({propertyCount})</button>
                 <div className="p-1 bg-secondary rounded-lg">
                      <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Month</button>
                      <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Week</button>
                 </div>
              </div>
              {isFilterOpen && (
                 <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsFilterOpen(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-card border-t border-border p-4 rounded-t-2xl shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
                       <h3 className="text-lg font-bold mb-4">Filters</h3>
                       <FilterControls />
                    </div>
                 </div>
              )}
            </div>

            {/* Desktop View: Expanded Filters */}
            <div className="hidden md:flex flex-wrap items-center gap-x-4 gap-y-2">
                 <input type="text" placeholder="Search properties..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={baseInputClass.replace('w-full', '')}/>
                <select value={locationFilter} onChange={e => setLocationFilter(e.target.value as any)} className={baseInputClass.replace('w-full', '')}>
                    <option value="all">All Locations</option>
                    {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <select value={typeFilter} onChange={e => setTypeFilter(e.target.value as any)} className={baseInputClass.replace('w-full', '')}>
                    <option value="all">All Types</option>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                <button onClick={onClear} className="text-sm text-primary hover:underline">Clear Filters</button>
                <span className="flex-grow"></span>
                 <span className="text-sm font-medium text-muted-foreground">{propertyCount} properties showing</span>
            </div>

            <div className="flex justify-between items-center border-t border-border mt-3 pt-3">
                 <div className="flex items-center space-x-1 sm:space-x-2">
                    <button onClick={() => onDateNav(-1)} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&lt;</button>
                    <div className="relative">
                        <button
                            ref={datePickerToggleRef}
                            onClick={() => setIsDatePickerOpen(prev => !prev)}
                            className="font-semibold text-foreground text-base sm:text-lg px-4 py-2 rounded-lg hover:bg-muted transition-colors text-center w-48"
                        >
                            {currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric'})}
                        </button>
                        {isDatePickerOpen && <DatePicker />}
                    </div>
                    <button onClick={() => onDateNav(1)} className="p-2.5 rounded-md hover:bg-muted text-muted-foreground">&gt;</button>
                 </div>
                 <div className="p-1 bg-secondary rounded-lg hidden md:block">
                    <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Month</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-card shadow text-primary' : 'text-muted-foreground'}`}>Week</button>
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
                            <th className="sticky left-0 bg-card z-10 p-2 border-r border-b border-border w-40 min-w-[160px] text-left font-semibold text-foreground">Property</th>
                            {dates.map(date => (
                                <th key={date.toISOString()} className="p-2 border-b border-border text-center font-medium">
                                    <div className={`min-w-[60px] ${date.getDay() === 0 || date.getDay() === 6 ? 'text-primary' : ''}`}>
                                        <div>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                        <div className="text-lg font-semibold">{date.getDate()}</div>
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="text-xs">
                        {properties.map(prop => (
                            <tr key={prop.id}>
                                <td className="sticky left-0 bg-card hover:bg-muted/50 z-10 p-2 border-r border-b border-border font-semibold w-40 min-w-[160px] cursor-pointer text-primary hover:underline" onClick={() => onCellClick(prop, formatDate(dates[0]))}>{prop.name}</td>
                                {dates.map(date => {
                                    const dateStr = formatDate(date);
                                    const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                    const status = entry?.status || 'available';
                                    const price = entry?.price ?? prop.basePrice;
                                    const statusText = status === 'owner' ? 'Booked O' : status;
                                    return (
                                        <td key={dateStr} className={`border-b border-border text-center cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-ring hover:z-20 ${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].text}`} onClick={() => onCellClick(prop, dateStr)}>
                                            <div className="py-2 px-1 font-semibold">
                                                {status === 'available' ? `₹${price.toLocaleString('en-IN')}` : <span className="capitalize">{statusText}</span>}
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
    const modalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [onClose]);

    const handleCopy = () => {
        const poolText = property.poolType === 'none' ? 'No' : `${property.poolType.charAt(0).toUpperCase() + property.poolType.slice(1)} Pool`;
        const extraGuestText = property.extraGuestCost ? `\nExtra Guest Cost: ₹${property.extraGuestCost.toLocaleString('en-IN')}/person` : '';
        
        const textToCopy = `
Property Code: ${property.propertyCode}
Name: ${property.name}
Bedrooms: ${property.bedrooms}
Bathrooms: ${property.bathrooms}
Swimming Pool: ${poolText}
Area: ${property.area}
Base Occupancy: ${property.capacity}
Max Occupancy: ${property.maxCapacity}
Tariff (Base Price): ₹${property.basePrice.toLocaleString('en-IN')}/night${extraGuestText}
        `.trim().replace(/^\s+/gm, '');
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    
    const priceForDate = calendarEntry?.price ?? property.basePrice;
    const statusForDate = calendarEntry?.status ?? 'available';
    const statusText = statusForDate === 'owner' ? 'Booked O' : statusForDate;

    return (
        <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-0 sm:p-4 backdrop-blur-sm animate-fade-in">
            <div ref={modalRef} className="bg-card border border-border rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/2 relative">
                    <img src={property.photoLink} alt={property.name} className="object-cover w-full h-64 md:h-full" />
                    <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"><XMarkIcon className="w-5 h-5"/></button>
                </div>
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                    <div className="flex-grow">
                        <h2 className="text-3xl font-bold mb-1 text-foreground">{property.name}</h2>
                        <p className="text-sm text-muted-foreground mb-6">{property.type} &middot; {property.bedrooms} BR / {property.bathrooms} BA &middot; Sleeps {property.capacity}-{property.maxCapacity}</p>
                        
                        {property.description && <p className="text-foreground/80 text-sm mb-6">{property.description}</p>}

                        <h4 className="font-semibold mb-2 text-foreground">Amenities</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {property.amenities.map(a => <span key={a} className="bg-primary/10 text-primary text-xs font-medium px-2.5 py-1 rounded-full">{a}</span>)}
                        </div>

                        {property.houseRules && (
                            <>
                                <h4 className="font-semibold mb-2 text-foreground mt-6">House Rules</h4>
                                <p className="text-muted-foreground text-sm mb-6 whitespace-pre-wrap">{property.houseRules}</p>
                            </>
                        )}

                        <div className="bg-muted/50 p-4 rounded-xl mb-4 border border-border">
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="text-muted-foreground">Property Code</div><div className="font-semibold text-foreground">{property.propertyCode}</div>
                                <div className="text-muted-foreground">Area</div><div className="font-semibold text-foreground">{property.area}</div>
                                <div className="text-muted-foreground">Pool</div><div className="font-semibold text-foreground capitalize">{property.poolType === 'none' ? 'No' : property.poolType}</div>
                                <div className="text-muted-foreground">Base / Max Guests</div><div className="font-semibold text-foreground">{property.capacity} / {property.maxCapacity}</div>
                                {property.extraGuestCost && property.extraGuestCost > 0 ? (
                                    <>
                                        <div className="text-muted-foreground">Extra Guest Cost</div>
                                        <div className="font-semibold text-foreground">₹{property.extraGuestCost.toLocaleString('en-IN')}/person</div>
                                    </>
                                ) : null}
                                {property.securityDeposit && property.securityDeposit > 0 ? (
                                    <>
                                        <div className="text-muted-foreground">Security Deposit</div>
                                        <div className="font-semibold text-foreground">₹{property.securityDeposit.toLocaleString('en-IN')}</div>
                                    </>
                                ) : null}
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
                    
                    <div className="mt-auto pt-6 flex flex-col gap-3">
                        <div className="flex gap-3">
                            <a href={property.pdfLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-semibold shadow-sm transition">View Brochure</a>
                            <button onClick={handleCopy} className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold transition">
                                {copied ? <CheckIcon className="w-5 h-5 text-primary"/> : <ClipboardIcon className="w-5 h-5"/>}
                                <span>{copied ? 'Copied!' : 'Copy Details'}</span>
                            </button>
                        </div>
                        {(property.videoLink || property.menuCardLink) && (
                            <div className="flex gap-3">
                                {property.videoLink && <a href={property.videoLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold transition">Watch Video</a>}
                                {property.menuCardLink && <a href={property.menuCardLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-3 bg-secondary text-secondary-foreground rounded-lg hover:bg-accent font-semibold transition">View Menu</a>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentPortal;