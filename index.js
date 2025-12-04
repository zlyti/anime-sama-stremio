const { serveHTTP } = require('stremio-addon-sdk');
const addonInterface = require('./src/addon');

const PORT = process.env.PORT || 7000;

// Démarrage du serveur
serveHTTP(addonInterface, { port: PORT });

console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                    🎌 ANIME-SAMA STREMIO 🎌                    ║
╠═══════════════════════════════════════════════════════════════╣
║  Addon démarré avec succès !                                  ║
║                                                               ║
║  📺 URL locale: http://localhost:${PORT}                        ║
║  🔗 Manifest:   http://localhost:${PORT}/manifest.json          ║
║                                                               ║
║  Pour installer dans Stremio:                                 ║
║  1. Ouvrez Stremio                                            ║
║  2. Allez dans les paramètres (⚙️)                             ║
║  3. Cliquez sur "Addons"                                      ║
║  4. Entrez l'URL: http://localhost:${PORT}/manifest.json        ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`);

