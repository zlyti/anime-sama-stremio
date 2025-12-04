const cheerio = require('cheerio');
const NodeCache = require('node-cache');
const browser = require('./browser');

// Cache pour éviter de surcharger Anime-Sama (TTL: 2 heures)
const cache = new NodeCache({ stdTTL: 7200, checkperiod: 600 });

const BASE_URL = 'https://anime-sama.org';
const CATALOG_URL = `${BASE_URL}/catalogue/`;

/**
 * Liste d'animes populaires pré-définie (fallback)
 */
const POPULAR_ANIMES = [
    { slug: 'one-piece', name: 'One Piece' },
    { slug: 'naruto', name: 'Naruto' },
    { slug: 'naruto-shippuden', name: 'Naruto Shippuden' },
    { slug: 'dragon-ball-z', name: 'Dragon Ball Z' },
    { slug: 'dragon-ball-super', name: 'Dragon Ball Super' },
    { slug: 'bleach', name: 'Bleach' },
    { slug: 'one-punch-man', name: 'One Punch Man' },
    { slug: 'demon-slayer', name: 'Demon Slayer (Kimetsu no Yaiba)' },
    { slug: 'jujutsu-kaisen', name: 'Jujutsu Kaisen' },
    { slug: 'my-hero-academia', name: 'My Hero Academia' },
    { slug: 'shingeki-no-kyojin', name: 'Attack on Titan (SNK)' },
    { slug: 'spy-x-family', name: 'Spy x Family' },
    { slug: 'chainsaw-man', name: 'Chainsaw Man' },
    { slug: 'hunter-x-hunter', name: 'Hunter x Hunter' },
    { slug: 'death-note', name: 'Death Note' },
    { slug: 'fullmetal-alchemist-brotherhood', name: 'Fullmetal Alchemist Brotherhood' },
    { slug: 'tokyo-revengers', name: 'Tokyo Revengers' },
    { slug: 'solo-leveling', name: 'Solo Leveling' },
    { slug: 'blue-lock', name: 'Blue Lock' },
    { slug: 'vinland-saga', name: 'Vinland Saga' },
    { slug: 'kingdom', name: 'Kingdom' },
    { slug: 'mob-psycho-100', name: 'Mob Psycho 100' },
    { slug: 'black-clover', name: 'Black Clover' },
    { slug: 'fairy-tail', name: 'Fairy Tail' },
    { slug: 'sword-art-online', name: 'Sword Art Online' },
    { slug: 'mushoku-tensei', name: 'Mushoku Tensei' },
    { slug: 'frieren', name: 'Frieren: Beyond Journey\'s End' },
    { slug: 'dandadan', name: 'Dandadan' },
    { slug: 'kaiju-no-8', name: 'Kaiju No. 8' },
    { slug: 'oshi-no-ko', name: 'Oshi no Ko' },
    { slug: 'dr-stone', name: 'Dr. Stone' },
    { slug: 'the-rising-of-the-shield-hero', name: 'The Rising of the Shield Hero' },
    { slug: 'overlord', name: 'Overlord' },
    { slug: 're-zero', name: 'Re:Zero' },
    { slug: 'konosuba', name: 'KonoSuba' },
    { slug: 'that-time-i-got-reincarnated-as-a-slime', name: 'That Time I Got Reincarnated as a Slime' },
    { slug: 'bocchi-the-rock', name: 'Bocchi the Rock!' },
    { slug: 'haikyuu', name: 'Haikyuu!!' },
    { slug: 'kuroko-no-basket', name: 'Kuroko\'s Basketball' },
    { slug: 'code-geass', name: 'Code Geass' },
].map(a => ({
    id: `animesama:${a.slug}`,
    type: 'series',
    name: a.name,
    slug: a.slug,
    poster: null,
    description: `Regardez ${a.name} en streaming VOSTFR/VF sur Anime-Sama`,
    genres: []
}));

/**
 * Récupère le catalogue complet des animes via Puppeteer
 */
