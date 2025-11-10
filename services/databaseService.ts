import { Property, CalendarEntry, CalendarStatus, User, UserRole, UserStatus } from '../types';

// --- HELPER FUNCTIONS ---
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatDate = (date: Date) => date.toISOString().split('T')[0];

// --- SAMPLE DATA ---
const sampleUsers: User[] = [
    { id: 'user1', email: 'admin@pinestays.in', password: 'pswd02@New', name: 'Admin User', role: 'admin', status: 'active' },
    { id: 'user2', email: '735prashant@gmail.com', password: 'qwerty', name: 'Prashant Agent', role: 'agent', status: 'active' },
    { id: 'user3', email: 'prashant@pinestays.in', password: 'qwerty', name: 'Prashant Owner', role: 'owner', status: 'active' },
];

const sampleProperties: Property[] = [
  {
    id: 'prop1',
    propertyCode: 'LAV-B5-VIL1',
    name: 'Lavender Hills',
    type: 'Villa',
    location: 'Lonavala',
    capacity: 12,
    maxCapacity: 15,
    bedrooms: 5,
    bathrooms: 5,
    area: '4500 sq ft',
    poolType: 'private',
    basePrice: 32000,
    photoLink: 'https://picsum.photos/seed/lavender/800/600',
    pdfLink: '#',
    videoLink: '',
    amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden'],
    description: 'A luxurious villa with stunning valley views, perfect for a family getaway.',
    extraGuestCost: 2000,
    houseRules: 'No loud music after 10 PM. Outside guests are not allowed.',
    menuCardLink: '#',
    inRoomDining: 'Available from 7 AM to 11 PM on request.',
    status: 'active',
    ownerId: 'user3',
  },
  {
    id: 'prop2',
    propertyCode: 'MUM-B5-5BH2',
    name: 'Imperial Calista',
    type: '5-BHK',
    location: 'Mumbai',
    capacity: 10,
    maxCapacity: 12,
    bedrooms: 5,
    bathrooms: 6,
    area: '3800 sq ft',
    poolType: 'shared',
    basePrice: 45000,
    photoLink: 'https://picsum.photos/seed/imperial/800/600',
    pdfLink: '#',
    videoLink: '',
    amenities: ['WiFi', 'AC', 'Kitchen', 'Gym', 'Hot Tub'],
    description: 'An opulent 5-BHK apartment in the heart of the city with modern amenities.',
    extraGuestCost: 2500,
    houseRules: 'Standard society rules apply.',
    status: 'active',
  },
  {
    id: 'prop3',
    propertyCode: 'PUN-B3-PEN3',
    name: 'Pune Penthouse',
    type: 'Penthouse',
    location: 'Pune',
    capacity: 6,
    maxCapacity: 8,
    bedrooms: 3,
    bathrooms: 3,
    area: '2500 sq ft',
    poolType: 'none',
    basePrice: 25000,
    photoLink: 'https://picsum.photos/seed/pune/800/600',
    pdfLink: '#',
    videoLink: '',
    amenities: ['WiFi', 'AC', 'Kitchen', 'Parking'],
    status: 'active',
    ownerId: 'user3',
  },
  {
    id: 'prop4',
    propertyCode: 'GOA-B2-COT4',
    name: 'Goan Paradise Cottage',
    type: 'Cottage',
    location: 'Goa',
    capacity: 4,
    maxCapacity: 5,
    bedrooms: 2,
    bathrooms: 2,
    area: '1800 sq ft',
    poolType: 'private',
    basePrice: 18000,
    photoLink: 'https://picsum.photos/seed/goa/800/600',
    pdfLink: '#',
    videoLink: '',
    amenities: ['Pool', 'WiFi', 'AC', 'Garden'],
    status: 'inactive',
  },
  {
    id: 'prop5',
    propertyCode: 'ALI-B4-4BH5',
    name: 'Alibaug Beachfront',
    type: '4-BHK',
    location: 'Alibaug',
    capacity: 8,
    maxCapacity: 10,
    bedrooms: 4,
    bathrooms: 4,
    area: '3200 sq ft',
    poolType: 'private',
    basePrice: 28000,
    photoLink: 'https://picsum.photos/seed/alibaug/800/600',
    pdfLink: '#',
    videoLink: '',
    amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden'],
    description: 'Wake up to the sound of waves in this beautiful beachfront property.',
    status: 'active',
  },
];

