import { Property, CalendarEntry, CalendarStatus, User, Amenity } from '../types';
import { INITIAL_AMENITIES } from '../constants';
// FIX: Use v8 compat version of firebase and db from firebase service
import { db_firebase, firebase } from './firebase';

const formatDate = (date: Date) => date.toISOString().split('T')[0];

// Helper to convert Firestore doc snapshot to our typed object
// FIX: Use DocumentSnapshot type from the firebase v8 compat module to ensure type compatibility.
const docToData = <T>(snapshot: firebase.firestore.DocumentSnapshot): T => ({ id: snapshot.id, ...snapshot.data() } as T);

class DatabaseService {

  constructor() {
    // Initialization is now handled explicitly via the initialize() method
  }

  async initialize() {
    await this.checkAndSeedDatabase();
  }

  private async checkAndSeedDatabase() {
    // Check if properties exist to determine if seeding is needed
    // FIX: Use v8 firestore syntax
    const propertiesCollection = db_firebase.collection('properties');
    const snapshot = await propertiesCollection.limit(1).get();
    if (!snapshot.empty) {
      console.log("Firestore database already contains data.");
      return;
    }

    console.log("Database is empty. Seeding data...");

    // FIX: Use v8 firestore syntax
    const batch = db_firebase.batch();

    // --- Seed Properties ---
    const properties: Omit<Property, 'id'>[] = [
      {
        propertyCode: 'LNV-B4-ABCD', name: 'The Glass House', type: 'Villas', location: 'Lonavala', capacity: 8, maxCapacity: 12, bedrooms: 4, bathrooms: 4, area: '4500 sq ft', poolType: 'private', basePrice: 25000, photoLink: 'https://images.unsplash.com/photo-1613977257363-311617c0938f?q=80&w=2070&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden'], description: 'A stunning modern villa with panoramic views, perfect for a luxurious getaway.', status: 'active', ownerId: '', extraGuestCost: 2000, houseRules: 'No loud music after 10 PM. No pets allowed.'
      },
      {
        propertyCode: 'GOA-B5-EFGH', name: 'Casa Sol', type: 'Villas', location: 'Goa', capacity: 10, maxCapacity: 15, bedrooms: 5, bathrooms: 5, area: '6000 sq ft', poolType: 'private', basePrice: 40000, photoLink: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?q=80&w=1974&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking', 'Garden', 'TV'], description: 'Experience beachfront bliss in this spacious and elegant Goan villa.', status: 'active', ownerId: ''
      },
      {
        propertyCode: 'ALI-B3-IJKL', name: 'The Frangipani', type: 'Apartments', location: 'Alibaug', capacity: 6, maxCapacity: 8, bedrooms: 3, bathrooms: 3, area: '3000 sq ft', poolType: 'shared', basePrice: 18000, photoLink: 'https://images.unsplash.com/photo-1598228723793-52759bba239c?q=80&w=1974&auto=format&fit=crop', pdfLink: '#', amenities: ['Pool', 'WiFi', 'AC', 'Kitchen', 'Parking'], description: 'A charming and cozy retreat surrounded by lush greenery.', status: 'active'
      },
    ];

    const propRefs: { [key: string]: string } = {}; // To map old IDs to new Firestore IDs for calendar entries
    const propDocs = [];
    for (const propData of properties) {
        // FIX: Use v8 firestore syntax
        const propRef = db_firebase.collection('properties').doc();
        batch.set(propRef, propData);
        propDocs.push({ id: propRef.id, ...propData });
    }

    // --- Seed Amenities ---
    // FIX: Use v8 firestore syntax
    const amenitiesRef = db_firebase.collection('config').doc('amenities');
    batch.set(amenitiesRef, { list: [...INITIAL_AMENITIES] });

    // --- Seed Calendar Entries ---
    const today = new Date();
    const calendarEntries = [
        { tempPropName: 'The Glass House', date: formatDate(new Date(today.setDate(today.getDate() + 2))), status: 'booked', price: 30000, notes: 'Confirmed booking' },
        { tempPropName: 'The Glass House', date: formatDate(new Date(today.setDate(today.getDate() + 1))), status: 'booked', price: 30000, notes: 'Confirmed booking' },
        { tempPropName: 'Casa Sol', date: formatDate(new Date(today.setDate(today.getDate() + 5))), status: 'owner', price: 0, notes: 'Owner stay' },
        { tempPropName: 'The Frangipani', date: formatDate(new Date(today.setDate(today.getDate() + 10))), status: 'blocked', price: 0, notes: 'Maintenance' },
    ];
    