async function getCatalog(skip = 0, limit = 100) {
    const cacheKey = `catalog_full`;
    const cached = cache.get(cacheKey);
    if (cached) {
        console.log('📦 Catalogue depuis le cache');
        return cached.slice(skip, skip + limit);
    }

    try {
        console.log('🔍 Récupération du catalogue Anime-Sama...');
        
        const response = await browser.fetchPage(CATALOG_URL, {
            waitForSelector: 'a[href*="/catalogue/"]',
            waitTime: 3000
        });
        
        if (response.status !== 200 || !response.data) {
            console.log('⚠️ Échec du chargement, utilisation du fallback');
            return POPULAR_ANIMES.slice(skip, skip + limit);
        }
        
        const $ = cheerio.load(response.data);
        const animes = [];
        const seenSlugs = new Set();
        
        // Parser tous les liens vers des animes
        $('a[href*="/catalogue/"]').each((i, el) => {
            const $el = $(el);
            const href = $el.attr('href') || '';
            
            // Filtrer pour ne garder que les pages d'anime (pas les saisons, pas le catalogue lui-même)
            if (href.includes('/catalogue/') && 
                !href.endsWith('/catalogue/') && 
                !href.endsWith('/catalogue') &&
                !href.includes('/saison') &&
                !href.includes('/vostfr') &&
                !href.includes('/vf') &&
                !href.includes('/vo')) {
                
                // Extraire le slug
                const slugMatch = href.match(/\/catalogue\/([^\/]+)/);
                if (!slugMatch) return;
                
                const slug = slugMatch[1].toLowerCase().replace(/\/$/, '');
                if (!slug || slug.length < 2 || seenSlugs.has(slug)) return;
                
                seenSlugs.add(slug);
                
                // Récupérer le nom
                let name = $el.find('h3, h2, h4, .title').first().text().trim();
                if (!name) name = $el.find('img').attr('alt') || '';
                if (!name) name = $el.text().trim().split('\n')[0];
                name = name.substring(0, 100).trim();
                
                if (!name || name.length < 2) {
                    name = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                }
                
                // Récupérer l'image
                let poster = $el.find('img').attr('src') || $el.find('img').attr('data-src');
                if (poster && !poster.startsWith('http')) {
                    poster = BASE_URL + (poster.startsWith('/') ? '' : '/') + poster;
                }
                
                animes.push({
                    id: `animesama:${slug}`,
                    type: 'series',
                    name: name,
                    slug: slug,
                    poster: poster,
                    description: `Regardez ${name} en streaming sur Anime-Sama`,
                    genres: []
                });
            }
        });

        console.log(`✅ ${animes.length} animes trouvés dans le catalogue`);
        
        // Si on a trouvé des animes, on les cache
        if (animes.length > 0) {
            cache.set(cacheKey, animes, 7200); // Cache 2 heures
            return animes.slice(skip, skip + limit);
        }
        
        // Sinon fallback
        return POPULAR_ANIMES.slice(skip, skip + limit);
        
    } catch (error) {
        console.error('❌ Erreur catalogue:', error.message);
        return POPULAR_ANIMES.slice(skip, skip + limit);
    }
}

/**
 * Recherche des animes par nom
 */
async function searchAnime(query) {
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        console.log(`🔍 Recherche: "${query}"`);
        
        // D'abord chercher dans le catalogue complet
        const catalog = await getCatalog(0, 1000);
        const queryLower = query.toLowerCase();
        const querySlug = queryLower.replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-');
        
        let results = catalog.filter(anime => 
            anime.name.toLowerCase().includes(queryLower) ||
            anime.slug.includes(querySlug)
        );
        
        // Si pas assez de résultats, chercher aussi dans les populaires
        if (results.length < 5) {
            const popularResults = POPULAR_ANIMES.filter(anime =>
                anime.name.toLowerCase().includes(queryLower) ||
                anime.slug.includes(querySlug)
            );
            
            // Ajouter les résultats populaires non dupliqués
            for (const anime of popularResults) {
                if (!results.find(r => r.slug === anime.slug)) {
                    results.push(anime);
                }
            }
        }
        
        // Si toujours rien, créer une entrée avec le slug de recherche
        if (results.length === 0) {
            results.push({
                id: `animesama:${querySlug}`,
                type: 'series',
                name: query,
                slug: querySlug,
                poster: null,
                description: `Rechercher "${query}" sur Anime-Sama`,
                genres: []
            });
        }
        
        cache.set(cacheKey, results, 3600);
        return results;
        
    } catch (error) {
        console.error('❌ Erreur recherche:', error.message);
        return [];
    }
}

