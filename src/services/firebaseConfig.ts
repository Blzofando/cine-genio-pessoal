// services/firebaseConfig.ts

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Substitua o objeto abaixo pelas credenciais do SEU projeto Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB8484n2o2Ab4OjTis-xAEwHQJYWMKL1xU",
  authDomain: "cine-genio-pessoal.firebaseapp.com",
  projectId: "cine-genio-pessoal",
  storageBucket: "cine-genio-pessoal.firebasestorage.app",
  messagingSenderId: "396991223598",
  appId: "1:396991223598:web:19770601cafe22449a8cbf"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta a instância do banco de dados para usarmos em outros lugares
export const db = getFirestore(app);