    for (const entry of calendarEntries) {
        const correspondingProp = propDocs.find(p => p.name === entry.tempPropName);
        if (correspondingProp) {
            const entryId = `${correspondingProp.id}_${entry.date}`;
            // FIX: Use v8 firestore syntax
            const entryRef = db_firebase.collection('calendarEntries').doc(entryId);
            batch.set(entryRef, {
                propertyId: correspondingProp.id,
                date: entry.date,
                status: entry.status,
                price: entry.price,
                notes: entry.notes,
            });
        }
    }
    
    await batch.commit();
    console.log("Database seeding complete.");
  }
  
  async hasUsers(): Promise<boolean> {
    const snapshot = await db_firebase.collection('users').limit(1).get();
    return !snapshot.empty;
  }

  // --- User Methods ---
  async getUsers(): Promise<User[]> {
    // FIX: Use v8 firestore syntax
    const snapshot = await db_firebase.collection('users').get();
    return snapshot.docs.map(doc => docToData<User>(doc));
  }

  async getUserById(userId: string): Promise<User | undefined> {
    // FIX: Use v8 firestore syntax
    const docRef = db_firebase.collection('users').doc(userId);
    const snapshot = await docRef.get();
    return snapshot.exists ? docToData<User>(snapshot) : undefined;
  }
  
  async addUser(userData: Omit<User, 'id'>): Promise<User> {
    // Note: User creation should primarily happen via Auth signup.
    // This is for admins creating users manually. A password must be set via other means (e.g., password reset email).
    // FIX: Use v8 firestore syntax
    const docRef = await db_firebase.collection('users').add(userData);
    const doc = await docRef.get();
    return docToData<User>(doc);
  }

  async updateUser(userId: string, updates: Partial<Omit<User, 'id'>>): Promise<User> {
    // FIX: Use v8 firestore syntax
    const docRef = db_firebase.collection('users').doc(userId);
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return docToData<User>(updatedDoc);
  }
  
  async deleteUser(userId: string): Promise<{ success: boolean }> {
    // Deleting the user profile from Firestore.
    // NOTE: This does NOT delete the user from Firebase Authentication.
    // For a production app, a Cloud Function triggered on this document's
    // deletion would be required to also delete the Firebase Auth user.
    await db_firebase.collection('users').doc(userId).delete();
    return { success: true };
  }

  // --- Property Methods ---
  async getProperties(): Promise<Property[]> {
    // FIX: Use v8 firestore syntax
    const snapshot = await db_firebase.collection('properties').get();
    return snapshot.docs.map(doc => docToData<Property>(doc));
  }

  async addProperty(propData: Omit<Property, 'id'>): Promise<Property> {
    // FIX: Use v8 firestore syntax
    const docRef = await db_firebase.collection('properties').add(propData);
    const doc = await docRef.get();
    return docToData<Property>(doc);
  }

  async updateProperty(propId: string, updates: Partial<Property>): Promise<Property> {
    // FIX: Use v8 firestore syntax
    const docRef = db_firebase.collection('properties').doc(propId);
    await docRef.update(updates);
    const updatedDoc = await docRef.get();
    return docToData<Property>(updatedDoc);
  }

  async deletePropertyAndEntries(propId: string): Promise<{ success: boolean }> {
    const batch = db_firebase.batch();

    // 1. Delete the property document
    const propRef = db_firebase.collection('properties').doc(propId);
    batch.delete(propRef);

    // 2. Find and delete all associated calendar entries.
    // This is a client-side implementation. For ultimate robustness,
    // a Cloud Function triggered on document deletion is recommended in production.
    const entriesQuery = db_firebase.collection('calendarEntries').where('propertyId', '==', propId);
    const entriesSnapshot = await entriesQuery.get();
    
    if (!entriesSnapshot.empty) {
        entriesSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
    }

    await batch.commit();
    return { success: true };
  }

  // --- Amenity Methods ---
  async getAmenities(): Promise<Amenity[]> {
      // FIX: Use v8 firestore syntax
      const docRef = db_firebase.collection('config').doc('amenities');
      const docSnap = await docRef.get();
      return docSnap.exists ? (docSnap.data() as {list: Amenity[]}).list : [...INITIAL_AMENITIES];
  }
  
  async addAmenity(amenity: Amenity): Promise<Amenity> {
    // FIX: Use v8 firestore syntax
    const docRef = db_firebase.collection('config').doc('amenities');
    const docSnap = await docRef.get();
    const currentAmenities = docSnap.exists ? (docSnap.data() as {list: Amenity[]}).list : [];
    if (!currentAmenities.find((a: string) => a.toLowerCase() === amenity.toLowerCase())) {
        await docRef.set({ list: [...currentAmenities, amenity] });
    }
    return amenity;
  }

  // --- Calendar Methods ---
  async getCalendarEntries(startDate: string, endDate: string): Promise<CalendarEntry[]> {
    // FIX: Use v8 firestore syntax
    const q = db_firebase.collection('calendarEntries').where('date', '>=', startDate).where('date', '<=', endDate);
    const snapshot = await q.get();
    return snapshot.docs.map(doc => docToData<CalendarEntry>(doc));
  }
  
  async upsertCalendarEntry(entryData: Omit<CalendarEntry, 'id'>): Promise<CalendarEntry> {
    const { propertyId, date } = entryData;
    const entryId = `${propertyId}_${date}`;
    // FIX: Use v8 firestore syntax
    const docRef = db_firebase.collection('calendarEntries').doc(entryId);

    const properties = await this.getProperties();
    const property = properties.find(p => p.id === propertyId);
    if (!property) throw new Error("Property not found for calendar entry.");

    const hasNote = entryData.notes && entryData.notes.trim() !== '';
    const isDefaultPriceAndStatus = entryData.status === 'available' && entryData.price === property.basePrice;

    if (isDefaultPriceAndStatus && !hasNote) {
        await docRef.delete().catch(() => {}); // Delete if it exists, ignore error if not
        return { ...entryData, id: '' }; // Represent default state
    } else {
        await docRef.set(entryData);
        return { ...entryData, id: entryId };
    }
  }

  async bulkUpdateCells(
    cells: { propertyId: string; date: string }[],
    action: { type: 'setStatus'; status: CalendarStatus } | { type: 'setPrice'; price: number } | { type: 'adjustPrice'; percentage: number } | { type: 'setWeekendPrice'; price: number } | { type: 'setWeekdayPrice'; price: number }
  ): Promise<{ updatedCount: number }> {
    // FIX: Use v8 firestore syntax
    const batch = db_firebase.batch();
    
    // Fetch all required properties and existing entries in advance to minimize reads
    const propertyIds = [...new Set(cells.map(c => c.propertyId))];
    
    // FIX: Refactored to avoid ternary with type cast which was causing type inference issues.
    let properties: Property[] = [];
    if (propertyIds.length > 0) {
        const propertiesSnapshot = await db_firebase.collection('properties').where(firebase.firestore.FieldPath.documentId(), 'in', propertyIds).get();
        properties = propertiesSnapshot.docs.map(doc => docToData<Property>(doc));
    }
    const propMap = new Map(properties.map(p => [p.id, p]));

    const entryIds = cells.map(c => `${c.propertyId}_${c.date}`);
    
    // FIX: Refactored to avoid ternary with type cast which was causing type inference issues.
    let entryMap = new Map<string, CalendarEntry>();
    if (entryIds.length > 0) {
        const entriesSnapshot = await db_firebase.collection('calendarEntries').where(firebase.firestore.FieldPath.documentId(), 'in', entryIds).get();
        entryMap = new Map<string, CalendarEntry>(entriesSnapshot.docs.map(doc => [doc.id, docToData<CalendarEntry>(doc)]));
    }

    let updatedCount = 0;
    for (const cell of cells) {
      const { propertyId, date: dateStr } = cell;
      const property = propMap.get(propertyId);
      if (!property) continue;

      if (action.type === 'setWeekendPrice' || action.type === 'setWeekdayPrice') {
          const date = new Date(dateStr + 'T00:00:00');
          const day = date.getDay();
          const isWeekend = (day === 0 || day === 6);
          if ((action.type === 'setWeekendPrice' && !isWeekend) || (action.type === 'setWeekdayPrice' && isWeekend)) {
              continue;
          }
      }

      const entryId = `${propertyId}_${dateStr}`;
      // FIX: With `entryMap` correctly typed as `Map<string, CalendarEntry>`, this cast is no longer necessary.
      const existingEntry = entryMap.get(entryId);
      
      let currentPrice = existingEntry ? existingEntry.price : property.basePrice;
      let currentStatus = existingEntry ? existingEntry.status : 'available';

      if (currentStatus === 'booked' && action.type !== 'setStatus') continue;

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
      
      const hasNote = existingEntry?.notes && existingEntry.notes.trim() !== '';
      const isDefaultState = newStatus === 'available' && newPrice === property.basePrice;
      // FIX: Use v8 firestore syntax
      const docRef = db_firebase.collection('calendarEntries').doc(entryId);
      
      if (isDefaultState && !hasNote) {
        if(existingEntry) batch.delete(docRef);
      } else {
        batch.set(docRef, { propertyId, date: dateStr, status: newStatus, price: newPrice, notes: existingEntry?.notes || '' });
      }
      updatedCount++;
    }

    await batch.commit();
    return { updatedCount };
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