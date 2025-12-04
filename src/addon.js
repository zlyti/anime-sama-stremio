const { addonBuilder } = require('stremio-addon-sdk');
const scraper = require('./scraper');
const cinemeta = require('./cinemeta');

// Configuration du manifest de l'addon
const manifest = {
    id: 'org.animesama.stremio',
    version: '1.2.0',
    name: 'Anime-Sama',
    description: 'Catalogue Anime-Sama avec support Torrentio/AllDebrid. Parcourez les animes d\'Anime-Sama et regardez via vos addons préférés.',
    logo: 'https://anime-sama.org/favicon.ico',
    resources: ['catalog', 'meta'],
    types: ['anime', 'series'],
    catalogs: [
        {
            type: 'anime',
            id: 'animesama-anime-catalog',
            name: 'Anime-Sama',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        },
        {
            type: 'series',
            id: 'animesama-catalog',
            name: 'Anime-Sama',
            extra: [
                { name: 'search', isRequired: false },
                { name: 'skip', isRequired: false }
            ]
        }
    ],
    idPrefixes: ['tt'], // On utilise maintenant les IDs IMDB
    behaviorHints: {
        adult: false,
        p2p: false
    }
};

// Création du builder
const builder = new addonBuilder(manifest);

// Handler pour le catalogue
builder.defineCatalogHandler(async ({ type, id, extra }) => {
    console.log(`📚 Catalog request: type=${type}, id=${id}, extra=${JSON.stringify(extra)}`);
    
    try {
        let metas = [];
        
        if (id === 'animesama-catalog' || id === 'animesama-anime-catalog') {
            const skip = extra.skip ? parseInt(extra.skip) : 0;
            let animes = [];
            
            if (extra.search) {
                // Recherche d'anime
                animes = await scraper.searchAnime(extra.search);
            } else {
                // Liste du catalogue
                animes = await scraper.getCatalog(skip, 50);
            }

            // Convertir chaque anime avec son ID IMDB
            for (const anime of animes) {
                try {
                    // Chercher l'ID IMDB via Cinemeta
                    const imdbId = await cinemeta.getImdbId(anime.slug, anime.name);
                    
                    if (imdbId) {
                        // Récupérer les métadonnées complètes de Cinemeta
                        const cinemetaMeta = await cinemeta.getMeta(imdbId);
                        
                        metas.push({
                            id: imdbId,
                            type: type,
                            name: anime.name,
                            poster: cinemetaMeta?.poster || anime.poster,
                            posterShape: 'poster',
                            background: cinemetaMeta?.background,
                            description: cinemetaMeta?.description || `Regardez ${anime.name} en streaming`,
                            year: cinemetaMeta?.year,
                            genres: cinemetaMeta?.genres || []
                        });
                    } else {
                        // Fallback sans ID IMDB (ne fonctionnera pas avec Torrentio)
                        metas.push({
                            id: `animesama:${anime.slug}`,
                            type: type,
                            name: anime.name,
                            poster: anime.poster,
                            posterShape: 'poster',
                            description: `${anime.name} - Recherchez manuellement dans Stremio pour les streams`
                        });
                    }
                } catch (err) {
                    console.error(`Erreur pour ${anime.name}:`, err.message);
                }
            }
        }
        
        console.log(`✅ Returning ${metas.length} items`);
        return { metas };
    } catch (error) {
        console.error('❌ Catalog error:', error);
        return { metas: [] };
    }
});

// Handler pour les métadonnées - délègue à Cinemeta
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`📋 Meta request: type=${type}, id=${id}`);
    
    try {
        // Si c'est un ID IMDB, récupérer depuis Cinemeta
        if (id.startsWith('tt')) {
            const meta = await cinemeta.getMeta(id);
            
            if (meta) {
                return { 
                    meta: {
                        ...meta,
                        type: type
                    }
                };
            }
        }
        
        // Fallback pour les anciens IDs animesama:
        if (id.startsWith('animesama:')) {
            const slug = id.replace('animesama:', '');
            const details = await scraper.getAnimeDetails(slug);
            
            if (details) {
                // Essayer de trouver l'ID IMDB
                const imdbId = await cinemeta.getImdbId(slug, details.name);
                
                if (imdbId) {
                    const cinemetaMeta = await cinemeta.getMeta(imdbId);
                    if (cinemetaMeta) {
                        return { meta: { ...cinemetaMeta, type: type } };
                    }
                }
                
                // Sinon retourner les données Anime-Sama
                const videos = [];
                for (const season of details.seasons) {
                    const episodes = await scraper.getSeasonEpisodes(slug, season.number, season.lang);
                    for (const ep of episodes) {
                        videos.push({
                            id: ep.id,
                            title: `${season.name} - ${ep.title}`,
                            season: season.number,
                            episode: ep.number,
                            released: new Date().toISOString()
                        });
                    }
                }
                
                return {
                    meta: {
                        id: id,
                        type: type,
                        name: details.name,
                        poster: details.poster,
                        description: details.description,
                        genres: details.genres,
                        videos: videos
                    }
                };
            }
        }
        
        return { meta: null };
    } catch (error) {
        console.error('❌ Meta error:', error);
        return { meta: null };
    }
});

module.exports = builder.getInterface();
