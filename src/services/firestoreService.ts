// src/services/firestoreService.ts

import { db } from './firebaseConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { ManagedWatchedItem, Rating, WatchlistItem, RadarItem, CalendarItem, Challenge } from '../types';

// --- COLEÇÃO PRINCIPAL (ASSISTIDOS) ---
const WATCHED_COLLECTION_NAME = 'watchedItems';
export const getWatchedItems = async (): Promise<ManagedWatchedItem[]> => {
    const querySnapshot = await getDocs(collection(db, WATCHED_COLLECTION_NAME));
    const items: ManagedWatchedItem[] = [];
    querySnapshot.forEach((doc) => {
        items.push(doc.data() as ManagedWatchedItem);
    });
    return items;
};

export const addWatchedItem = async (itemData: ManagedWatchedItem): Promise<void> => {
    const itemDocRef = doc(db, WATCHED_COLLECTION_NAME, itemData.id.toString());
    await setDoc(itemDocRef, itemData);
};

export const removeWatchedItem = async (id: number): Promise<void> => {
    const itemDocRef = doc(db, WATCHED_COLLECTION_NAME, id.toString());
    await deleteDoc(itemDocRef);
};

export const updateWatchedItem = async (id: number, updatedData: Partial<ManagedWatchedItem>): Promise<void> => {
    const itemDocRef = doc(db, WATCHED_COLLECTION_NAME, id.toString());
    await updateDoc(itemDocRef, updatedData);
};


// --- COLEÇÃO DA WATCHLIST ---
const WATCHLIST_COLLECTION_NAME = 'watchlist';

export const addToWatchlist = async (itemData: WatchlistItem): Promise<void> => {
    const itemDocRef = doc(db, WATCHLIST_COLLECTION_NAME, itemData.id.toString());
    await setDoc(itemDocRef, itemData);
};

export const removeFromWatchlist = async (id: number): Promise<void> => {
    const itemDocRef = doc(db, WATCHLIST_COLLECTION_NAME, id.toString());
    await deleteDoc(itemDocRef);
};

export const updateWatchlistItem = async (id: number, dataToUpdate: Partial<WatchlistItem>): Promise<void> => {
    const itemDocRef = doc(db, WATCHLIST_COLLECTION_NAME, id.toString());
    await updateDoc(itemDocRef, dataToUpdate);
};


// --- FUNÇÕES PARA O RADAR DE LANÇAMENTOS ---
const RELEASES_COLLECTION_NAME = 'relevantReleases';
const CALENDAR_COLLECTION_NAME = 'myCalendar';

export const getRelevantReleases = async (): Promise<RadarItem[]> => {
    const querySnapshot = await getDocs(collection(db, RELEASES_COLLECTION_NAME));
    const items: RadarItem[] = [];
    querySnapshot.forEach((doc) => { items.push(doc.data() as RadarItem); });
    return items;
};

export const setRelevantReleases = async (releases: RadarItem[]): Promise<void> => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, RELEASES_COLLECTION_NAME);
    const oldDocsSnapshot = await getDocs(collectionRef);
    oldDocsSnapshot.forEach(document => { batch.delete(document.ref); });
    releases.forEach(release => {
        const newDocRef = doc(collectionRef, release.id.toString());
        batch.set(newDocRef, release);
    });
    await batch.commit();
};

export const getMyCalendar = async (): Promise<CalendarItem[]> => {
    const querySnapshot = await getDocs(collection(db, CALENDAR_COLLECTION_NAME));
    const items: CalendarItem[] = [];
    querySnapshot.forEach((doc) => { items.push(doc.data() as CalendarItem); });
    return items;
};

export const addToMyCalendar = async (itemData: CalendarItem): Promise<void> => {
    const itemDocRef = doc(db, CALENDAR_COLLECTION_NAME, itemData.id.toString());
    await setDoc(itemDocRef, itemData);
};

export const removeFromMyCalendar = async (id: number): Promise<void> => {
    const itemDocRef = doc(db, CALENDAR_COLLECTION_NAME, id.toString());
    await deleteDoc(itemDocRef);
};

// --- FUNÇÕES PARA OS DESAFIOS ---
const CHALLENGES_COLLECTION_NAME = 'challenges';
export const getChallengesHistory = async (): Promise<Challenge[]> => {
    const querySnapshot = await getDocs(collection(db, CHALLENGES_COLLECTION_NAME));
    const items: Challenge[] = [];
    querySnapshot.forEach((doc) => { items.push(doc.data() as Challenge); });
    return items;
};