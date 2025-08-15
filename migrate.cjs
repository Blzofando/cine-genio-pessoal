// migrate.js

// Importa as ferramentas necessárias do Firebase
const { initializeApp } = require("firebase/app");
const { getFirestore, collection, writeBatch, doc } = require("firebase/firestore");

// --- ATENÇÃO AQUI ---
// COLE A CONFIGURAÇÃO DO SEU FIREBASE AQUI (a mesma do arquivo firebaseConfig.ts)
const firebaseConfig = {
  apiKey: "AIzaSyB8484n2o2Ab4OjTis-xAEwHQJYWMKL1xU",
  authDomain: "cine-genio-pessoal.firebaseapp.com",
  projectId: "cine-genio-pessoal",
  storageBucket: "cine-genio-pessoal.firebasestorage.app",
  messagingSenderId: "396991223598",
  appId: "1:396991223598:web:19770601cafe22449a8cbf"
};

// --- SUA COLEÇÃO COMPLETA ---
// Eu já coletei os dados de todos os seus arquivos aqui.

const ameiList = [
  { id: 142, tmdbMediaType: 'movie', title: 'O Segredo de Brokeback Mountain (2005)', type: 'Filme', genre: 'Drama' },
  { id: 505600, tmdbMediaType: 'movie', title: 'Fora de Série (2019)', type: 'Filme', genre: 'Comédia' },
  { id: 846250, tmdbMediaType: 'movie', title: 'Fire Island: Orgulho & Sedução (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 10330, tmdbMediaType: 'movie', title: 'Sexta-Feira Muito Louca (2003)', type: 'Filme', genre: 'Família' },
  { id: 1078605, tmdbMediaType: 'movie', title: 'A Hora do Mal (2025)', type: 'Filme', genre: 'Terror' },
  { id: 1061474, tmdbMediaType: 'movie', title: 'Superman (2025)', type: 'Filme', genre: 'Ficção científica' },
  { id: 617126, tmdbMediaType: 'movie', title: 'Quarteto Fantástico: Primeiros Passos (2025)', type: 'Filme', genre: 'Ficção científica' },
  { id: 1087192, tmdbMediaType: 'movie', title: 'Como Treinar o Seu Dragão (2025)', type: 'Filme', genre: 'Fantasia' },
  { id: 482321, tmdbMediaType: 'movie', title: 'Ron Bugado (2021)', type: 'Filme', genre: 'Animação' },
  { id: 260458, tmdbMediaType: 'tv', title: 'Adults (2025)', type: 'Série', genre: 'Comédia' },
  { id: 993710, tmdbMediaType: 'movie', title: 'Back in Action (2025)', type: 'Filme', genre: 'Ação' },
  { id: 1284120, tmdbMediaType: 'movie', title: 'The Ugly Stepsister (2025)', type: 'Filme', genre: 'Terror' },
  { id: 86838, tmdbMediaType: 'movie', title: 'Sete Psicopatas e um Shih Tzu (2012)', type: 'Filme', genre: 'Comédia' },
  { id: 236235, tmdbMediaType: 'tv', title: 'Magnatas do Crime (2024)', type: 'Série', genre: 'Ação' },
  { id: 243963, tmdbMediaType: 'tv', title: 'The Pradeeps of Pittsburgh (2023)', type: 'Série', genre: 'Comédia' },
  { id: 1232546, tmdbMediaType: 'movie', title: 'Until Dawn (2025)', type: 'Filme', genre: 'Terror' },
  { id: 255779, tmdbMediaType: 'tv', title: 'Bet (2025)', type: 'Série', genre: 'Drama' },
  { id: 718930, tmdbMediaType: 'movie', title: 'Trem-Bala (2022)', type: 'Filme', genre: 'Ação' },
  { id: 516632, tmdbMediaType: 'movie', title: 'The Empty Man (2020)', type: 'Filme', genre: 'Terror' },
  { id: 1233413, tmdbMediaType: 'movie', title: 'Sinners (2025)', type: 'Filme', genre: 'Terror' },
  { id: 363088, tmdbMediaType: 'movie', title: 'Homem-Formiga e a Vespa (2018)', type: 'Filme', genre: 'Ação' },
  { id: 247619, tmdbMediaType: 'tv', title: 'Overcompensating (2025)', type: 'Série', genre: 'Comédia' },
  { id: 974573, tmdbMediaType: 'movie', title: 'Um Pequeno Favor 2 (2025)', type: 'Filme', genre: 'Comédia' },
  { id: 1084199, tmdbMediaType: 'movie', title: 'Companion (2025)', type: 'Filme', genre: 'Ficção científica' },
  { id: 95396, tmdbMediaType: 'tv', title: 'Ruptura (2022)', type: 'Série', genre: 'Drama' },
  { id: 11324, tmdbMediaType: 'movie', title: 'Ilha do Medo (2010)', type: 'Filme', genre: 'Mistério' },
  { id: 146233, tmdbMediaType: 'movie', title: 'Os Suspeitos (2013)', type: 'Filme', genre: 'Suspense' },
  { id: 42009, tmdbMediaType: 'tv', title: 'Black Mirror (2011)', type: 'Série', genre: 'Ficção científica' },
  { id: 696506, tmdbMediaType: 'movie', title: 'Mickey 17 (2026)', type: 'Filme', genre: 'Ficção científica' },
  { id: 117465, tmdbMediaType: 'tv', title: 'Hell\'s Paradise: Jigokuraku (2023)', type: 'Série', genre: 'Animação' },
  { id: 270474, tmdbMediaType: 'tv', title: 'Even Given the Worthless \'Appraiser\' Class, I\'m Actually the Strongest (2025)', type: 'Série', genre: 'Animação' },
  { id: 1241982, tmdbMediaType: 'movie', title: 'Moana 2 (2024)', type: 'Filme', genre: 'Animação' },
  { id: 393559, tmdbMediaType: 'movie', title: 'Minha Vida de Abobrinha (2016)', type: 'Filme', genre: 'Animação' },
  { id: 43939, tmdbMediaType: 'movie', title: 'I\'m Still Here (2010)', type: 'Filme', genre: 'Comédia' },
  { id: 1064213, tmdbMediaType: 'movie', title: 'Anora (2024)', type: 'Filme', genre: 'Drama' },
  { id: 661374, tmdbMediaType: 'movie', title: 'Glass Onion: Um Mistério Knives Out (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 220289, tmdbMediaType: 'movie', title: 'Coerência (2013)', type: 'Filme', genre: 'Mistério' },
  { id: 539972, tmdbMediaType: 'movie', title: 'Kraven, o Caçador (2024)', type: 'Filme', genre: 'Ação' },
  { id: 8065, tmdbMediaType: 'movie', title: 'Quebrando a Banca (2008)', type: 'Filme', genre: 'Drama' },
  { id: 797838, tmdbMediaType: 'movie', title: 'Firebird (2021)', type: 'Filme', genre: 'Romance' },
  { id: 106646, tmdbMediaType: 'movie', title: 'O Lobo de Wall Street (2013)', type: 'Filme', genre: 'Crime' },
  { id: 125988, tmdbMediaType: 'tv', title: 'Silo (2023)', type: 'Série', genre: 'Drama' },
  { id: 402431, tmdbMediaType: 'movie', title: 'Wicked (2024)', type: 'Filme', genre: 'Fantasia' },
  { id: 218230, tmdbMediaType: 'tv', title: 'O Jogo da Morte (2023)', type: 'Série', genre: 'Drama' },
  { id: 577922, tmdbMediaType: 'movie', title: 'Tenet (2020)', type: 'Filme', genre: 'Ação' },
  { id: 213331, tmdbMediaType: 'tv', title: 'Berserk of Gluttony (2023)', type: 'Série', genre: 'Animação' },
  { id: 240411, tmdbMediaType: 'tv', title: 'Dandadan (2024)', type: 'Série', genre: 'Animação' },
  { id: 620683, tmdbMediaType: 'movie', title: 'Minha Mãe é uma Peça 3: O Filme (2019)', type: 'Filme', genre: 'Comédia' },
  { id: 261579, tmdbMediaType: 'tv', title: 'Secret Level (2024)', type: 'Série', genre: 'Animação' },
  { id: 912649, tmdbMediaType: 'movie', title: 'Venom: A Última Rodada (2024)', type: 'Filme', genre: 'Ação' },
  { id: 27205, tmdbMediaType: 'movie', title: 'A Origem (2010)', type: 'Filme', genre: 'Ficção científica' },
  { id: 245312, tmdbMediaType: 'tv', title: 'A Man on the Inside (2024)', type: 'Série', genre: 'Comédia' },
  { id: 945961, tmdbMediaType: 'movie', title: 'Alien: Romulus (2024)', type: 'Filme', genre: 'Ficção científica' },
  { id: 1184918, tmdbMediaType: 'movie', title: 'Robô Selvagem (2024)', type: 'Filme', genre: 'Animação' },
  { id: 335983, tmdbMediaType: 'movie', title: 'Venom (2018)', type: 'Filme', genre: 'Ação' },
  { id: 580489, tmdbMediaType: 'movie', title: 'Venom: Tempo de Carnificina (2021)', type: 'Filme', genre: 'Ação' },
  { id: 1029281, tmdbMediaType: 'movie', title: 'Strange Darling (2023)', type: 'Filme', genre: 'Suspense' },
  { id: 947891, tmdbMediaType: 'movie', title: 'My Old Ass (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 1118031, tmdbMediaType: 'movie', title: 'Apocalipse Z: O Princípio do Fim (2024)', type: 'Filme', genre: 'Ação' },
  { id: 989662, tmdbMediaType: 'movie', title: 'A Different Man (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 1359, tmdbMediaType: 'movie', title: 'Psicopata Americano (2000)', type: 'Filme', genre: 'Suspense' },
  { id: 128, tmdbMediaType: 'movie', title: 'Princesa Mononoke (1997)', type: 'Filme', genre: 'Animação' },
  { id: 138501, tmdbMediaType: 'tv', title: 'Agatha All Along (2024)', type: 'Série', genre: 'Fantasia' },
  { id: 227837, tmdbMediaType: 'tv', title: 'Good Times (2024)', type: 'Série', genre: 'Animação' },
  { id: 1100782, tmdbMediaType: 'movie', title: 'Sorria 2 (2024)', type: 'Filme', genre: 'Terror' },
  { id: 889737, tmdbMediaType: 'movie', title: 'Coringa: Delírio a Dois (2024)', type: 'Filme', genre: 'Crime' },
  { id: 1125510, tmdbMediaType: 'movie', title: 'O Poço 2 (2024)', type: 'Filme', genre: 'Ficção científica' },
  { id: 840705, tmdbMediaType: 'movie', title: 'Blink Twice (2024)', type: 'Filme', genre: 'Suspense' },
  { id: 957304, tmdbMediaType: 'movie', title: 'Garotas em Fuga (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 1032823, tmdbMediaType: 'movie', title: 'Armadilha (2024)', type: 'Filme', genre: 'Suspense' },
  { id: 1019411, tmdbMediaType: 'movie', title: 'Space Cadet (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 974635, tmdbMediaType: 'movie', title: 'Assassino por Acaso (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 614939, tmdbMediaType: 'movie', title: 'Mais que Amigos (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 519182, tmdbMediaType: 'movie', title: 'Meu Malvado Favorito 4 (2024)', type: 'Filme', genre: 'Animação' },
  { id: 1226578, tmdbMediaType: 'movie', title: 'Longlegs (2024)', type: 'Filme', genre: 'Terror' },
  { id: 593643, tmdbMediaType: 'movie', title: 'O Menu (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 1023922, tmdbMediaType: 'movie', title: 'MaXXXine (2024)', type: 'Filme', genre: 'Terror' },
  { id: 533535, tmdbMediaType: 'movie', title: 'Deadpool & Wolverine (2024)', type: 'Filme', genre: 'Ação' },
  { id: 156933, tmdbMediaType: 'tv', title: 'Acima de Qualquer Suspeita (2024)', type: 'Série', genre: 'Mistério' },
  { id: 419430, tmdbMediaType: 'movie', title: 'Corra! (2017)', type: 'Filme', genre: 'Terror' },
  { id: 1151534, tmdbMediaType: 'movie', title: 'Destino à Deriva (2023)', type: 'Filme', genre: 'Suspense' },
  { id: 205596, tmdbMediaType: 'movie', title: 'O Jogo da Imitação (2014)', type: 'Filme', genre: 'História' },
  { id: 437342, tmdbMediaType: 'movie', title: 'A Primeira Profecia (2024)', type: 'Filme', genre: 'Terror' },
  { id: 280180, tmdbMediaType: 'movie', title: 'Um Tira da Pesada 4: Axel Foley (2024)', type: 'Filme', genre: 'Ação' },
  { id: 670, tmdbMediaType: 'movie', title: 'Oldboy (2003)', type: 'Filme', genre: 'Drama' },
  { id: 1022789, tmdbMediaType: 'movie', title: 'Divertida Mente 2 (2024)', type: 'Filme', genre: 'Animação' },
  { id: 63039, tmdbMediaType: 'tv', title: 'Bordertown (2016)', type: 'Série', genre: 'Animação' },
  { id: 756999, tmdbMediaType: 'movie', title: 'O Telefone Preto (2021)', type: 'Filme', genre: 'Terror' },
  { id: 746036, tmdbMediaType: 'movie', title: 'O Dublê (2024)', type: 'Filme', genre: 'Ação' },
  { id: 719221, tmdbMediaType: 'movie', title: 'O Tarô da Morte (2024)', type: 'Filme', genre: 'Terror' },
  { id: 156484, tmdbMediaType: 'tv', title: 'The 8 Show (2024)', type: 'Série', genre: 'Comédia' },
  { id: 250670, tmdbMediaType: 'tv', title: 'Maxton Hall: O Mundo Entre Nós (2024)', type: 'Série', genre: 'Drama' },
  { id: 39340, tmdbMediaType: 'tv', title: 'Duas Garotas em Apuros (2011)', type: 'Série', genre: 'Comédia' },
  { id: 106379, tmdbMediaType: 'tv', title: 'Fallout (2024)', type: 'Série', genre: 'Ficção científica' },
  { id: 94954, tmdbMediaType: 'tv', title: 'Hazbin Hotel (2024)', type: 'Série', genre: 'Animação' },
  { id: 51876, tmdbMediaType: 'movie', title: 'Limitless (2015)', type: 'Filme', genre: 'Drama' },
  { id: 667216, tmdbMediaType: 'movie', title: 'Infinity Pool (2023)', type: 'Filme', genre: 'Terror' },
  { id: 556694, tmdbMediaType: 'movie', title: 'Era Uma Vez um Gênio (2022)', type: 'Filme', genre: 'Fantasia' },
  { id: 787699, tmdbMediaType: 'movie', title: 'Wonka (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 937278, tmdbMediaType: 'movie', title: 'O Pior Vizinho do Mundo (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 152532, tmdbMediaType: 'movie', title: 'Clube de Compras Dallas (2013)', type: 'Filme', genre: 'Drama' },
  { id: 290250, tmdbMediaType: 'movie', title: 'Dois Caras Legais (2016)', type: 'Filme', genre: 'Ação' },
  { id: 111819, tmdbMediaType: 'tv', title: 'Tsukimichi: Moonlit Fantasy (2021)', type: 'Série', genre: 'Animação' },
  { id: 968, tmdbMediaType: 'movie', title: 'Um Dia de Cão (1975)', type: 'Filme', genre: 'Crime' },
  { id: 930564, tmdbMediaType: 'movie', title: 'Saltburn (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 814776, tmdbMediaType: 'movie', title: 'Bottoms (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 60625, tmdbMediaType: 'tv', title: 'Rick and Morty (2013)', type: 'Série', genre: 'Animação' },
  { id: 447365, tmdbMediaType: 'movie', title: 'Guardiões da Galáxia: Volume 3 (2023)', type: 'Filme', genre: 'Ação' },
  { id: 695721, tmdbMediaType: 'movie', title: 'Jogos Vorazes: A Cantiga dos Pássaros e das Serpentes (2023)', type: 'Filme', genre: 'Guerra' },
  { id: 949423, tmdbMediaType: 'movie', title: 'Pearl (2022)', type: 'Filme', genre: 'Terror' },
  { id: 760104, tmdbMediaType: 'movie', title: 'X - A Marca da Morte (2022)', type: 'Filme', genre: 'Terror' },
  { id: 95403, tmdbMediaType: 'tv', title: 'Periféricos (2022)', type: 'Série', genre: 'Drama' },
  { id: 206487, tmdbMediaType: 'movie', title: 'O Predestinado (2014)', type: 'Filme', genre: 'Ficção científica' },
  { id: 1008392, tmdbMediaType: 'movie', title: 'The Blackening (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 501170, tmdbMediaType: 'movie', title: 'Doutor Sono (2019)', type: 'Filme', genre: 'Terror' },
  { id: 694, tmdbMediaType: 'movie', title: 'O Iluminado (1980)', type: 'Filme', genre: 'Terror' },
  { id: 93405, tmdbMediaType: 'tv', title: 'Round 6 (2021)', type: 'Série', genre: 'Ação' },
  { id: 912908, tmdbMediaType: 'movie', title: 'Ruim pra Cachorro (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 508442, tmdbMediaType: 'movie', title: 'Soul (2020)', type: 'Filme', genre: 'Animação' },
  { id: 85552, tmdbMediaType: 'tv', title: 'Euphoria (2019)', type: 'Série', genre: 'Drama' },
  { id: 100088, tmdbMediaType: 'tv', title: 'The Last of Us (2023)', type: 'Série', genre: 'Drama' },
  { id: 864168, tmdbMediaType: 'movie', title: 'Loucas em Apuros (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 1399, tmdbMediaType: 'tv', title: 'A Guerra dos Tronos (2011)', type: 'Série', genre: 'Fantasia' },
  { id: 550, tmdbMediaType: 'movie', title: 'Clube da Luta (1999)', type: 'Filme', genre: 'Drama' },
  { id: 2062, tmdbMediaType: 'movie', title: 'Ratatouille (2007)', type: 'Filme', genre: 'Animação' },
  { id: 284053, tmdbMediaType: 'movie', title: 'Thor: Ragnarok (2017)', type: 'Filme', genre: 'Ação' },
  { id: 12, tmdbMediaType: 'movie', title: 'Procurando Nemo (2003)', type: 'Filme', genre: 'Animação' },
  { id: 269149, tmdbMediaType: 'movie', title: 'Zootopia: Essa Cidade é o Bicho (2016)', type: 'Filme', genre: 'Animação' },
  { id: 507089, tmdbMediaType: 'movie', title: 'Five Nights at Freddy\'s - O Pesadelo Sem Fim (2023)', type: 'Filme', 'genre': 'Terror' },
  { id: 48891, tmdbMediaType: 'tv', title: 'Brooklyn Nine-Nine (2013)', type: 'Série', genre: 'Comédia' },
  { id: 284052, tmdbMediaType: 'movie', title: 'Doutor Estranho (2016)', type: 'Filme', genre: 'Ação' },
  { id: 453395, tmdbMediaType: 'movie', title: 'Doutor Estranho no Multiverso da Loucura (2022)', type: 'Filme', genre: 'Ação' },
  { id: 93975, tmdbMediaType: 'tv', title: 'TharnType: The Series (2019)', type: 'Série', genre: 'Drama' },
  { id: 324857, tmdbMediaType: 'movie', title: 'Homem-Aranha no Aranhaverso (2018)', type: 'Filme', genre: 'Animação' },
  { id: 299534, tmdbMediaType: 'movie', title: 'Vingadores: Ultimato (2019)', type: 'Filme', genre: 'Ação' },
  { id: 299536, tmdbMediaType: 'movie', title: 'Vingadores: Guerra Infinita (2018)', type: 'Filme', genre: 'Ação' },
  { id: 99861, tmdbMediaType: 'movie', title: 'Vingadores: Era de Ultron (2015)', type: 'Filme', genre: 'Ação' },
  { id: 24428, tmdbMediaType: 'movie', title: 'Os Vingadores (2012)', type: 'Filme', genre: 'Ação' },
  { id: 569094, tmdbMediaType: 'movie', title: 'Homem-Aranha: Através do Aranhaverso (2023)', type: 'Filme', genre: 'Animação' },
  { id: 205715, tmdbMediaType: 'tv', title: 'Gen V (2023)', type: 'Série', genre: 'Ação' },
  { id: 84958, tmdbMediaType: 'tv', title: 'Loki (2021)', type: 'Série', genre: 'Fantasia' },
  { id: 568124, tmdbMediaType: 'movie', title: 'Encanto (2021)', type: 'Filme', genre: 'Animação' },
  { id: 493529, tmdbMediaType: 'movie', title: 'Dungeons & Dragons: Honra Entre Rebeldes (2023)', type: 'Filme', genre: 'Aventura' },
  { id: 111204, tmdbMediaType: 'tv', title: 'Cherry Magic! Thirty Years of Virginity Can Make You a Wizard?! (2020)', type: 'Série', genre: 'Comédia' },
  { id: 150540, tmdbMediaType: 'movie', title: 'Inside Out (2015)', type: 'Filme', genre: 'Animação' },
  { id: 284054, tmdbMediaType: 'movie', title: 'Black Panther (2018)', type: 'Filme', genre: 'Ação' },
  { id: 86831, tmdbMediaType: 'tv', title: 'Love, Death & Robots (2019)', type: 'Série', genre: 'Animação' },
  { id: 14836, tmdbMediaType: 'movie', title: 'Coraline (2009)', type: 'Filme', genre: 'Animação' },
  { id: 85937, tmdbMediaType: 'tv', title: 'Demon Slayer: Kimetsu no Yaiba (2019)', type: 'Série', genre: 'Animação' },
  { id: 405774, tmdbMediaType: 'movie', title: 'Bird Box (2018)', type: 'Filme', genre: 'Terror' },
  { id: 424781, tmdbMediaType: 'movie', title: 'Sorry to Bother You (2018)', type: 'Filme', genre: 'Fantasia' },
  { id: 97645, tmdbMediaType: 'tv', title: 'Solar Opposites (2020)', type: 'Série', genre: 'Animação' },
  { id: 114471, tmdbMediaType: 'tv', title: 'Ironheart (2025)', type: 'Série', genre: 'Sci-Fi & Fantasia' },
  { id: 986056, tmdbMediaType: 'movie', title: 'Thunderbolts* (2025)', type: 'Filme', genre: 'Ação' },
  { id: 545611, tmdbMediaType: 'movie', title: 'Everything Everywhere All at Once (2022)', type: 'Filme', genre: 'Ação' },
  { id: 822119, tmdbMediaType: 'movie', title: 'Captain America: Brave New World (2025)', type: 'Filme', genre: 'Ação' },
  { id: 259669, tmdbMediaType: 'tv', title: 'Olympo (2024)', type: 'Série', genre: 'Drama' },
  { id: 64688, tmdbMediaType: 'movie', title: '21 Jump Street (2012)', type: 'Filme', genre: 'Ação' },
  { id: 187017, tmdbMediaType: 'movie', title: '22 Jump Street (2014)', type: 'Filme', genre: 'Crime' },
  { id: 803796, tmdbMediaType: 'movie', title: 'K-Pop: Demon Hunters (2025)', type: 'Série', genre: 'Animação' },
  { id: 480001, tmdbMediaType: 'movie', title: 'The Art of Self-Defense (2019)', type: 'Filme', genre: 'Comédia' },
  { id: 10494, tmdbMediaType: 'movie', title: 'Perfect Blue (1998)', type: 'Filme', genre: 'Animação' },
  { id: 45612, tmdbMediaType: 'movie', title: 'Source Code (2011)', type: 'Filme', genre: 'Suspense' },
  { id: 1151031, tmdbMediaType: 'movie', title: 'Bring Her Back (2025)', type: 'Filme', genre: 'Terror' },
  { id: 399170, tmdbMediaType: 'movie', title: 'Logan Lucky (2017)', type: 'Filme', genre: 'Comédia' },
  { id: 456, tmdbMediaType: 'tv', title: 'The Simpsons (1989)', type: 'Série', genre: 'Animação' },
];

const gosteiList = [
  { id: 432383, tmdbMediaType: 'movie', title: 'Amigos Alienígenas (2018)', type: 'Filme', genre: 'Animação' },
  { id: 8843, tmdbMediaType: 'movie', title: 'A Cela (2000)', type: 'Filme', genre: 'Terror' },
  { id: 97051, tmdbMediaType: 'movie', title: 'Would You Rather (2012)', type: 'Filme', genre: 'Suspense' },
  { id: 574475, tmdbMediaType: 'movie', title: 'Final Destination: Bloodlines (2025)', type: 'Filme', genre: 'Terror' },
  { id: 1124620, tmdbMediaType: 'movie', title: 'The Monkey (2025)', type: 'Filme', genre: 'Terror' },
  { id: 807, tmdbMediaType: 'movie', title: 'Se7en (1995)', type: 'Filme', genre: 'Crime' },
  { id: 1027261, tmdbMediaType: 'movie', title: 'O Clube das Mulheres de Negócios (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 988402, tmdbMediaType: 'movie', title: 'Humanist Vampire Seeking Consenting Suicidal Person (2023)', type: 'Filme', genre: 'Romance' },
  { id: 258216, tmdbMediaType: 'movie', title: 'Nymphomaniac: Vol. I (2013)', type: 'Filme', genre: 'Drama' },
  { id: 42503, tmdbMediaType: 'tv', title: 'Deadman Wonderland (2011)', type: 'Série', genre: 'Ação e Aventura' },
  { id: 1114513, tmdbMediaType: 'movie', title: 'Speak No Evil (2024)', type: 'Filme', genre: 'Terror' },
  { id: 76479, tmdbMediaType: 'tv', title: 'The Boys (2019)', type: 'Série', genre: 'Ação e Aventura' },
  { id: 736769, tmdbMediaType: 'movie', title: 'They Cloned Tyrone (2023)', type: 'Filme', genre: 'Comédia' },
  { id: 801, tmdbMediaType: 'movie', title: 'Good Morning, Vietnam (1987)', type: 'Filme', genre: 'Comédia' },
  { id: 858017, tmdbMediaType: 'movie', title: 'I Saw the TV Glow (2024)', type: 'Filme', genre: 'Drama' },
  { id: 845781, tmdbMediaType: 'movie', title: 'Red One (2024)', type: 'Filme', genre: 'Ação' },
  { id: 1062215, tmdbMediaType: 'movie', title: 'Afraid (2024)', type: 'Filme', genre: 'Terror' },
  { id: 807339, tmdbMediaType: 'movie', title: 'Apartment 7A (2024)', type: 'Filme', genre: 'Terror' },
  { id: 592831, tmdbMediaType: 'movie', title: 'Megalopolis (2024)', type: 'Filme', genre: 'Ficção Científica' },
  { id: 933260, tmdbMediaType: 'movie', title: 'The Substance (2024)', type: 'Filme', genre: 'Drama' },
  { id: 663712, tmdbMediaType: 'movie', title: 'Terrifier 2 (2022)', type: 'Filme', genre: 'Terror' },
  { id: 73861, tmdbMediaType: 'movie', title: 'A Serbian Film (2010)', type: 'Filme', genre: 'Crime' },
  { id: 420634, tmdbMediaType: 'movie', title: 'Terrifier (2016)', type: 'Filme', genre: 'Terror' },
  { id: 63311, tmdbMediaType: 'movie', title: 'The Skin I Live In (2011)', type: 'Filme', genre: 'Drama' },
  { id: 1052280, tmdbMediaType: 'movie', title: 'It\'s What\'s Inside (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 748167, tmdbMediaType: 'movie', title: 'Uglies (2024)', type: 'Filme', genre: 'Ficção Científica' },
  { id: 1026436, tmdbMediaType: 'movie', title: 'Miller’s Girl (2024)', type: 'Filme', genre: 'Suspense' },
  { id: 748783, tmdbMediaType: 'movie', title: 'The Garfield Movie (2024)', type: 'Filme', genre: 'Animação' },
  { id: 469721, tmdbMediaType: 'movie', title: 'The Cured (2018)', type: 'Filme', genre: 'Terror' },
  { id: 365177, tmdbMediaType: 'movie', title: 'Borderlands (2024)', type: 'Filme', genre: 'Ação' },
  { id: 882059, tmdbMediaType: 'movie', title: 'Boy Kills World (2024)', type: 'Filme', genre: 'Crime' },
  { id: 938614, tmdbMediaType: 'movie', title: 'Late Night with the Devil (2024)', type: 'Filme', genre: 'Terror' },
  { id: 746333, tmdbMediaType: 'movie', title: 'Superwho? (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 718821, tmdbMediaType: 'movie', title: 'Twisters (2024)', type: 'Filme', genre: 'Ação' },
  { id: 1094138, tmdbMediaType: 'movie', title: 'Jackpot! (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 1580, tmdbMediaType: 'movie', title: 'Rope (1948)', type: 'Filme', genre: 'Suspense' },
  { id: 673593, tmdbMediaType: 'movie', title: 'Mean Girls (2024)', type: 'Filme', genre: 'Comédia' },
  { id: 799583, tmdbMediaType: 'movie', title: 'The Ministry of Ungentlemanly Warfare (2024)', type: 'Filme', genre: 'Ação' },
  { id: 213249, tmdbMediaType: 'tv', title: 'Sausage Party: Foodtopia (2024)', type: 'Série', genre: 'Animação' },
  { id: 806, tmdbMediaType: 'movie', title: 'The Omen (1976)', type: 'Filme', genre: 'Terror' },
  { id: 388, tmdbMediaType: 'movie', title: 'Inside Man (2006)', type: 'Filme', genre: 'Crime' },
  { id: 20770, tmdbMediaType: 'movie', title: 'But I\'m a Cheerleader (1999)', type: 'Filme', genre: 'Comédia' },
  { id: 929590, tmdbMediaType: 'movie', title: 'Civil War (2024)', type: 'Filme', genre: 'Guerra' },
  { id: 744857, tmdbMediaType: 'movie', title: 'When Evil Lurks (2023)', type: 'Filme', genre: 'Terror' },
  { id: 866398, tmdbMediaType: 'movie', title: 'The Beekeeper (2024)', type: 'Filme', genre: 'Ação' },
  { id: 1011985, tmdbMediaType: 'movie', title: 'Kung Fu Panda 4 (2024)', type: 'Filme', genre: 'Animação' },
  { id: 843527, tmdbMediaType: 'movie', title: 'The Idea of You (2024)', type: 'Filme', genre: 'Romance' },
  { id: 29917, tmdbMediaType: 'movie', title: 'Exam (2009)', type: 'Filme', genre: 'Suspense' },
  { id: 103540, tmdbMediaType: 'tv', title: 'Percy Jackson and the Olympians (2023)', type: 'Série', genre: 'Aventura' },
  { id: 762504, tmdbMediaType: 'movie', title: 'Nope (2022)', type: 'Filme', genre: 'Terror' },
  { id: 122226, tmdbMediaType: 'tv', title: 'Echo (2024)', type: 'Série', genre: 'Drama' },
  { id: 603, tmdbMediaType: 'movie', title: 'The Matrix (1999)', type: 'Filme', genre: 'Ação' },
  { id: 1700, tmdbMediaType: 'movie', title: 'Misery (1990)', type: 'Filme', genre: 'Drama' },
  { id: 429210, tmdbMediaType: 'movie', title: 'Bingo: O Rei das Manhãs (2017)', type: 'Filme', genre: 'Comédia' },
  { id: 791177, tmdbMediaType: 'movie', title: 'Bones and All (2022)', type: 'Filme', genre: 'Terror' },
  { id: 217462, tmdbMediaType: 'tv', title: 'Praise Petey (2023)', type: 'Série', genre: 'Comédia' },
  { id: 660982, tmdbMediaType: 'movie', title: 'American Pie Presents: Girls’ Rules (2020)', type: 'Filme', genre: 'Comédia' },
  { id: 951491, tmdbMediaType: 'movie', title: 'Saw X (2023)', type: 'Filme', genre: 'Terror' },
  { id: 520758, tmdbMediaType: 'movie', title: 'Chicken Run: Dawn of the Nugget (2023)', type: 'Filme', genre: 'Animação' },
  { id: 1954, tmdbMediaType: 'movie', title: 'The Butterfly Effect (2004)', type: 'Filme', genre: 'Ficção Científica' },
  { id: 726209, tmdbMediaType: 'movie', title: 'Leave the World Behind (2023)', type: 'Filme', genre: 'Drama' },
  { id: 87108, tmdbMediaType: 'tv', title: 'Chernobyl (2019)', type: 'Série', genre: 'Drama' },
  { id: 204082, tmdbMediaType: 'tv', title: 'Squid Game: The Challenge (2023)', type: 'Série', genre: 'Reality' },
  { id: 565770, tmdbMediaType: 'movie', title: 'Blue Beetle (2023)', type: 'Filme', genre: 'Ação' },
  { id: 502356, tmdbMediaType: 'movie', title: 'The Super Mario Bros. Movie (2023)', type: 'Filme', genre: 'Animação' },
  { id: 558, tmdbMediaType: 'movie', title: 'Spider-Man 2 (2004)', type: 'Filme', genre: 'Ação' },
  { id: 557, tmdbMediaType: 'movie', title: 'Spider-Man (2002)', type: 'Filme', genre: 'Ação' },
  { id: 559, tmdbMediaType: 'movie', title: 'Spider-Man 3 (2007)', type: 'Filme', genre: 'Ação' },
  { id: 1930, tmdbMediaType: 'movie', title: 'The Amazing Spider-Man (2012)', type: 'Filme', genre: 'Ação' },
  { id: 315635, tmdbMediaType: 'movie', title: 'Spider-Man: Homecoming (2017)', type: 'Filme', genre: 'Ação' },
  { id: 634649, tmdbMediaType: 'movie', title: 'Spider-Man: No Way Home (2021)', type: 'Filme', genre: 'Ação' },
  { id: 429617, tmdbMediaType: 'movie', title: 'Spider-Man: Far From Home (2019)', type: 'Filme', genre: 'Ação' },
  { id: 102382, tmdbMediaType: 'movie', title: 'The Amazing Spider-Man 2 (2014)', type: 'Filme', genre: 'Ação' },
  { id: 609681, tmdbMediaType: 'movie', title: 'The Marvels (2023)', type: 'Filme', genre: 'Ação' },
  { id: 254470, tmdbMediaType: 'movie', title: 'Pitch Perfect 2 (2015)', type: 'Filme', genre: 'Comédia' },
  { id: 976573, tmdbMediaType: 'movie', title: 'Elemental (2023)', type: 'Filme', genre: 'Animação' },
  { id: 1190012, tmdbMediaType: 'movie', title: 'South Park: Joining the Panderverse (2023)', type: 'Filme', genre: 'Animação' },
  { id: 762441, tmdbMediaType: 'movie', title: 'A Quiet Place: Day One (2024)', type: 'Filme', genre: 'Terror' },
  { id: 530385, tmdbMediaType: 'movie', title: 'Midsommar (2019)', type: 'Filme', genre: 'Terror' },
  { id: 9090, tmdbMediaType: 'movie', title: 'To Wong Foo, Thanks for Everything! Julie Newmar (1995)', type: 'Filme', genre: 'Comédia' }
];

const mehList = [
  { id: 804150, tmdbMediaType: 'movie', title: 'O Urso do Pó Branco (2023)', type: 'Filme', genre: 'Thriller' },
  { id: 68, tmdbMediaType: 'movie', title: 'Brazil: O Filme (1985)', type: 'Filme', genre: 'Comédia' },
  { id: 306947, tmdbMediaType: 'movie', title: 'The Invitation (2022)', type: 'Filme', genre: 'Terror' },
  { id: 997669, tmdbMediaType: 'movie', title: 'My Neighbor Adolf (2022)', type: 'Filme', genre: 'Comédia' },
  { id: 24, tmdbMediaType: 'movie', title: 'Kill Bill: Vol. 1 (2003)', type: 'Filme', genre: 'Ação' },
  { id: 218342, tmdbMediaType: 'tv', title: 'A Good Girl\'s Guide to Murder (2024)', type: 'Série', genre: 'Mistério' },
  { id: 11918, tmdbMediaType: 'movie', title: 'Superhero Movie (2008)', type: 'Filme', genre: 'Comédia' },
  { id: 7512, tmdbMediaType: 'movie', title: 'Idiocracy (2006)', type: 'Filme', genre: 'Comédia' },
  { id: 8363, tmdbMediaType: 'movie', title: 'Superbad (2007)', type: 'Filme', genre: 'Comédia' },
  { id: 204349, tmdbMediaType: 'movie', title: 'Contracted (2013)', type: 'Filme', genre: 'Terror' },
  { id: 299537, tmdbMediaType: 'movie', title: 'Captain Marvel (2019)', type: 'Filme', genre: 'Ação' },
];

const naoGosteiList = [
  { id: 231001, tmdbMediaType: 'movie', title: 'All Hallows\' Eve (2013)', type: 'Filme', genre: 'Terror' },
];

// -----------------------------------------------------------------------------
// FUNÇÃO PRINCIPAL DO SCRIPT
// -----------------------------------------------------------------------------

async function migrateData() {
  // Inicializa o Firebase e o Firestore
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  // Prepara um "batch" - uma operação em lote para enviar tudo de uma vez
  const batch = writeBatch(db);
  const collectionRef = collection(db, "watchedItems");
  const now = Date.now();
  let counter = 0;

  // Função auxiliar para adicionar itens de uma lista ao batch
  const addListToBatch = (list, rating) => {
    list.forEach(item => {
      const docData = { ...item, rating, createdAt: now - counter++ };
      // Usamos o ID do TMDB como ID do nosso documento para evitar duplicatas
      const docRef = doc(collectionRef, item.id.toString());
      batch.set(docRef, docData);
    });
  };

  console.log("Preparando os dados para a migração...");

  // Adiciona cada lista ao batch com a classificação correta
  addListToBatch(ameiList, 'amei');
  addListToBatch(gosteiList, 'gostei');
  addListToBatch(mehList, 'meh');
  addListToBatch(naoGosteiList, 'naoGostei');

  try {
    console.log("Iniciando a migração... Enviando dados para o Firestore.");
    // Envia o lote para o banco de dados
    await batch.commit();
    const totalItems = ameiList.length + gosteiList.length + mehList.length + naoGosteiList.length;
    console.log(`\n----------------------------------------------------------`);
    console.log(`✅  SUCESSO! ${totalItems} itens foram migrados para a coleção "watchedItems".`);
    console.log(`----------------------------------------------------------`);
    console.log("Pode verificar os dados no console do Firebase agora.");

  } catch (error) {
    console.error("❌ ERRO DURANTE A MIGRAÇÃO: ", error);
    console.log("Por favor, verifique suas credenciais do Firebase e as regras de segurança do Firestore.");
  }
}

// Executa a função
migrateData();