/**
 * Récupère les détails d'un anime (saisons, infos)
 */
async function getAnimeDetails(slug) {
    const cacheKey = `details_${slug}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        console.log(`📋 Récupération des détails: ${slug}`);
        
        const url = `${BASE_URL}/catalogue/${slug}/`;
        const response = await browser.fetchPage(url, {
            waitTime: 2000
        });
        
        const defaultResult = {
            id: `animesama:${slug}`,
            type: 'series',
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: slug,
            poster: null,
            description: `Regardez cet anime en streaming sur Anime-Sama`,
            genres: [],
            seasons: [
                { key: 's1_vostfr', number: 1, lang: 'vostfr', name: 'Saison 1 (VOSTFR)' },
                { key: 's1_vf', number: 1, lang: 'vf', name: 'Saison 1 (VF)' }
            ]
        };
        
        if (response.status !== 200 || !response.data) {
            return defaultResult;
        }
        
        const $ = cheerio.load(response.data);
        
        // Nom de l'anime
        let title = $('h1').first().text().trim() || 
                   $('h2').first().text().trim() ||
                   defaultResult.name;
        
        // Poster
        let poster = null;
        $('img').each((i, el) => {
            const src = $(el).attr('src') || '';
            const alt = $(el).attr('alt') || '';
            if ((src.includes('poster') || src.includes('cover') || alt.toLowerCase().includes(slug.split('-')[0])) && !poster) {
                poster = src.startsWith('http') ? src : BASE_URL + src;
            }
        });
        if (!poster) {
            poster = $('img').first().attr('src');
            if (poster && !poster.startsWith('http')) {
                poster = BASE_URL + poster;
            }
        }
        
        // Description
        let description = '';
        $('p').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length > 100 && text.length < 2000 && !text.includes('©')) {
                description = text;
                return false;
            }
        });
        
        // Genres
        const genres = [];
        const bodyText = $('body').text();
        const genreMatch = bodyText.match(/Genre[s]?\s*:?\s*([^\n\.]+)/i);
        if (genreMatch) {
            genreMatch[1].split(/[,\/]/).forEach(g => {
                const genre = g.trim();
                if (genre.length > 2 && genre.length < 30 && !genre.includes(':')) {
                    genres.push(genre);
                }
            });
        }
        
        // Saisons - Parser tous les liens
        const seasons = [];
        const seenSeasons = new Set();
        
        $('a').each((i, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim().toLowerCase();
            
            // Chercher les liens de saison
            if (href.includes('saison') || text.includes('saison')) {
                const seasonMatch = href.match(/saison(\d+)/i) || text.match(/saison\s*(\d+)/i);
                const seasonNum = seasonMatch ? parseInt(seasonMatch[1]) : 1;
                
                // Déterminer les langues disponibles
                const langs = [];
                if (href.includes('vostfr') || text.includes('vostfr') || text.includes('vo')) {
                    langs.push('vostfr');
                }
                if (href.includes('/vf') || text.includes('vf')) {
                    langs.push('vf');
                }
                if (langs.length === 0) {
                    langs.push('vostfr'); // Par défaut
                }
                
                for (const lang of langs) {
                    const key = `s${seasonNum}_${lang}`;
                    if (!seenSeasons.has(key)) {
                        seenSeasons.add(key);
                        seasons.push({
                            key: key,
                            number: seasonNum,
                            lang: lang,
                            name: `Saison ${seasonNum} (${lang.toUpperCase()})`
                        });
                    }
                }
            }
        });
        
        // Si pas de saisons trouvées, ajouter les défauts
        if (seasons.length === 0) {
            seasons.push(
                { key: 's1_vostfr', number: 1, lang: 'vostfr', name: 'Saison 1 (VOSTFR)' },
                { key: 's1_vf', number: 1, lang: 'vf', name: 'Saison 1 (VF)' }
            );
        }
        
        // Trier les saisons
        seasons.sort((a, b) => {
            if (a.number !== b.number) return a.number - b.number;
            return a.lang === 'vostfr' ? -1 : 1;
        });
        
        const result = {
            id: `animesama:${slug}`,
            type: 'series',
            name: title,
            slug: slug,
            poster: poster,
            description: description || defaultResult.description,
            genres: genres.slice(0, 5),
            seasons: seasons
        };
        
        cache.set(cacheKey, result, 7200);
        console.log(`✅ Détails récupérés: ${title} (${seasons.length} saisons)`);
        
        return result;
        
    } catch (error) {
        console.error(`❌ Erreur détails ${slug}:`, error.message);
        return {
            id: `animesama:${slug}`,
            type: 'series',
            name: slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            slug: slug,
            poster: null,
            description: `Regardez cet anime en streaming sur Anime-Sama`,
            genres: [],
            seasons: [
                { key: 's1_vostfr', number: 1, lang: 'vostfr', name: 'Saison 1 (VOSTFR)' }
            ]
        };
    }
}

/**
 * Récupère les épisodes d'une saison via Puppeteer (exécution JS)
 */
async function getSeasonEpisodes(slug, seasonNum, lang = 'vostfr') {
    const cacheKey = `episodes_${slug}_s${seasonNum}_${lang}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        console.log(`📺 Récupération des épisodes: ${slug} S${seasonNum} (${lang})`);
        
        const url = `${BASE_URL}/catalogue/${slug}/saison${seasonNum}/${lang}/`;
        
        // Utiliser Puppeteer pour exécuter le JS et récupérer les données
        const response = await browser.fetchPageWithScript(url, () => {
            // Ce script s'exécute dans le contexte de la page
            const episodes = [];
            
            // Chercher les épisodes dans les variables JavaScript
            const scripts = document.querySelectorAll('script');
            let maxEpisode = 0;
            
            scripts.forEach(script => {
                const content = script.textContent || '';
                
                // Pattern pour les tableaux d'épisodes
                const epsMatch = content.match(/(?:var|let|const)\s+eps\d*\s*=\s*\[([^\]]+)\]/g);
                if (epsMatch) {
                    epsMatch.forEach(match => {
                        const urls = match.match(/"[^"]+"/g) || [];
                        maxEpisode = Math.max(maxEpisode, urls.length);
                    });
                }
            });
            
            // Chercher aussi dans les select/options
            document.querySelectorAll('select option').forEach(opt => {
                const text = opt.textContent || '';
                const match = text.match(/[ÉEe]pisode\s*(\d+)/i);
                if (match) {
                    maxEpisode = Math.max(maxEpisode, parseInt(match[1]));
                }
            });
            
            return { maxEpisode };
        });
        
        let episodeCount = 12; // Défaut
        
        if (response.status === 200 && response.data) {
            episodeCount = response.data.maxEpisode || 12;
        }
        
        // Générer la liste des épisodes
        const episodes = [];
        for (let i = 1; i <= episodeCount; i++) {
            episodes.push({
                id: `animesama:${slug}:${seasonNum}:${i}`,
                number: i,
                title: `Épisode ${i}`,
                season: seasonNum,
                lang: lang
            });
        }
        
        cache.set(cacheKey, episodes, 3600);
        console.log(`✅ ${episodes.length} épisodes trouvés`);
        
        return episodes;
        
    } catch (error) {
        console.error(`❌ Erreur épisodes:`, error.message);
        
        // Retourner une liste par défaut
        const episodes = [];
        for (let i = 1; i <= 12; i++) {
            episodes.push({
                id: `animesama:${slug}:${seasonNum}:${i}`,
                number: i,
                title: `Épisode ${i}`,
                season: seasonNum,
                lang: lang
            });
        }
        return episodes;
    }
}

