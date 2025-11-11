import { Property, CalendarEntry, CalendarStatus, User, Amenity } from '../types';
import { INITIAL_AMENITIES } from '../constants';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

class DatabaseService {
  private users: User[] = [];
  private properties: Property[] = [];
  private calendarEntries: CalendarEntry[] = [];
  private allAmenities: Amenity[] = [];
  private dbKey = 'pine_stays_db';

  constructor() {
    this.loadDb();
  }

  private loadDb() {
    try {
      const data = localStorage.getItem(this.dbKey);
      if (data) {
        const parsedData = JSON.parse(data);
        this.users = parsedData.users || [];
        this.properties = parsedData.properties || [];
        this.calendarEntries = parsedData.calendarEntries || [];
        this.allAmenities = parsedData.allAmenities || [...INITIAL_AMENITIES];
        if (this.users.length === 0) {
            this.seedData();
        }
      } else {
        this.seedData();
      }
    } catch (error) {
        console.error("Failed to load database from localStorage", error);
        this.seedData();
    } finally {
        this.saveDb();
    }
  }

  private saveDb() {
    try {
      localStorage.setItem(this.dbKey, JSON.stringify({
        users: this.users,
        properties: this.properties,
        calendarEntries: this.calendarEntries,
        allAmenities: this.allAmenities
      }));
    } catch (error) {
      console.error("Failed to save database to localStorage", error);
    }
  }

  private seedData() {
    // --- Seed Users ---
    this.users = [
      { id: 'user-admin-01', name: 'Admin User', email: 'admin@pinestays.com', password: 'password123', role: 'admin', status: 'active' },
      { id: 'user-agent-01', name: 'Agent Smith', email: 'agent@pinestays.com', password: 'password123', role: 'agent', status: 'active' },
      { id: 'user-agent-02', name: 'Pending Agent', email: 'pending@pinestays.com', password: 'password123', role: 'agent', status: 'pending' },
      { id: 'user-owner-01', name: 'Owner John', email: 'owner@pinestays.com', password: 'password123', role: 'owner', status: 'active' },
    ];

    // --- Seed Properties ---
    this.properties = [
        {
            id: 'prop-01', propertyCode: 'LNV-B4-ABCD', name: 'The Glass House', type: 'Villa', location: 'Lonavala', capacity: 8, maxCapacity: 12, bedrooms: 4, bathrooms: 4, area: '4500 sq ft', poolType: 'private', basePrice: 25000, photoLink: 'https://images.unsplash.com/photo-1613977257363-311617c0938f?q=80&w=2070&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden'], description: 'A stunning modern villa with panoramic views, perfect for a luxurious getaway.', status: 'active', ownerId: 'user-owner-01', extraGuestCost: 2000, houseRules: 'No loud music after 10 PM. No pets allowed.'
        },
        {
            id: 'prop-02', propertyCode: 'GOA-B5-EFGH', name: 'Casa Sol', type: '5-BHK', location: 'Goa', capacity: 10, maxCapacity: 15, bedrooms: 5, bathrooms: 5, area: '6000 sq ft', poolType: 'private', basePrice: 40000, photoLink: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1974&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden', 'TV'], description: 'Experience beachfront bliss in this spacious and elegant Goan villa.', status: 'active', ownerId: 'user-owner-01'
        },
        {
            id: 'prop-03', propertyCode: 'ALI-B3-IJKL', name: 'The Frangipani', type: '3-BHK', location: 'Alibaug', capacity: 6, maxCapacity: 8, bedrooms: 3, bathrooms: 3, area: '3000 sq ft', poolType: 'shared', basePrice: 18000, photoLink: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=1974&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking'], description: 'A charming and cozy retreat surrounded by lush greenery.', status: 'active'
        },
    ];
    
    // --- Seed Amenities ---
    this.allAmenities = [...INITIAL_AMENITIES];

