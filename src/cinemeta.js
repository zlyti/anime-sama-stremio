const axios = require('axios');
const NodeCache = require('node-cache');

// Cache pour les recherches Cinemeta (24h)
const cache = new NodeCache({ stdTTL: 86400, checkperiod: 3600 });

const CINEMETA_URL = 'https://v3-cinemeta.strem.io';

/**
 * Recherche un anime sur Cinemeta et retourne son ID IMDB
 */
async function searchAnime(name) {
    const cacheKey = `cinemeta_${name.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        // Nettoyer le nom pour la recherche
        const cleanName = name
            .replace(/\([^)]*\)/g, '') // Enlever les parenthèses
            .replace(/[:-]/g, ' ')
            .trim();

        const response = await axios.get(`${CINEMETA_URL}/catalog/series/top/search=${encodeURIComponent(cleanName)}.json`, {
            timeout: 10000
        });

        if (response.data && response.data.metas && response.data.metas.length > 0) {
            // Trouver le meilleur match
            const results = response.data.metas;
            
            // Chercher une correspondance exacte ou proche
            let bestMatch = results[0];
            for (const result of results) {
                const resultName = result.name.toLowerCase();
                const searchName = cleanName.toLowerCase();
                
                if (resultName === searchName || 
                    resultName.includes(searchName) || 
                    searchName.includes(resultName)) {
                    bestMatch = result;
                    break;
                }
            }

            const result = {
                imdbId: bestMatch.id,
                name: bestMatch.name,
                poster: bestMatch.poster,
                background: bestMatch.background || bestMatch.poster,
                description: bestMatch.description,
                genres: bestMatch.genres || [],
                year: bestMatch.year
            };

            cache.set(cacheKey, result);
            console.log(`✅ Cinemeta: "${name}" → ${result.imdbId} (${result.name})`);
            return result;
        }

        console.log(`⚠️ Cinemeta: "${name}" non trouvé`);
        return null;

    } catch (error) {
        console.error(`❌ Cinemeta error for "${name}":`, error.message);
        return null;
    }
}

/**
 * Récupère les métadonnées complètes d'un anime via son ID IMDB
 */
async function getMeta(imdbId) {
    const cacheKey = `meta_${imdbId}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        const response = await axios.get(`${CINEMETA_URL}/meta/series/${imdbId}.json`, {
            timeout: 10000
        });

        if (response.data && response.data.meta) {
            const meta = response.data.meta;
            cache.set(cacheKey, meta);
            return meta;
        }

        return null;

    } catch (error) {
        console.error(`❌ Cinemeta meta error for "${imdbId}":`, error.message);
        return null;
    }
}

/**
 * Mapping manuel pour les animes populaires (fallback)
 */
const ANIME_IMDB_MAP = {
    'one-piece': 'tt0388629',
    'naruto': 'tt0409591',
    'naruto-shippuden': 'tt0988824',
    'dragon-ball-z': 'tt0121220',
    'dragon-ball-super': 'tt4644488',
    'bleach': 'tt0434665',
    'one-punch-man': 'tt4508902',
    'demon-slayer': 'tt9335498',
    'jujutsu-kaisen': 'tt12343534',
    'my-hero-academia': 'tt5626028',
    'shingeki-no-kyojin': 'tt2560140',
    'attack-on-titan': 'tt2560140',
    'spy-x-family': 'tt13706018',
    'chainsaw-man': 'tt13245028',
    'hunter-x-hunter': 'tt2098220',
    'death-note': 'tt0877057',
    'fullmetal-alchemist-brotherhood': 'tt1355642',
    'tokyo-revengers': 'tt13465574',
    'solo-leveling': 'tt21209876',
    'blue-lock': 'tt21210604',
    'vinland-saga': 'tt10233448',
    'kingdom': 'tt6741278',
    'mob-psycho-100': 'tt5897304',
    'black-clover': 'tt7441658',
    'fairy-tail': 'tt1528406',
    'sword-art-online': 'tt2071645',
    'mushoku-tensei': 'tt13293588',
    'frieren': 'tt22248376',
    'dandadan': 'tt32015629',
    'kaiju-no-8': 'tt28479092',
    'oshi-no-ko': 'tt21447976',
    'dr-stone': 'tt9362936',
    'the-rising-of-the-shield-hero': 'tt8524278',
    'overlord': 'tt5765632',
    're-zero': 'tt5607616',
    'konosuba': 'tt5476454',
    'that-time-i-got-reincarnated-as-a-slime': 'tt8513906',
    'bocchi-the-rock': 'tt21216528',
    'haikyuu': 'tt3398540',
    'kuroko-no-basket': 'tt2erta540',
    'code-geass': 'tt0994314',
};

/**
 * Obtient l'ID IMDB pour un slug anime
 */
async function getImdbId(slug, name) {
    // D'abord vérifier le mapping manuel
    if (ANIME_IMDB_MAP[slug]) {
        return ANIME_IMDB_MAP[slug];
    }

    // Sinon chercher sur Cinemeta
    const result = await searchAnime(name || slug.replace(/-/g, ' '));
    return result ? result.imdbId : null;
}

module.exports = {
    searchAnime,
    getMeta,
    getImdbId,
    ANIME_IMDB_MAP
};

