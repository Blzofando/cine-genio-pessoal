// services/firestoreService.ts

import { db } from './firebaseConfig';
import { collection, doc, getDocs, setDoc, deleteDoc, updateDoc, WriteBatch, writeBatch } from "firebase/firestore";
import { ManagedWatchedItem, Rating } from '../types';

// O nome da nossa coleção no Firestore
const COLLECTION_NAME = 'watchedItems';

/**
 * Busca todos os itens da coleção no Firestore.
 */
export const getWatchedItems = async (): Promise<ManagedWatchedItem[]> => {
    const querySnapshot = await getDocs(collection(db, COLLECTION_NAME));
    const items: ManagedWatchedItem[] = [];
    querySnapshot.forEach((doc) => {
        // Adiciona o item ao array, garantindo que ele tenha o formato correto
        items.push(doc.data() as ManagedWatchedItem);
    });
    return items;
};

/**
 * Adiciona um novo item (documento) à coleção.
 * Usamos setDoc com o ID do item para evitar duplicatas.
 */
export const addWatchedItem = async (itemData: ManagedWatchedItem): Promise<void> => {
    // Cria uma referência para o documento usando o ID do TMDB como identificador único
    const itemDocRef = doc(db, COLLECTION_NAME, itemData.id.toString());
    await setDoc(itemDocRef, itemData);
};

/**
 * Remove um item da coleção usando seu ID.
 */
export const removeWatchedItem = async (id: number): Promise<void> => {
    const itemDocRef = doc(db, COLLECTION_NAME, id.toString());
    await deleteDoc(itemDocRef);
};

/**
 * Atualiza um item existente na coleção.
 * Útil para adicionar posterUrl ou sinopse depois.
 */
export const updateWatchedItem = async (id: number, updatedData: Partial<ManagedWatchedItem>): Promise<void> => {
    const itemDocRef = doc(db, COLLECTION_NAME, id.toString());
    await updateDoc(itemDocRef, updatedData);
};