const generateSampleCalendar = (): CalendarEntry[] => {
  const entries: CalendarEntry[] = [];
  const today = new Date();
  const propertyIds = sampleProperties.map(p => p.id);

  for (let i = 0; i < 90; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = formatDate(date);

    for (const propId of propertyIds) {
      const property = sampleProperties.find(p => p.id === propId);
      if (!property) continue;

      const rand = Math.random();
      let status: CalendarStatus = 'available';
      let price = property.basePrice;

      if (rand < 0.15) {
        status = 'booked';
      } else if (rand < 0.20) {
        status = 'blocked';
        price = 0;
      } else if (rand < 0.23) {
        status = 'owner';
        price = 0;
      }
      
      const day = date.getDay(); // Sunday - 0, Saturday - 6
      if(day === 5 || day === 6 || day === 0){ // Fri, Sat, Sun
        price = Math.round(price * 1.25);
      }

      if (status !== 'available') {
        entries.push({
          id: generateId(),
          propertyId: propId,
          date: dateStr,
          status,
          price,
          notes: status === 'booked' ? `Booking #${Math.floor(Math.random() * 1000)}` : '',
        });
      }
    }
  }
  return entries;
};


// --- DATABASE SERVICE ---
class DatabaseService {
  private properties: Property[] = [];
  private calendars: CalendarEntry[] = [];
  private users: User[] = [];

  constructor() {
    this.loadData();
  }

  private loadData() {
    try {
      const storedProperties = localStorage.getItem('pine_stays_properties');
      const storedCalendars = localStorage.getItem('pine_stays_calendars');
      const storedUsers = localStorage.getItem('pine_stays_users');

      if (storedProperties && storedCalendars && storedUsers) {
        this.properties = JSON.parse(storedProperties);
        this.calendars = JSON.parse(storedCalendars);
        this.users = JSON.parse(storedUsers);
      } else {
        this.properties = sampleProperties;
        this.calendars = generateSampleCalendar();
        this.users = sampleUsers;
        this.saveData();
      }
    } catch (error) {
      console.error("Failed to load data from localStorage", error);
      this.properties = sampleProperties;
      this.calendars = generateSampleCalendar();
      this.users = sampleUsers;
    }
  }

  private saveData() {
    try {
      localStorage.setItem('pine_stays_properties', JSON.stringify(this.properties));
      localStorage.setItem('pine_stays_calendars', JSON.stringify(this.calendars));
      localStorage.setItem('pine_stays_users', JSON.stringify(this.users));
    } catch (error)
      {
      console.error("Failed to save data to localStorage", error);
    }
  }

  private async simulateDelay<T,>(data: T): Promise<T> {
    return new Promise(resolve => setTimeout(() => resolve(data), 200 + Math.random() * 300));
  }
  
  // --- User Methods ---
  async getUsers(): Promise<User[]> {
      return this.simulateDelay([...this.users]);
  }
  
  async getUserById(userId: string): Promise<User | undefined> {
      const user = this.users.find(u => u.id === userId);
      return this.simulateDelay(user ? {...user} : undefined);
  }

