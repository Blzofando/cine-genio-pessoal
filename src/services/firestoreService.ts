// services/firestoreService.ts

import { db } from './firebaseConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, writeBatch } from "firebase/firestore";
import { ManagedWatchedItem, Rating, WatchlistItem, RadarItem, CalendarItem } from '../types';

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


// --- NOVAS FUNÇÕES PARA O RADAR DE LANÇAMENTOS ---

const RELEASES_COLLECTION_NAME = 'relevantReleases';
const CALENDAR_COLLECTION_NAME = 'myCalendar';

/**
 * Busca a lista de lançamentos relevantes que a IA gerou.
 */
export const getRelevantReleases = async (): Promise<RadarItem[]> => {
    const querySnapshot = await getDocs(collection(db, RELEASES_COLLECTION_NAME));
    const items: RadarItem[] = [];
    querySnapshot.forEach((doc) => {
        items.push(doc.data() as RadarItem);
    });
    return items;
};

/**
 * Apaga a lista antiga de lançamentos relevantes e salva a nova.
 * Usa um batch para garantir que a operação seja atômica.
 */
export const setRelevantReleases = async (releases: RadarItem[]): Promise<void> => {
    const batch = writeBatch(db);
    const collectionRef = collection(db, RELEASES_COLLECTION_NAME);

    // Etapa 1: Apagar todos os documentos antigos
    const oldDocsSnapshot = await getDocs(collectionRef);
    oldDocsSnapshot.forEach(document => {
        batch.delete(document.ref);
    });

    // Etapa 2: Adicionar todos os novos documentos
    releases.forEach(release => {
        const newDocRef = doc(collectionRef, release.id.toString());
        batch.set(newDocRef, release);
    });

    await batch.commit();
};

/**
 * Busca os itens que o usuário salvou no seu calendário pessoal.
 */
export const getMyCalendar = async (): Promise<CalendarItem[]> => {
    const querySnapshot = await getDocs(collection(db, CALENDAR_COLLECTION_NAME));
    const items: CalendarItem[] = [];
    querySnapshot.forEach((doc) => {
        items.push(doc.data() as CalendarItem);
    });
    return items;
};

/**
 * Adiciona um item ao calendário pessoal do usuário.
 */
export const addToMyCalendar = async (itemData: CalendarItem): Promise<void> => {
    const itemDocRef = doc(db, CALENDAR_COLLECTION_NAME, itemData.id.toString());
    await setDoc(itemDocRef, itemData);
};

/**
 * Remove um item do calendário pessoal do usuário.
 */
export const removeFromMyCalendar = async (id: number): Promise<void> => {
    const itemDocRef = doc(db, CALENDAR_COLLECTION_NAME, id.toString());
    await deleteDoc(itemDocRef);
};