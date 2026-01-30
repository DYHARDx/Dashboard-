// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyA9cAOCHAmVFYBEjGL1IlJEXaweREV0GfY",
    authDomain: "testing-1a3f6.firebaseapp.com",
    databaseURL: "https://testing-1a3f6-default-rtdb.firebaseio.com",
    projectId: "testing-1a3f6",
    storageBucket: "testing-1a3f6.firebasestorage.app",
    messagingSenderId: "377594262331",
    appId: "1:377594262331:web:fc41692a34e9daca4d3d1e",
    measurementId: "G-FC3SJK9ZYR"
};

// Initialize Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword, // Added Register function
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    getDocs,
    doc,
    getDoc,
    addDoc,
    query,
    where,
    orderBy,
    limit,
    serverTimestamp,
    updateDoc,
    deleteDoc,
    setDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Auth Services ---
export const loginUser = (email, password) => {
    return signInWithEmailAndPassword(auth, email, password);
};

// --- Admin Specific Services (Secondary Instance) ---
import { getAuth as getSecondaryAuth, createUserWithEmailAndPassword as createSecondaryUser, signOut as secondarySignOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

export const registerUserByAdmin = async (email, password, fullName, role = "affiliate") => {
    // We initialize a secondary app to avoid logging out the current Admin
    const secondaryApp = initializeApp(firebaseConfig, "SecondaryInstance_" + Date.now());
    const secondaryAuth = getSecondaryAuth(secondaryApp);

    try {
        const userCredential = await createSecondaryUser(secondaryAuth, email, password);
        const user = userCredential.user;

        // Create Profile in Firestore using the main DB instance
        await setDoc(doc(db, "users", user.uid), {
            name: fullName,
            email: email,
            role: role,
            status: "Active",
            joinedAt: serverTimestamp(),
            balance: 0
        });

        // Log out from secondary instance immediately
        await secondarySignOut(secondaryAuth);

        return user;
    } catch (error) {
        throw error;
    }
};

export const registerUser = async (email, password, fullName, role = "affiliate") => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create Profile in Firestore
    await setDoc(doc(db, "users", user.uid), {
        name: fullName,
        email: email,
        role: role, // Default role or admin
        status: "Active", // Auto-activate for new signups?
        joinedAt: serverTimestamp(),
        balance: 0
    });

    return userCredential;
};

// Get User Profile
export const getUserProfile = async (uid) => {
    const docRef = doc(db, "users", uid);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return docSnap.data();
    }
    return null;
};

// 1. Auth State Listener
export const checkAuth = (callback) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const profile = await getUserProfile(user.uid);
            callback(user, profile);
        } else {
            callback(null, null);
        }
    });
};

export const logoutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        throw error;
    }
};

export const deleteUserAccount = async (uid) => {
    // Note: Deleting from Auth usually requires Admin SDK
    // For client-side, we just delete the Firestore profile
    await deleteDoc(doc(db, "users", uid));
};

// --- Database Services ---

// 1. Offers
export const createOffer = async (offerData) => {
    try {
        const docRef = await addDoc(collection(db, "offers"), {
            ...offerData,
            createdAt: serverTimestamp(),
            status: "active"
        });
        return docRef.id;
    } catch (e) {
        console.error("Error creating offer: ", e);
        throw e;
    }
};

export const getOffers = async () => {
    try {
        const q = query(collection(db, "offers"), orderBy("createdAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching offers: ", e);
        // Fallback or empty array
        return [];
    }
};

// 2. Stats & Analytics
export const getDashboardStats = async () => {
    try {
        const docRef = doc(db, "analytics", "today");
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            return { revenue: 0, conversions: 0, clicks: 0 };
        }
    } catch (e) {
        console.warn("Could not fetch stats (Likely permission/empty db):", e);
        return { revenue: 0, conversions: 0, clicks: 0 };
    }
};

// 3. Recent Conversions & Logs
export const getRecentConversions = async () => {
    try {
        const q = query(collection(db, "conversions"), orderBy("timestamp", "desc"), limit(10));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return [];
    }
};