/**
 * Récupère les liens de streaming pour un épisode
 */
async function getStreamUrls(slug, seasonNum, episodeNum, lang = 'vostfr') {
    const cacheKey = `stream_${slug}_s${seasonNum}_e${episodeNum}_${lang}`;
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        console.log(`🎬 Récupération des streams: ${slug} S${seasonNum}E${episodeNum} (${lang})`);
        
        const url = `${BASE_URL}/catalogue/${slug}/saison${seasonNum}/${lang}/`;
        
        // Exécuter un script pour extraire les URLs des lecteurs
        const response = await browser.fetchPageWithScript(url, (epNum) => {
            const streams = [];
            const scripts = document.querySelectorAll('script');
            
            scripts.forEach(script => {
                const content = script.textContent || '';
                
                // Chercher tous les tableaux eps avec regex
                const epsMatches = content.matchAll(/(?:var|let|const)\s+(eps\d*)\s*=\s*\[([^\]]+)\]/g);
                
                for (const match of epsMatches) {
                    const varName = match[1];
                    const arrayContent = match[2];
                    const urls = arrayContent.match(/"([^"]+)"/g) || [];
                    
                    const cleanUrls = urls.map(u => u.replace(/"/g, ''));
                    const episodeUrl = cleanUrls[epNum - 1];
                    
                    if (episodeUrl && episodeUrl.startsWith('http')) {
                        streams.push({
                            name: varName.replace('eps', 'Lecteur ') || 'Lecteur',
                            url: episodeUrl
                        });
                    }
                }
            });
            
            // Chercher aussi les iframes
            document.querySelectorAll('iframe').forEach((iframe, idx) => {
                const src = iframe.src || iframe.getAttribute('data-src');
                if (src && src.startsWith('http')) {
                    streams.push({
                        name: `Lecteur Embed ${idx + 1}`,
                        url: src
                    });
                }
            });
            
            return streams;
        }, { waitTime: 3000, args: [episodeNum] });
        
        let streams = [];
        
        if (response.status === 200 && response.data && Array.isArray(response.data)) {
            streams = response.data.map(s => ({
                name: s.name || 'Lecteur',
                url: s.url,
                quality: 'HD'
            }));
        }
        
        // Ajouter un lien web de fallback
        if (streams.length === 0) {
            streams.push({
                name: '🌐 Ouvrir sur Anime-Sama',
                url: url,
                quality: 'Web',
                isWebLink: true
            });
        }
        
        cache.set(cacheKey, streams, 1800);
        console.log(`✅ ${streams.length} streams trouvés`);
        
        return streams;
        
    } catch (error) {
        console.error(`❌ Erreur streams:`, error.message);
        return [{
            name: '🌐 Ouvrir sur Anime-Sama',
            url: `${BASE_URL}/catalogue/${slug}/saison${seasonNum}/${lang}/`,
            quality: 'Web',
            isWebLink: true
        }];
    }
}