  async getUserByEmailAndPassword(email: string, pass: string): Promise<User | null> {
    const user = this.users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === pass);
    return this.simulateDelay(user ? { ...user } : null);
  }

  async addUser(userData: Omit<User, 'id'>): Promise<User> {
    const existingUser = this.users.find(u => u.email.toLowerCase() === userData.email.toLowerCase());
    if (existingUser) {
        throw new Error("User with this email already exists.");
    }
    const newUser: User = { ...userData, id: generateId() };
    this.users.push(newUser);
    this.saveData();
    return this.simulateDelay(newUser);
  }
  
  async updateUser(userId: string, updates: Partial<User>): Promise<User> {
    const index = this.users.findIndex(u => u.id === userId);
    if (index === -1) throw new Error("User not found");
    this.users[index] = { ...this.users[index], ...updates };
    this.saveData();
    return this.simulateDelay(this.users[index]);
  }

  // --- Property Methods ---
  async getProperties(): Promise<Property[]> {
    return this.simulateDelay([...this.properties]);
  }

  async addProperty(propData: Omit<Property, 'id'>): Promise<Property> {
    const newProperty: Property = { ...propData, id: generateId() };
    this.properties.push(newProperty);
    this.saveData();
    return this.simulateDelay(newProperty);
  }
  
  async updateProperty(propId: string, updates: Partial<Property>): Promise<Property> {
    const index = this.properties.findIndex(p => p.id === propId);
    if (index === -1) throw new Error("Property not found");
    this.properties[index] = { ...this.properties[index], ...updates };
    this.saveData();
    return this.simulateDelay(this.properties[index]);
  }

  async deleteProperty(propId: string): Promise<{ success: boolean }> {
    this.properties = this.properties.filter(p => p.id !== propId);
    // Also delete associated calendar entries
    this.calendars = this.calendars.filter(c => c.propertyId !== propId);
    this.saveData();
    return this.simulateDelay({ success: true });
  }

  // --- Calendar Methods ---
  async getCalendarEntries(startDate: string, endDate: string): Promise<CalendarEntry[]> {
    const entries = this.calendars.filter(c => c.date >= startDate && c.date <= endDate);
    return this.simulateDelay([...entries]);
  }
  
  async upsertCalendarEntry(entryData: Omit<CalendarEntry, 'id'>): Promise<CalendarEntry> {
    const { propertyId, date } = entryData;
    const existingIndex = this.calendars.findIndex(c => c.propertyId === propertyId && c.date === date);

    if (entryData.status === 'available') {
      if (existingIndex !== -1) {
        this.calendars.splice(existingIndex, 1);
      }
      this.saveData();
      return this.simulateDelay({ ...entryData, id: '' });
    }

    if (existingIndex !== -1) {
      this.calendars[existingIndex] = { ...this.calendars[existingIndex], ...entryData };
      this.saveData();
      return this.simulateDelay(this.calendars[existingIndex]);
    } else {
      const newEntry: CalendarEntry = { ...entryData, id: generateId() };
      this.calendars.push(newEntry);
      this.saveData();
      return this.simulateDelay(newEntry);
    }
  }
  
  async bulkUpdateCells(
    cells: { propertyId: string; date: string }[],
    action: { type: 'setStatus'; status: CalendarStatus } | { type: 'setPrice'; price: number } | { type: 'adjustPrice'; percentage: number }
  ): Promise<{ updatedCount: number }> {
    let updatedCount = 0;

    for (const cell of cells) {
        const { propertyId, date: dateStr } = cell;
        const property = this.properties.find(p => p.id === propertyId);
        if (!property) continue;

        let existingEntry = this.calendars.find(c => c.propertyId === propertyId && c.date === dateStr);
        let currentPrice = existingEntry ? existingEntry.price : property.basePrice;
        let currentStatus = existingEntry ? existingEntry.status : 'available';
        
        // Prevent updates on booked dates
        if(currentStatus === 'booked' && (action.type === 'setPrice' || action.type === 'adjustPrice')) continue;


        let newPrice = currentPrice;
        let newStatus = currentStatus;

        switch(action.type) {
            case 'setStatus':
                newStatus = action.status;
                if (['blocked', 'owner'].includes(newStatus)) {
                    newPrice = 0;
                } else if (currentPrice === 0 && newStatus === 'available') {
                    newPrice = property.basePrice;
                }
                break;
            case 'setPrice':
                newPrice = action.price;
                if (currentStatus !== 'booked') {
                    if (newPrice > 0 && ['blocked', 'owner'].includes(currentStatus)) {
                        newStatus = 'available';
                    } else if (newPrice <= 0) {
                        newStatus = 'blocked';
                    }
                }
                break;
            case 'adjustPrice':
                const priceToAdjust = (currentStatus === 'available' && currentPrice > 0) ? currentPrice : property.basePrice;
                newPrice = Math.round(priceToAdjust * (1 + action.percentage / 100));
                
                if (currentStatus !== 'booked') {
                    if (newPrice > 0) {
                       newStatus = 'available';
                    } else {
                        newPrice = 0;
                        newStatus = 'blocked';
                    }
                }
                break;
        }

        if (newStatus !== currentStatus || newPrice !== currentPrice) {
             this.upsertCalendarEntry({
                propertyId: propertyId,
                date: dateStr,
                status: newStatus,
                price: newPrice,
                notes: existingEntry?.notes || '',
            });
            updatedCount++;
        }
    }
    
    this.saveData();
    return this.simulateDelay({ updatedCount });
  }

  async mockIcalImport(propertyId: string): Promise<{ success: boolean; importedCount: number }> {
    const today = new Date();
    const importedDates = new Set<string>();
    const importCount = 3 + Math.floor(Math.random() * 5); // Import 3 to 7 events

    while(importedDates.size < importCount) {
        const randomDayOffset = Math.floor(Math.random() * 60); // In the next 60 days
        const date = new Date(today);
        date.setDate(today.getDate() + randomDayOffset);
        const dateStr = formatDate(date);
        importedDates.add(dateStr);
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

    this.saveData();
    return this.simulateDelay({ success: true, importedCount: importedDates.size });
  }
}

export const db = new DatabaseService();