    // --- Seed Calendar Entries ---
    const today = new Date();
    this.calendarEntries = [
        { id: `cal-01`, propertyId: 'prop-01', date: formatDate(new Date(today.setDate(today.getDate() + 2))), status: 'booked', price: 30000, notes: 'Confirmed booking' },
        { id: `cal-02`, propertyId: 'prop-01', date: formatDate(new Date(today.setDate(today.getDate() + 1))), status: 'booked', price: 30000, notes: 'Confirmed booking' },
        { id: `cal-03`, propertyId: 'prop-02', date: formatDate(new Date(today.setDate(today.getDate() + 5))), status: 'owner', price: 0, notes: 'Owner stay' },
        { id: `cal-04`, propertyId: 'prop-03', date: formatDate(new Date(today.setDate(today.getDate() + 10))), status: 'blocked', price: 0, notes: 'Maintenance' },
    ];
  }

  // --- User Methods ---
  async getUsers(): Promise<User[]> {
    return Promise.resolve(this.users);
  }

  async getUserById(userId: string): Promise<User | undefined> {
    return Promise.resolve(this.users.find(u => u.id === userId));
  }
  
  async addUser(userData: Omit<User, 'id'>): Promise<User> {
    const newUser: User = { id: `user-${Date.now()}`, ...userData };
    this.users.push(newUser);
    this.saveDb();
    return Promise.resolve(newUser);
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
    const userIndex = this.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");
    // Prevent email change
    const { email, ...safeUpdates } = updates;
    this.users[userIndex] = { ...this.users[userIndex], ...safeUpdates };
    this.saveDb();
    return Promise.resolve(this.users[userIndex]);
  }

  // --- Property Methods ---
  async getProperties(): Promise<Property[]> {
    return Promise.resolve(this.properties);
  }

  async addProperty(propData: Omit<Property, 'id'>): Promise<Property> {
    const newProp: Property = { id: `prop-${Date.now()}`, ...propData };
    this.properties.push(newProp);
    this.saveDb();
    return Promise.resolve(newProp);
  }

  async updateProperty(propId: string, updates: Partial<Property>): Promise<Property> {
    const propIndex = this.properties.findIndex(p => p.id === propId);
    if (propIndex === -1) throw new Error("Property not found");
    this.properties[propIndex] = { ...this.properties[propIndex], ...updates };
    this.saveDb();
    return Promise.resolve(this.properties[propIndex]);
  }

  async deleteProperty(propId: string): Promise<{ success: boolean }> {
    this.properties = this.properties.filter(p => p.id !== propId);
    this.calendarEntries = this.calendarEntries.filter(c => c.propertyId !== propId);
    this.saveDb();
    return Promise.resolve({ success: true });
  }

  // --- Amenity Methods ---
  async getAmenities(): Promise<Amenity[]> {
      return Promise.resolve(this.allAmenities);
  }
  
  async addAmenity(amenity: Amenity): Promise<Amenity> {
    if (!this.allAmenities.find(a => a.toLowerCase() === amenity.toLowerCase())) {
        this.allAmenities.push(amenity);
        this.saveDb();
    }
    return Promise.resolve(amenity);
  }

  // --- Calendar Methods ---
  async getCalendarEntries(startDate: string, endDate: string): Promise<CalendarEntry[]> {
    const entries = this.calendarEntries.filter(c => c.date >= startDate && c.date <= endDate);
    return Promise.resolve(entries);
  }
  
  async upsertCalendarEntry(entryData: Omit<CalendarEntry, 'id'>): Promise<CalendarEntry> {
    const existingIndex = this.calendarEntries.findIndex(c => c.propertyId === entryData.propertyId && c.date === entryData.date);
    const property = this.properties.find(p => p.id === entryData.propertyId);
    if (!property) throw new Error("Property not found for calendar entry.");

    // If the new state is default (available at base price, with no notes), remove any override entry.
    if (entryData.status === 'available' && entryData.price === property.basePrice && (!entryData.notes || entryData.notes.trim() === '')) {
        if (existingIndex !== -1) {
            this.calendarEntries.splice(existingIndex, 1);
        }
        this.saveDb();
        return Promise.resolve({ ...entryData, id: '' });
    }

    // Otherwise, create or update the entry.
    if (existingIndex !== -1) {
      const id = this.calendarEntries[existingIndex].id;
      this.calendarEntries[existingIndex] = { ...entryData, id };
      this.saveDb();
      return Promise.resolve({ ...entryData, id });
    } else {
      const newEntry: CalendarEntry = { id: `cal-${Date.now()}`, ...entryData };
      this.calendarEntries.push(newEntry);
      this.saveDb();
      return Promise.resolve(newEntry);
    }
  }

  async bulkUpdateCells(
    cells: { propertyId: string; date: string }[],
    action: { type: 'setStatus'; status: CalendarStatus } | { type: 'setPrice'; price: number } | { type: 'adjustPrice'; percentage: number } | { type: 'setWeekendPrice'; price: number } | { type: 'setWeekdayPrice'; price: number }
  ): Promise<{ updatedCount: number }> {
    let updatedCount = 0;
    for (const cell of cells) {
      const { propertyId, date: dateStr } = cell;

      if (action.type === 'setWeekendPrice' || action.type === 'setWeekdayPrice') {
          const date = new Date(dateStr + 'T00:00:00'); // Use T00:00:00 to avoid timezone issues with getDay()
          const day = date.getDay(); // 0 = Sunday, 6 = Saturday
          const isWeekend = (day === 0 || day === 6);

          if (action.type === 'setWeekendPrice' && !isWeekend) {
              continue; // Skip weekdays for this action
          }
          if (action.type === 'setWeekdayPrice' && isWeekend) {
              continue; // Skip weekends for this action
          }
      }
      
      const property = this.properties.find(p => p.id === propertyId);
      if (!property) continue;

      let existingEntry = this.calendarEntries.find(c => c.propertyId === propertyId && c.date === dateStr);
      let currentPrice = existingEntry ? existingEntry.price : property.basePrice;
      let currentStatus = existingEntry ? existingEntry.status : 'available';

      if (currentStatus === 'booked' && (action.type === 'setPrice' || action.type === 'adjustPrice' || action.type === 'setWeekendPrice' || action.type === 'setWeekdayPrice')) {
          continue; // Skip price changes for booked dates
      }

      let newStatus = currentStatus;
      let newPrice = currentPrice;

      switch(action.type) {
        case 'setStatus':
            newStatus = action.status;
            if (['blocked', 'owner'].includes(newStatus)) newPrice = 0;
            else if (newStatus === 'available') newPrice = property.basePrice;
            else if (currentPrice === 0) newPrice = property.basePrice;
            break;
        case 'setPrice':
        case 'setWeekendPrice':
        case 'setWeekdayPrice':
            newPrice = action.price;
            if (currentStatus !== 'booked') newStatus = newPrice > 0 ? 'available' : 'blocked';
            if (newPrice <= 0) newPrice = 0;
            break;
        case 'adjustPrice':
            const priceToAdjust = (currentStatus === 'available' && currentPrice > 0) ? currentPrice : property.basePrice;
            newPrice = Math.round(priceToAdjust * (1 + action.percentage / 100));
            if (currentStatus !== 'booked') newStatus = newPrice > 0 ? 'available' : 'blocked';
            if (newPrice <=0) newPrice = 0;
            break;
      }
      
      const isDefaultState = newStatus === 'available' && newPrice === property.basePrice && (!existingEntry?.notes || existingEntry.notes.trim() === '');
      const hadEntry = !!existingEntry;
      
      if ((hadEntry && isDefaultState) || (!isDefaultState && (newStatus !== currentStatus || newPrice !== currentPrice))) {
         await this.upsertCalendarEntry({
              propertyId,
              date: dateStr,
              status: newStatus,
              price: newPrice,
              notes: existingEntry?.notes || ''
          });
          updatedCount++;
      }
    }
    return Promise.resolve({ updatedCount });
  }

  async mockIcalImport(propertyId: string): Promise<{ success: boolean; importedCount: number }> {
    const today = new Date();
    const importedDates = new Set<string>();
    const importCount = 3 + Math.floor(Math.random() * 5);

    while(importedDates.size < importCount) {
        const randomDayOffset = Math.floor(Math.random() * 60);
        const date = new Date(today);
        date.setDate(today.getDate() + randomDayOffset);
        importedDates.add(formatDate(date));
    }

    for (const dateStr of importedDates) {
        await this.upsertCalendarEntry({
            propertyId,
            date: dateStr,
            status: 'blocked',
            price: 0,
            notes: 'Imported from iCal sync'
        });
    }

    return { success: true, importedCount: importedDates.size };
  }
}

export const db = new DatabaseService();