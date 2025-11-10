import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { GoogleGenAI } from '@google/genai';
import { Property, CalendarEntry, CalendarStatus, Amenity } from '../types';
import { db } from '../services/databaseService';
import { useAuth } from '../hooks/useAuth';
import { AMENITIES, LOCATIONS, PROPERTY_TYPES, STATUS_COLORS, STATUSES, SparklesIcon, CalendarIcon } from '../constants';

const formatDate = (date: Date) => date.toISOString().split('T')[0];
const getDatesInRange = (startDate: Date, days: number) => {
    return Array.from({ length: days }, (_, i) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        return date;
    });
};
const baseInputClass = "w-full border border-slate-300 rounded-lg shadow-sm px-3 py-2.5 text-sm leading-snug bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100";
const baseButtonClass = "px-5 py-2.5 rounded-lg font-semibold text-sm shadow-sm transition-colors disabled:opacity-50";

interface SelectionEditorProps {
    selectedCellCount: number;
    onApply: (action: any) => Promise<void>;
    onClear: () => void;
}

const SelectionEditor: React.FC<SelectionEditorProps> = ({ selectedCellCount, onApply, onClear }) => {
    const [action, setAction] = useState<'setStatus' | 'setPrice' | 'adjustPrice'>('setStatus');
    const [status, setStatus] = useState<CalendarStatus>('available');
    const [price, setPrice] = useState(0);
    const [percentage, setPercentage] = useState(0);
    const [loading, setLoading] = useState(false);

    const handleApply = async () => {
        let updateAction: any;
        if (action === 'setStatus') updateAction = { type: 'setStatus', status };
        if (action === 'setPrice') updateAction = { type: 'setPrice', price };
        if (action === 'adjustPrice') updateAction = { type: 'adjustPrice', percentage };
        
        setLoading(true);
        await onApply(updateAction);
        setLoading(false);
    };

    if (selectedCellCount === 0) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-2 sm:bottom-4 sm:left-1/2 sm:-translate-x-1/2 sm:w-full sm:max-w-4xl sm:p-0">
            <div className="bg-white/80 backdrop-blur-lg rounded-xl shadow-2xl border border-slate-200 p-4 space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="font-bold text-slate-800">{selectedCellCount} Dates Selected</h3>
                    <button onClick={onClear} className="text-sm font-semibold text-brand-600 hover:text-brand-800">Clear</button>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                    <select value={action} onChange={e => setAction(e.target.value as any)} className={`${baseInputClass} flex-grow`}>
                        <option value="setStatus">Set Status</option>
                        <option value="setPrice">Set Absolute Price</option>
                        <option value="adjustPrice">Adjust Price by %</option>
                    </select>
                    {action === 'setStatus' && (
                        <select value={status} onChange={e => setStatus(e.target.value as any)} className={`${baseInputClass} flex-grow`}>
                            {STATUSES.map(s => <option key={s} value={s} className="capitalize">{s === 'owner' ? 'Booked O' : s}</option>)}
                        </select>
                    )}
                    {action === 'setPrice' && (
                        <input type="number" value={price} onChange={e => setPrice(Number(e.target.value))} placeholder="e.g. 25000" className={`${baseInputClass} flex-grow`} />
                    )}
                    {action === 'adjustPrice' && (
                        <input type="number" value={percentage} onChange={e => setPercentage(Number(e.target.value))} placeholder="e.g. 20 for +20%" className={`${baseInputClass} flex-grow`} />
                    )}
                    <button onClick={handleApply} disabled={loading} className={`${baseButtonClass} bg-brand-600 text-white hover:bg-brand-700 w-full sm:w-auto`}>
                        {loading ? 'Applying...' : 'Apply Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};


interface CalendarManagementProps {
    properties: Property[];
}

const CalendarManagement: React.FC<CalendarManagementProps> = ({ properties }) => {
    const [startDate, setStartDate] = useState(new Date());
    const [calendarEntries, setCalendarEntries] = useState<CalendarEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCells, setSelectedCells] = useState<{ propertyId: string; date: string }[]>([]);
    
    const dates = useMemo(() => getDatesInRange(startDate, 30), [startDate]);

    const fetchCalendarData = useCallback(async () => {
        setLoading(true);
        if (dates.length === 0) return;
        const start = formatDate(dates[0]);
        const end = formatDate(dates[dates.length - 1]);
        const entries = await db.getCalendarEntries(start, end);
        setCalendarEntries(entries);
        setLoading(false);
    }, [dates]);

    useEffect(() => {
        fetchCalendarData();
    }, [fetchCalendarData]);
    
    const activeProperties = useMemo(() => properties.filter(p => p.status === 'active'), [properties]);

    const calendarData = useMemo(() => {
        const map = new Map<string, CalendarEntry>();
        calendarEntries.forEach(entry => map.set(`${entry.propertyId}-${entry.date}`, entry));
        return map;
    }, [calendarEntries]);

    const handleCellSelect = (propertyId: string, date: string) => {
        setSelectedCells(prev => {
            const key = `${propertyId}-${date}`;
            const index = prev.findIndex(c => `${c.propertyId}-${c.date}` === key);
            if (index > -1) {
                return [...prev.slice(0, index), ...prev.slice(index + 1)];
            } else {
                return [...prev, { propertyId, date }];
            }
        });
    };

    const handleBulkUpdate = async (action: any) => {
        if (selectedCells.length === 0) return;
        await db.bulkUpdateCells(selectedCells, action);
        setSelectedCells([]);
        fetchCalendarData();
    };

    return (
        <div className="space-y-8">
            <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-4 gap-4">
                     <h2 className="text-xl font-bold text-slate-800">Availability Calendar</h2>
                      <div className="flex items-center space-x-1 self-end">
                        <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() - 1, 1))} className="p-2.5 rounded-md hover:bg-slate-100 text-slate-500">&lt;</button>
                        <span className="font-semibold text-slate-700 text-lg w-36 text-center">{startDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric'})}</span>
                        <button onClick={() => setStartDate(d => new Date(d.getFullYear(), d.getMonth() + 1, 1))} className="p-2.5 rounded-md hover:bg-slate-100 text-slate-500">&gt;</button>
                     </div>
                </div>
                <div className="overflow-x-auto relative custom-scrollbar">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="sticky left-0 bg-slate-100 z-10 p-2 border border-slate-200 w-40 min-w-[160px] text-left text-sm font-semibold text-slate-700">Property</th>
                                {dates.map(date => (
                                    <th key={date.toISOString()} className="p-2 border border-slate-200 text-center text-xs font-semibold text-slate-600">
                                        <div className="min-w-[70px]">
                                          <div className={`${date.getDay() === 0 || date.getDay() === 6 ? 'text-brand-600 font-bold' : ''}`}>{date.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                          <div>{date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' })}</div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {activeProperties.map(prop => (
                                <tr key={prop.id} className="hover:bg-slate-50">
                                    <td className="sticky left-0 bg-white hover:bg-slate-50 z-10 p-2 border border-slate-200 font-semibold text-slate-800 w-40 min-w-[160px]">{prop.name}</td>
                                    {dates.map(date => {
                                        const dateStr = formatDate(date);
                                        const entry = calendarData.get(`${prop.id}-${dateStr}`);
                                        const status = entry?.status || 'available';
                                        const price = entry?.price ?? prop.basePrice;
                                        const color = STATUS_COLORS[status];
                                        const isSelected = selectedCells.some(c => c.propertyId === prop.id && c.date === dateStr);
                                        const statusText = status === 'owner' ? 'Booked O' : status;
                                        return (
                                            <td key={dateStr} className={`border border-slate-200 text-center cursor-pointer transition-shadow ${color.bg} ${color.text} ${isSelected ? 'ring-2 ring-blue-500 ring-offset-1 z-10' : 'hover:shadow-md'}`} onClick={() => handleCellSelect(prop.id, dateStr)}>
                                                <div className="p-1 font-medium">
                                                    {price > 0 ? `₹${price.toLocaleString('en-IN', {maximumFractionDigits: 0})}` : <span className="capitalize text-xs">{statusText}</span>}
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {loading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-500"></div></div>}
                </div>
            </div>
            <SelectionEditor selectedCellCount={selectedCells.length} onApply={handleBulkUpdate} onClear={() => setSelectedCells([])} />
        </div>
    );
};

interface PropertyManagementProps {
    properties: Property[];
    refreshProperties: () => void;
}

const PropertyManagement: React.FC<PropertyManagementProps> = ({ properties, refreshProperties }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProperty, setEditingProperty] = useState<Property | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isIcalModalOpen, setIsIcalModalOpen] = useState(false);
    const [icalProperty, setIcalProperty] = useState<Property | null>(null);

    const filteredProperties = useMemo(() => {
        return properties.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [properties, searchTerm]);

    const handleSave = () => {
        setIsModalOpen(false);
        refreshProperties();
    };
    
    const handleIcalImport = async (propertyId: string) => {
        await db.mockIcalImport(propertyId);
        setIsIcalModalOpen(false);
        alert('iCal calendar synced successfully! The calendar view has been updated.');
        refreshProperties();
    };

    return (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-lg">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">
                <h2 className="text-xl font-bold text-slate-800">Manage Properties</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                    <input type="text" placeholder="Search properties..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className={`${baseInputClass} w-full sm:w-auto`} />
                    <button onClick={() => { setEditingProperty(null); setIsModalOpen(true); }} className={`flex-shrink-0 ${baseButtonClass} bg-brand-600 text-white hover:bg-brand-700`}>Add New</button>
                </div>
            </div>

            {/* Mobile Card View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredProperties.map(prop => (
                    <div key={prop.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-3">
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="font-bold text-slate-800">{prop.name}</h3>
                                <p className="text-sm text-slate-500">{prop.location}</p>
                            </div>
                             <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${prop.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                {prop.status}
                            </span>
                        </div>
                        <div className="flex space-x-4 justify-end border-t border-slate-200 pt-3">
                            <button onClick={() => { setIcalProperty(prop); setIsIcalModalOpen(true); }} className="font-medium text-sm text-brand-600 hover:underline">iCal Sync</button>
                            <button onClick={() => { setEditingProperty(prop); setIsModalOpen(true); }} className="font-medium text-sm text-brand-600 hover:underline">Edit</button>
                            <button onClick={async () => { if (window.confirm("Delete this property?")) { await db.deleteProperty(prop.id); refreshProperties(); }}} className="font-medium text-sm text-rose-600 hover:underline">Delete</button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="overflow-x-auto hidden md:block">
                <table className="w-full text-sm text-left text-slate-500">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Name</th>
                            <th scope="col" className="px-6 py-3">Location</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProperties.map(prop => (
                            <tr key={prop.id} className="bg-white border-b hover:bg-slate-50">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{prop.name}</th>
                                <td className="px-6 py-4">{prop.location}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${prop.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                                        {prop.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 flex space-x-4 justify-end">
                                    <button onClick={() => { setIcalProperty(prop); setIsIcalModalOpen(true); }} className="font-medium text-brand-600 hover:underline">iCal Sync</button>
                                    <button onClick={() => { setEditingProperty(prop); setIsModalOpen(true); }} className="font-medium text-brand-600 hover:underline">Edit</button>
                                    <button onClick={async () => { if (window.confirm("Delete this property?")) { await db.deleteProperty(prop.id); refreshProperties(); }}} className="font-medium text-rose-600 hover:underline">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {isModalOpen && <PropertyFormModal property={editingProperty} onClose={() => setIsModalOpen(false)} onSave={handleSave} />}
             {isIcalModalOpen && icalProperty && <IcalImportModal property={icalProperty} onClose={() => setIsIcalModalOpen(false)} onImport={handleIcalImport} />}
        </div>
    );
};

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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg">
                <div className="flex items-start justify-between">
                     <h2 className="text-xl font-bold text-slate-800">Sync iCal Calendar</h2>
                     <CalendarIcon className="w-8 h-8 text-slate-400" />
                </div>
                <p className="text-sm text-slate-600 mt-2">For <span className="font-semibold">{property.name}</span></p>
                
                <p className="mt-4 text-sm bg-slate-50 p-3 rounded-lg border border-slate-200">
                    Paste an iCal link from Airbnb, VRBO, or another platform to automatically block booked dates. This is a one-way sync.
                </p>

                <div className="mt-4">
                    <label htmlFor="ical-url" className="block text-sm font-medium text-slate-700">Calendar URL (.ics)</label>
                    <input 
                        id="ical-url"
                        type="url" 
                        value={url} 
                        onChange={e => setUrl(e.target.value)} 
                        placeholder="https://www.airbnb.com/calendar/ical/..."
                        className={`mt-1 ${baseInputClass}`}
                    />
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                    <button onClick={onClose} className={`${baseButtonClass} bg-slate-200 text-slate-800 hover:bg-slate-300`}>Cancel</button>
                    <button onClick={handleImport} disabled={loading || !url} className={`${baseButtonClass} bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300`}>
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
    onClose: () => void;
    onSave: () => void;
}

const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ property, onClose, onSave }) => {
    const [formData, setFormData] = useState<Omit<Property, 'id'>>({
        name: '', type: 'Villa', location: 'Lonavala', capacity: 8, basePrice: 20000,
        photoLink: '', pdfLink: '', amenities: [], description: '', status: 'active',
        propertyCode: '', bedrooms: 3, bathrooms: 3, area: '', maxCapacity: 10,
        poolType: 'none', videoLink: '', extraGuestCost: 0, houseRules: '', menuCardLink: '', inRoomDining: '',
        ...property,
    });
    const [loading, setLoading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => {
        if (!property && (formData.location || formData.bedrooms)) {
             setFormData(prev => ({
                ...prev,
                propertyCode: generatePropertyCode(prev)
            }));
        }
    }, [formData.location, formData.bedrooms, property]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: ['capacity', 'basePrice', 'bedrooms', 'bathrooms', 'maxCapacity', 'extraGuestCost'].includes(name) ? Number(value) : value }));
    };

    const handleAmenityChange = (amenity: Amenity) => {
        const newAmenities = formData.amenities.includes(amenity)
            ? formData.amenities.filter(a => a !== amenity)
            : [...formData.amenities, amenity];
        setFormData(prev => ({ ...prev, amenities: newAmenities }));
    };
    
    const handleGenerateDescription = async () => {
        setIsGenerating(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const prompt = `Generate a compelling, short marketing description for a vacation rental property.
            Property Name: "${formData.name}"
            Type: ${formData.type} in ${formData.location}
            Sleeps: ${formData.capacity} up to ${formData.maxCapacity}
            Key Amenities: ${formData.amenities.join(', ')}
            
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

    return (
         <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-0 sm:p-4 animate-fade-in">
            <div className="bg-white rounded-none sm:rounded-xl shadow-2xl w-full h-full sm:w-full sm:max-w-4xl sm:max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="space-y-6 p-4 sm:p-6">
                     <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">{property ? 'Edit Property' : 'Add New Property'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100">&times;</button>
                     </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4 border-b pb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Name</label>
                            <input name="name" value={formData.name} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Property Code</label>
                            <input name="propertyCode" value={formData.propertyCode} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Type</label>
                            <select name="type" value={formData.type} onChange={handleChange} className={`mt-1 ${baseInputClass}`}>
                                {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Location</label>
                            <select name="location" value={formData.location} onChange={handleChange} className={`mt-1 ${baseInputClass}`}>
                                {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                        </div>
                        <div>
                             <label className="block text-sm font-medium text-slate-700">Status</label>
                             <select name="status" value={formData.status} onChange={handleChange} className={`mt-1 ${baseInputClass}`}>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                             </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Bedrooms</label>
                            <input name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Bathrooms</label>
                            <input name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Area (e.g. 4000 sq ft)</label>
                            <input name="area" value={formData.area} onChange={handleChange} className={`mt-1 ${baseInputClass}`} />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Base Occupancy</label>
                            <input name="capacity" type="number" value={formData.capacity} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Max Occupancy</label>
                            <input name="maxCapacity" type="number" value={formData.maxCapacity} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Pool Type</label>
                            <select name="poolType" value={formData.poolType} onChange={handleChange} className={`mt-1 ${baseInputClass}`}>
                                <option value="none">None</option>
                                <option value="private">Private</option>
                                <option value="shared">Shared</option>
                             </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Base Price (INR)</label>
                            <input name="basePrice" type="number" value={formData.basePrice} onChange={handleChange} className={`mt-1 ${baseInputClass}`} required/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Extra Guest Cost (INR)</label>
                            <input name="extraGuestCost" type="number" value={formData.extraGuestCost} onChange={handleChange} className={`mt-1 ${baseInputClass}`} />
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-b pb-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-700">Amenities</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-2 gap-x-4 mt-2 border rounded-lg p-4 bg-slate-50">
                                {AMENITIES.map(amenity => (
                                    <label key={amenity} className="flex items-center space-x-2 text-sm text-slate-800 font-medium">
                                        <input type="checkbox" checked={formData.amenities.includes(amenity)} onChange={() => handleAmenityChange(amenity)} className="rounded text-brand-600 focus:ring-brand-500" />
                                        <span>{amenity}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-slate-700">Photo Link (URL)</label>
                            <input name="photoLink" value={formData.photoLink} onChange={handleChange} className={`mt-1 ${baseInputClass}`} placeholder="https://..."/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">PDF Brochure Link (URL)</label>
                            <input name="pdfLink" value={formData.pdfLink} onChange={handleChange} className={`mt-1 ${baseInputClass}`} placeholder="https://..."/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Video Link (URL)</label>
                            <input name="videoLink" value={formData.videoLink} onChange={handleChange} className={`mt-1 ${baseInputClass}`} placeholder="https://..."/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Menu Card Link (URL)</label>
                            <input name="menuCardLink" value={formData.menuCardLink} onChange={handleChange} className={`mt-1 ${baseInputClass}`} placeholder="https://..."/>
                        </div>
                         <div className="md:col-span-2">
                             <div className="flex justify-between items-center">
                                <label className="block text-sm font-medium text-slate-700">Description</label>
                                <button type="button" onClick={handleGenerateDescription} disabled={isGenerating} className="flex items-center space-x-1 text-sm font-semibold text-brand-600 hover:text-brand-900 disabled:opacity-50">
                                    <SparklesIcon />
                                    <span>{isGenerating ? 'Generating...' : 'Generate with AI'}</span>
                                </button>
                            </div>
                            <textarea name="description" value={formData.description} onChange={handleChange} rows={3} className={`mt-1 ${baseInputClass}`} />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700">House Rules</label>
                            <textarea name="houseRules" value={formData.houseRules} onChange={handleChange} rows={3} className={`mt-1 ${baseInputClass}`} />
                        </div>
                        <div className="md:col-span-2">
                             <label className="block text-sm font-medium text-slate-700">In-Room Dining</label>
                            <textarea name="inRoomDining" value={formData.inRoomDining} onChange={handleChange} rows={2} className={`mt-1 ${baseInputClass}`} />
                        </div>
                    </div>
                    
                    <div className="mt-6 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} className={`${baseButtonClass} bg-slate-200 text-slate-800 hover:bg-slate-300`}>Cancel</button>
                        <button type="submit" disabled={loading} className={`${baseButtonClass} bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300`}>{loading ? 'Saving...' : 'Save Property'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const AdminDashboard: React.FC = () => {
    const [properties, setProperties] = useState<Property[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'calendar' | 'properties'>('calendar');
    const { logout } = useAuth();
    const navigate = useNavigate();

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        const props = await db.getProperties();
        setProperties(props);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);
    
    const handleLogout = () => {
        logout();
        navigate('/login');
    };
    
    const calendarView = useMemo(() => <CalendarManagement properties={properties} />, [properties]);
    const propertiesView = useMemo(() => <PropertyManagement properties={properties} refreshProperties={fetchAllData} />, [properties, fetchAllData]);

    return (
        <div className="bg-slate-100 min-h-screen">
            <header className="bg-white shadow-md sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Admin Dashboard</h1>
                        <p className="text-xs sm:text-sm text-slate-500">Pine Stays Property Management</p>
                    </div>
                    <div className="flex items-center space-x-2 sm:space-x-4">
                        <nav className="p-1 bg-slate-100 rounded-lg flex space-x-1">
                             <button 
                                onClick={() => setView('calendar')} 
                                className={`px-2 py-1.5 sm:px-3 rounded-md text-sm font-semibold ${view === 'calendar' ? 'bg-white shadow text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                Calendar
                            </button>
                            <button 
                                onClick={() => setView('properties')}
                                className={`px-2 py-1.5 sm:px-3 rounded-md text-sm font-semibold ${view === 'properties' ? 'bg-white shadow text-brand-700' : 'text-slate-600 hover:bg-slate-200'}`}
                            >
                                Properties
                            </button>
                        </nav>
                        <button onClick={handleLogout} className="px-3 sm:px-4 py-2 bg-rose-500 text-white rounded-lg hover:bg-rose-600 text-sm font-semibold shadow-sm">Logout</button>
                    </div>
                </div>
            </header>
            <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
                {loading ? (
                     <div className="text-center py-12"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-500 mx-auto"></div></div>
                ) : (
                    <>
                        <div className={`${view !== 'calendar' ? 'hidden' : ''}`}>{calendarView}</div>
                        <div className={`${view !== 'properties' ? 'hidden' : ''}`}>{propertiesView}</div>
                    </>
                )}
            </main>
        </div>
    );
};

export default AdminDashboard;