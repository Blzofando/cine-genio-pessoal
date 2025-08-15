// services/firestoreService.ts

import { db } from './firebaseConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { ManagedWatchedItem, Rating, WatchlistItem } from '../types';

// --- COLEÇÃO PRINCIPAL (ASSISTIDOS) ---
const WATCHED_COLLECTION_NAME = 'watchedItems';

export const getWatchedItems = async (): Promise<ManagedWatchedItem[]> => {
    // ... (código existente inalterado)
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

/**
 * NOVO: Atualiza campos de um item existente na watchlist.
 * Usado para salvar a probabilidade de "amar".
 */
export const updateWatchlistItem = async (id: number, dataToUpdate: Partial<WatchlistItem>): Promise<void> => {
    const itemDocRef = doc(db, WATCHLIST_COLLECTION_NAME, id.toString());
    await updateDoc(itemDocRef, dataToUpdate);
};