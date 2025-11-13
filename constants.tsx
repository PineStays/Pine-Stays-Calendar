import { Amenity, CalendarStatus, Location, PropertyType } from './types';
import React from 'react';

export const INITIAL_AMENITIES: Amenity[] = ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden', 'Hot Tub', 'Gym', 'TV'];
export const PROPERTY_TYPES: PropertyType[] = ['3-BHK', '4-BHK', '5-BHK', 'Villa', 'Cottage', 'Penthouse'];
export const LOCATIONS: Location[] = ['Lonavala', 'Mumbai', 'Pune', 'Goa', 'Alibaug'];
export const STATUSES: CalendarStatus[] = ['available', 'booked', 'blocked', 'owner'];

export const STATUS_COLORS: { [key in CalendarStatus]: { bg: string; text: string; border: string } } = {
  available: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/20' },
  booked: { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  blocked: { bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  owner: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20' },
};