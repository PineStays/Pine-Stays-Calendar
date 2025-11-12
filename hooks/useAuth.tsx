import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User, UserRole, UserStatus } from '../types';
// FIX: Update imports to use v8 compat version from firebase service
import { auth, db_firebase, firebase } from '../services/firebase';

// FIX: Define FirebaseUser type using v8 compat firebase namespace
type FirebaseUser = firebase.User;


interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUserInContext: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // FIX: Use v8 onAuthStateChanged method
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: FirebaseUser | null) => {
      if (firebaseUser) {
        // User is signed in, get their profile from Firestore
        // FIX: Use v8 firestore syntax
        const userDocRef = db_firebase.collection('users').doc(firebaseUser.uid);
        const userDoc = await userDocRef.get();
        if (userDoc.exists) {
          setUser({ id: userDoc.id, ...userDoc.data() } as User);
        } else {
          // This can happen due to a race condition on signup, which is now handled in the signup function.
          // If it still occurs, it's a critical inconsistency. Log the user out to prevent a broken state.
          console.error("User is authenticated, but no profile found in Firestore. Logging out to prevent inconsistent state.");
          await auth.signOut();
        }
      } else {
        // User is signed out
        setUser(null);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    // Special "first-time admin setup" logic.
    if (email === 'admin@pinestays.in' && password === 'pswd02@Admin') {
      try {
        // First, try to sign in normally.
        await auth.signInWithEmailAndPassword(email, password);
        // If successful, onAuthStateChanged will handle the rest.
      } catch (error: any) {
        // If the user does not exist, create them as an admin.
        if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
          console.log("Admin user not found. Attempting to create a new admin account...");
          try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const firebaseUser = userCredential.user;
            if (!firebaseUser) {
              throw new Error("Could not create admin user in Firebase Auth.");
            }
            
            const adminUser: Omit<User, 'id'> = {
              name: 'Administrator',
              email: email,
              role: 'admin',
              status: 'active',
            };
            await db_firebase.collection('users').doc(firebaseUser.uid).set(adminUser);
            
            // Manually set the user state to complete the login process immediately.
            setUser({ id: firebaseUser.uid, ...adminUser } as User);
            return; // Exit here to prevent onAuthStateChanged race condition
          } catch (creationError) {
            console.error("Failed to create the hardcoded admin user:", creationError);
            throw new Error("Failed to create the initial admin user. Please check your Firebase rules or logs.");
          }
        }
        // If it's another type of error (e.g., wrong password for an existing admin), re-throw it.
        throw error;
      }
    } else {
      // For all other users, proceed with the standard login process.
      await auth.signInWithEmailAndPassword(email, password);
      // onAuthStateChanged will handle setting the user state
    }
  };
  
  const signup = async (name: string, email: string, password: string): Promise<void> => {
     // Check if this is the first user signing up.
    // FIX: Use v8 firestore syntax
    const usersRef = db_firebase.collection('users');
    const q = usersRef.limit(1);
    const snapshot = await q.get();
    let role: UserRole = 'agent';
    let status: UserStatus = 'pending';

    if (snapshot.empty) {
        // This is the first user, make them an admin.
        console.log("First user signing up. Assigning admin role.");
        role = 'admin';
        status = 'active';
    }

    // FIX: Use v8 createUserWithEmailAndPassword method
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const firebaseUser = userCredential.user;

    if (!firebaseUser) {
      throw new Error("User could not be created.");
    }

    // Create user profile document in Firestore
    const newUser: Omit<User, 'id'> = {
        name,
        email,
        role,
        status,
    };
    // FIX: Use v8 firestore syntax
    await db_firebase.collection('users').doc(firebaseUser.uid).set(newUser);
    
    // Manually set the user state to prevent a race condition with onAuthStateChanged
    // where the listener might fire before the Firestore document is created.
    setUser({ id: firebaseUser.uid, ...newUser } as User);
  };

  const logout = async () => {
    // FIX: Use v8 signOut method
    await auth.signOut();
    // onAuthStateChanged will set user to null
  };
  
  const updateUserInContext = (updates: Partial<User>) => {
    if(user){
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      // In a real-time app, this would ideally be handled by a listener
      // But for now, optimistic update is fine. The user's doc in Firestore should be updated elsewhere.
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, updateUserInContext }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};