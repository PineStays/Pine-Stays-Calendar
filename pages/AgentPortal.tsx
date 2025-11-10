import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Property, CalendarEntry, PropertyType, Location, CalendarStatus } from '../types';
import { db } from '../services/databaseService';
import { STATUS_COLORS, LOCATIONS, PROPERTY_TYPES, ClipboardIcon, CheckIcon, CloseIcon } from '../constants';

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

    return (
        <div className="bg-slate-50 min-h-screen font-sans">
            <Header onRefresh={fetchData} lastUpdated={lastUpdated} />
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

interface HeaderProps {
    onRefresh: () => void;
    lastUpdated: Date | null;
}
const Header: React.FC<HeaderProps> = ({ onRefresh, lastUpdated }) => {
    const [timeAgo, setTimeAgo] = useState('');
    
    useEffect(() => {
        const update = () => {
            if (lastUpdated) {
                const seconds = Math.floor((new Date().getTime() - lastUpdated.getTime()) / 1000);
                if (seconds < 5) setTimeAgo('just now');
                else if (seconds < 60) setTimeAgo(`${seconds}s ago`);
                else setTimeAgo(`${Math.floor(seconds / 60)}m ago`);
            }
        };
        update();
        const interval = setInterval(update, 5000);
        return () => clearInterval(interval);
    }, [lastUpdated]);
    
    return (
        <header className="bg-white shadow-sm sticky top-0 z-20">
            <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center h-16">
                <div>
                   <h1 className="text-2xl font-bold text-brand-600">Pine Stays</h1>
                </div>
                <div className="flex items-center space-x-2 sm:space-x-4">
                    <span className="text-sm text-slate-500 hidden md:block">Updated: {timeAgo}</span>
                    <button onClick={onRefresh} className="px-4 py-2 bg-brand-600 text-white text-sm font-semibold rounded-lg hover:bg-brand-700 transition shadow-sm">
                        Refresh
                    </button>
                    <Link to="/admin" className="px-4 py-2 text-slate-600 text-sm font-semibold rounded-lg hover:bg-slate-100 transition hidden sm:block">
                        Admin
                    </Link>
                </div>
            </div>
        </header>
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
    const baseInputClass = "w-full border-slate-300 rounded-lg shadow-sm focus:ring-brand-500 focus:border-brand-500 text-sm py-2.5";
    
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const date = new Date(e.target.value + 'T00:00:00');
        onDateChange(date);
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
          <button onClick={() => { onClear(); setIsFilterOpen(false); }} className="w-full text-sm text-center py-2 text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">Clear Filters</button>
      </div>
    );

    return (
        <div className="bg-white p-3 rounded-xl shadow-lg mb-6">
            {/* Mobile View: Collapsible Filters */}
            <div className="md:hidden">
              <div className="flex justify-between items-center">
                 <button onClick={() => setIsFilterOpen(true)} className="px-4 py-2.5 bg-slate-100 rounded-lg text-sm font-semibold text-slate-700">Filters ({propertyCount})</button>
                 <div className="p-1 bg-slate-100 rounded-lg">
                      <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-white shadow text-brand-600' : 'text-slate-600'}`}>Month</button>
                      <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-white shadow text-brand-600' : 'text-slate-600'}`}>Week</button>
                 </div>
              </div>
              {isFilterOpen && (
                 <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setIsFilterOpen(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-white p-4 rounded-t-2xl shadow-2xl animate-fade-in" onClick={e => e.stopPropagation()}>
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
                <button onClick={onClear} className="text-sm text-brand-600 hover:underline">Clear Filters</button>
                <span className="flex-grow"></span>
                 <span className="text-sm font-medium text-slate-500">{propertyCount} properties showing</span>
            </div>

            <div className="flex justify-between items-center border-t border-slate-200 mt-3 pt-3">
                 <div className="flex items-center space-x-1 sm:space-x-2">
                    <button onClick={() => onDateNav(-1)} className="p-2.5 rounded-md hover:bg-slate-100 text-slate-500">&lt;</button>
                    <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-700 text-base sm:text-lg">{currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                        <input type="date" value={formatDate(currentDate)} onChange={handleDateChange} className={`${baseInputClass.replace('w-full','')} p-1 text-xs`} aria-label="Jump to date" />
                    </div>
                    <button onClick={() => onDateNav(1)} className="p-2.5 rounded-md hover:bg-slate-100 text-slate-500">&gt;</button>
                 </div>
                 <div className="p-1 bg-slate-100 rounded-lg hidden md:block">
                    <button onClick={() => setView('month')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'month' ? 'bg-white shadow text-brand-600' : 'text-slate-600'}`}>Month</button>
                    <button onClick={() => setView('week')} className={`px-3 py-1 text-sm font-semibold rounded-md ${view === 'week' ? 'bg-white shadow text-brand-600' : 'text-slate-600'}`}>Week</button>
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
    if(properties.length === 0 && !loading) return <div className="text-center py-16 bg-white rounded-xl shadow-lg"><h3 className="text-xl font-semibold text-slate-700">No properties match your filters.</h3></div>;

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden relative">
             <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse">
                    <thead className="text-xs text-slate-500">
                        <tr className="bg-slate-50">
                            <th className="sticky left-0 bg-slate-50 z-10 p-2 border-r border-b border-slate-200 w-40 min-w-[160px] text-left font-semibold text-slate-700">Property</th>
                            {dates.map(date => (
                                <th key={date.toISOString()} className="p-2 border-b border-slate-200 text-center font-medium">
                                    <div className={`min-w-[60px] ${date.getDay() === 0 || date.getDay() === 6 ? 'text-brand-600' : ''}`}>
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
                                <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 p-2 border-r border-b border-slate-200 font-semibold w-40 min-w-[160px] cursor-pointer text-brand-700 hover:underline" onClick={() => onCellClick(prop, formatDate(dates[0]))}>{prop.name}</td>
                                {dates.map(date => {
                                    const dateStr = formatDate(date);
                                    const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                    const status = entry?.status || 'available';
                                    const price = entry?.price ?? prop.basePrice;
                                    const color = STATUS_COLORS[status];
                                    const statusText = status === 'owner' ? 'Booked O' : status;
                                    return (
                                        <td key={dateStr} className={`border-b border-slate-200 text-center cursor-pointer transition-all duration-150 hover:ring-2 hover:ring-brand-400 hover:z-20 ${color.bg} ${color.text}`} onClick={() => onCellClick(prop, dateStr)}>
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
                 {loading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-brand-500"></div></div>}
            </div>
             <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
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
            <div ref={modalRef} className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] flex flex-col md:flex-row overflow-hidden">
                <div className="w-full md:w-1/2 relative">
                    <img src={property.photoLink} alt={property.name} className="object-cover w-full h-64 md:h-full" />
                    <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 rounded-full p-2 hover:bg-black/60 transition"><CloseIcon className="w-5 h-5"/></button>
                </div>
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col overflow-y-auto">
                    <div className="flex-grow">
                        <h2 className="text-3xl font-bold mb-1 text-slate-800">{property.name}</h2>
                        <p className="text-sm text-slate-500 mb-6">{property.type} &middot; {property.bedrooms} BR / {property.bathrooms} BA &middot; Sleeps {property.capacity}-{property.maxCapacity}</p>
                        
                        {property.description && <p className="text-slate-600 text-sm mb-6">{property.description}</p>}

                        <h4 className="font-semibold mb-2 text-slate-700">Amenities</h4>
                        <div className="flex flex-wrap gap-2 mb-6">
                            {property.amenities.map(a => <span key={a} className="bg-brand-50 text-brand-800 text-xs font-medium px-2.5 py-1 rounded-full">{a}</span>)}
                        </div>

                        <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-200">
                             <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div className="text-slate-600">Property Code</div><div className="font-semibold text-slate-800">{property.propertyCode}</div>
                                <div className="text-slate-600">Area</div><div className="font-semibold text-slate-800">{property.area}</div>
                                <div className="text-slate-600">Pool</div><div className="font-semibold text-slate-800 capitalize">{property.poolType === 'none' ? 'No' : property.poolType}</div>
                             </div>
                            <p className="text-sm text-slate-600 mt-4">Base Price</p>
                            <p className="text-2xl font-bold text-slate-800">₹{property.basePrice.toLocaleString('en-IN')}<span className="font-normal text-base text-slate-500">/night</span></p>
                            {date && (
                              <div className={`mt-2 p-2 rounded-lg text-sm font-medium ${STATUS_COLORS[statusForDate].bg} ${STATUS_COLORS[statusForDate].text}`}>
                                  Status for {new Date(date + 'T00:00:00').toLocaleDateString('en-US', {month: 'short', day: 'numeric'})}: 
                                  <span className="font-bold ml-2 capitalize">{statusText}</span>
                                  {statusForDate === 'available' && <span className="font-bold"> at ₹{priceForDate.toLocaleString('en-IN')}</span>}
                              </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="mt-auto pt-6 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
                        <a href={property.pdfLink} target="_blank" rel="noopener noreferrer" className="flex-1 text-center px-4 py-3 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-semibold shadow-sm transition">View Brochure</a>
                        <button onClick={handleCopy} className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-semibold transition">
                            {copied ? <CheckIcon className="w-5 h-5 text-brand-600"/> : <ClipboardIcon className="w-5 h-5"/>}
                            <span>{copied ? 'Copied!' : 'Copy Details'}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AgentPortal;