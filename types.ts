export type Amenity = string;

export type PropertyType = '3-BHK' | '4-BHK' | '5-BHK' | 'Villa' | 'Cottage' | 'Penthouse';

export type Location = 'Lonavala' | 'Mumbai' | 'Pune' | 'Goa' | 'Alibaug';

export type CalendarStatus = 'available' | 'booked' | 'blocked' | 'owner';

export type UserRole = 'admin' | 'agent' | 'owner';
export type UserStatus = 'active' | 'pending' | 'inactive';

export interface User {
  id: string;
  email: string;
  password: string;
  name: string;
  role: UserRole;
  status: UserStatus;
}

export interface Property {
  id: string;
  propertyCode: string;
  name: string;
  type: PropertyType;
  location: Location;
  capacity: number; // Base occupancy
  maxCapacity: number;
  bedrooms: number;
  bathrooms: number;
  area: string; // e.g., "4000 sq ft"
  poolType: 'private' | 'shared' | 'none';
  basePrice: number;
  securityDeposit?: number;
  photoLink: string;
  pdfLink: string;
  videoLink?: string;
  amenities: Amenity[];
  description?: string;
  extraGuestCost?: number;
  houseRules?: string;
  menuCardLink?: string;
  status: 'active' | 'inactive';
  ownerId?: string;
}

export interface CalendarEntry {
  id: string;
  propertyId: string;
  date: string; // YYYY-MM-DD
  status: CalendarStatus;
  price: number;
  notes?: string;
}