export const getAffiliateConversions = async (affiliateId) => {
    try {
        const q = query(
            collection(db, "conversions"),
            where("affiliate_id", "==", affiliateId),
            orderBy("timestamp", "desc"),
            limit(10)
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching affiliate conversions:", e);
        return [];
    }
};

export const getAffiliateStats = async (affiliateId) => {
    try {
        // In a production app, you'd use a dedicated 'affiliate_analytics' collection
        // For now, we'll fetch today's conversions to calculate earnings
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const q = query(
            collection(db, "conversions"),
            where("affiliate_id", "==", affiliateId),
            where("timestamp", ">=", today)
        );
        const snapshot = await getDocs(q);

        let earnings = 0;
        let conversions = 0;

        snapshot.forEach(doc => {
            const data = doc.data();
            earnings += (data.payout || 0);
            conversions++;
        });

        // Clicks are harder to count without a dedicated collection, 
        // return dummy or look in 'clicks' collection if it exists
        return {
            todayEarnings: earnings,
            conversions: conversions,
            clicks: conversions * 12 // Simulated clicks for UI
        };
    } catch (e) {
        console.error("Error fetching affiliate stats:", e);
        return { todayEarnings: 0, conversions: 0, clicks: 0 };
    }
};

// 4. Affiliates
export const getAffiliates = async () => {
    try {
        // In a real app, you might filter by role="affiliate"
        // For now, we list all users or a specific collection
        const q = query(collection(db, "users"), orderBy("joinedAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return []; // Return empty if collection doesn't exist yet
    }
};

// 5. Advertisers
export const getAdvertisers = async () => {
    try {
        const q = query(collection(db, "advertisers"), orderBy("name"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return [];
    }
};

// 6. Invoices
export const getInvoices = async () => {
    try {
        const q = query(collection(db, "invoices"), orderBy("date", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return [];
    }
};

export const getAffiliateInvoices = async (affiliateId) => {
    try {
        const q = query(
            collection(db, "invoices"),
            where("affiliate_id", "==", affiliateId),
            orderBy("date", "desc")
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error("Error fetching affiliate invoices:", e);
        return [];
    }
};

// 7. Postback Logs
export const getPostbackLogs = async () => {
    try {
        const q = query(collection(db, "postback_logs"), orderBy("timestamp", "desc"), limit(50));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        return [];
    }
};

// 8. Create Helpers
export const createAffiliate = async (data) => {
    return addDoc(collection(db, "users"), {
        ...data,
        role: "affiliate",
        joinedAt: serverTimestamp(),
        balance: 0,
        status: "Active"
    });
};

export const createAdvertiser = async (data) => {
    return addDoc(collection(db, "advertisers"), {
        ...data,
        active_offers: 0,
        total_payout: 0
    });
};

// 9. Update Helpers
export const updateAffiliate = async (id, data) => {
    const docRef = doc(db, "users", id);
    await updateDoc(docRef, data);
};

export const updateAdvertiser = async (id, data) => {
    const docRef = doc(db, "advertisers", id);
    await updateDoc(docRef, data);
};

export const deleteAffiliate = async (id) => {
    await deleteDoc(doc(db, "users", id));
};

// 10. IP Whitelist
export const getIPs = async () => {
    try {
        const q = query(collection(db, "ip_whitelist"), orderBy("addedAt", "desc"));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { return []; }
};

export const addIP = async (ip, desc) => {
    return addDoc(collection(db, "ip_whitelist"), {
        ip, description: desc,
        addedAt: serverTimestamp(),
        addedBy: "Admin"
    });
};

export const deleteIP = async (id) => {
    await deleteDoc(doc(db, "ip_whitelist", id));
};

// 11. Settings
export const getSettings = async () => {
    try {
        const docSnap = await getDoc(doc(db, "settings", "global"));
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { return null; }
};

export const saveSettings = async (data) => {
    await setDoc(doc(db, "settings", "global"), data, { merge: true });
};

export { auth, db };
