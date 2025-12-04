const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');
const scraper = require('./scraper');

// Configuration du manifest de l'addon
const manifest = {
    id: 'org.animesama.stremio',
    version: '1.1.0',
    name: 'Anime-Sama',
    description: 'Regardez vos animes préférés depuis Anime-Sama directement dans Stremio. Streaming VOSTFR et VF en haute qualité.',
    logo: 'https://anime-sama.org/favicon.ico',
    resources: ['catalog', 'meta', 'stream'],
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
            type: 'anime',
            id: 'animesama-anime-latest',
            name: 'Derniers épisodes'
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
    idPrefixes: ['animesama:'],
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
        const contentType = type; // 'anime' ou 'series'
        
        if (id === 'animesama-catalog' || id === 'animesama-anime-catalog') {
            const skip = extra.skip ? parseInt(extra.skip) : 0;
            
            if (extra.search) {
                // Recherche d'anime
                const results = await scraper.searchAnime(extra.search);
                metas = results.map(anime => ({
                    id: anime.id,
                    type: contentType,
                    name: anime.name,
                    poster: anime.poster,
                    posterShape: 'poster',
                    description: anime.description || `Regardez ${anime.name} en streaming sur Anime-Sama`
                }));
            } else {
                // Liste du catalogue
                const animes = await scraper.getCatalog(skip, 50);
                metas = animes.map(anime => ({
                    id: anime.id,
                    type: contentType,
                    name: anime.name,
                    poster: anime.poster,
                    posterShape: 'poster',
                    description: anime.description || `Regardez ${anime.name} en streaming sur Anime-Sama`
                }));
            }
        } else if (id === 'animesama-latest' || id === 'animesama-anime-latest') {
            // Derniers épisodes ajoutés
            const latest = await scraper.getLatestEpisodes();
            const uniqueAnimes = [...new Map(latest.map(ep => [ep.slug, ep])).values()];
            
            for (const ep of uniqueAnimes.slice(0, 20)) {
                const details = await scraper.getAnimeDetails(ep.slug);
                if (details) {
                    metas.push({
                        id: details.id,
                        type: contentType,
                        name: details.name,
                        poster: details.poster,
                        posterShape: 'poster',
                        description: `Nouvel épisode: S${ep.season}E${ep.episode}`
                    });
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

// Handler pour les métadonnées
builder.defineMetaHandler(async ({ type, id }) => {
    console.log(`📋 Meta request: type=${type}, id=${id}`);
    
    try {
        // Extraction du slug depuis l'ID (format: animesama:slug)
        const slug = id.replace('animesama:', '');
        const details = await scraper.getAnimeDetails(slug);
        
        if (!details) {
            console.log('❌ Anime not found');
            return { meta: null };
        }

        // Construction des vidéos (épisodes)
        const videos = [];
        
        for (const season of details.seasons) {
            const episodes = await scraper.getSeasonEpisodes(slug, season.number, season.lang);
            
            for (const ep of episodes) {
                videos.push({
                    id: ep.id,
                    title: `${season.name} - ${ep.title}`,
                    season: season.number,
                    episode: ep.number,
                    released: new Date().toISOString() // Date approximative
                });
            }
        }

        const meta = {
            id: details.id,
            type: type, // Utilise le type demandé ('anime' ou 'series')
            name: details.name,
            poster: details.poster,
            posterShape: 'poster',
            background: details.poster,
            description: details.description || `Regardez ${details.name} en streaming VOSTFR/VF sur Anime-Sama`,
            genres: details.genres,
            videos: videos
        };

        console.log(`✅ Returning meta with ${videos.length} episodes`);
        return { meta };
    } catch (error) {
        console.error('❌ Meta error:', error);
        return { meta: null };
    }
});

// Handler pour les streams
builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`🎬 Stream request: type=${type}, id=${id}`);
    
    try {
        // Format de l'ID: animesama:slug:season:episode
        const parts = id.split(':');
        if (parts.length < 4) {
            console.log('❌ Invalid stream ID format');
            return { streams: [] };
        }

        const [prefix, slug, seasonNum, episodeNum] = parts;
        const season = parseInt(seasonNum);
        const episode = parseInt(episodeNum);

        // Récupération des streams pour VOSTFR et VF
        const streams = [];
        
        for (const lang of ['vostfr', 'vf']) {
            const langStreams = await scraper.getStreamUrls(slug, season, episode, lang);
            
            for (const stream of langStreams) {
                streams.push({
                    name: `Anime-Sama`,
                    title: `${stream.name} (${lang.toUpperCase()}) - ${stream.quality}`,
                    url: stream.url,
                    behaviorHints: {
                        notWebReady: true,
                        bingeGroup: `animesama-${slug}-${lang}`
                    }
                });
            }
        }

        // Si aucun stream trouvé, on ajoute un lien vers la page web
        if (streams.length === 0) {
            const webUrl = `${scraper.BASE_URL}/catalogue/${slug}/saison${season}/vostfr/`;
            streams.push({
                name: 'Anime-Sama',
                title: '🌐 Ouvrir dans le navigateur',
                externalUrl: webUrl,
                behaviorHints: {
                    notWebReady: true
                }
            });
        }

        console.log(`✅ Returning ${streams.length} streams`);
        return { streams };
    } catch (error) {
        console.error('❌ Stream error:', error);
        return { streams: [] };
    }
});

module.exports = builder.getInterface();

