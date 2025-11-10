import { Amenity, CalendarStatus, Location, PropertyType } from './types';
import React from 'react';

export const AMENITIES: Amenity[] = ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden', 'Hot Tub', 'Gym', 'TV'];
export const PROPERTY_TYPES: PropertyType[] = ['3-BHK', '4-BHK', '5-BHK', 'Villa', 'Cottage', 'Penthouse'];
export const LOCATIONS: Location[] = ['Lonavala', 'Mumbai', 'Pune', 'Goa', 'Alibaug'];
export const STATUSES: CalendarStatus[] = ['available', 'booked', 'blocked', 'owner'];

export const STATUS_COLORS: { [key in CalendarStatus]: { bg: string; text: string; border: string } } = {
  available: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  booked: { bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/20' },
  blocked: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  owner: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/20' },
};