/**
 * Récupère les derniers épisodes ajoutés
 */
async function getLatestEpisodes() {
    const cacheKey = 'latest_episodes';
    const cached = cache.get(cacheKey);
    if (cached) return cached;

    try {
        console.log('🆕 Récupération des derniers épisodes...');
        
        const response = await browser.fetchPage(BASE_URL, {
            waitTime: 2000
        });
        
        if (response.status !== 200) {
            return [];
        }
        
        const $ = cheerio.load(response.data);
        const latest = [];
        const seen = new Set();
        
        $('a').each((i, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().trim();
            
            if (href.includes('/catalogue/') && 
                (text.toLowerCase().includes('episode') || text.toLowerCase().includes('épisode'))) {
                
                const slugMatch = href.match(/\/catalogue\/([^\/]+)/);
                if (slugMatch && !seen.has(slugMatch[1])) {
                    seen.add(slugMatch[1]);
                    
                    const epMatch = text.match(/[ÉEe]pisode\s*(\d+)/i);
                    const seasonMatch = text.match(/[Ss]aison\s*(\d+)/i);
                    
                    latest.push({
                        slug: slugMatch[1],
                        episode: epMatch ? parseInt(epMatch[1]) : 1,
                        season: seasonMatch ? parseInt(seasonMatch[1]) : 1,
                        title: text.substring(0, 100)
                    });
                }
            }
        });
        
        const result = latest.slice(0, 30);
        cache.set(cacheKey, result, 900);
        
        console.log(`✅ ${result.length} derniers épisodes trouvés`);
        return result;
        
    } catch (error) {
        console.error('❌ Erreur derniers épisodes:', error.message);
        return [];
    }
}

module.exports = {
    getCatalog,
    searchAnime,
    getAnimeDetails,
    getSeasonEpisodes,
    getStreamUrls,
    getLatestEpisodes,
    BASE_URL,
    POPULAR_ANIMES
};
