import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from '@google/genai';
import { Property, User, Amenity } from '../types';
import { db } from '../services/databaseService';
import { LOCATIONS, PROPERTY_TYPES } from '../constants';
import { SparklesIcon, XMarkIcon } from '../Icons';

const baseInputClass = "w-full border border-input rounded-xl shadow-sm px-4 py-3 text-base bg-input/50 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted";
const baseButtonClass = "px-6 py-3 rounded-xl font-semibold text-base shadow-sm transition-colors disabled:opacity-50";

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

export const PropertyFormModal: React.FC<PropertyFormModalProps> = ({ property, owners, allAmenities, onClose, onSave, refreshParentData }) => {
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
    const [isAddingOwner, setIsAddingOwner] = useState(false); // Note: Nested modal logic simplified or requires passing handler
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
                            <select name="ownerId" value={formData.ownerId} onChange={handleChange} className={baseInputClass}>
                                <option value="">Unassigned</option>
                                {owners.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                            </select>
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
            </div>
        </div>
    );
};