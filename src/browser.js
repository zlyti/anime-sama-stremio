const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Activation du plugin Stealth pour contourner la détection anti-bot
puppeteer.use(StealthPlugin());

let browserInstance = null;
let browserLaunchPromise = null;

/**
 * Récupère ou crée une instance du navigateur
 */
async function getBrowser() {
    if (browserInstance && browserInstance.isConnected()) {
        return browserInstance;
    }
    
    // Éviter les lancements multiples simultanés
    if (browserLaunchPromise) {
        return browserLaunchPromise;
    }
    
    browserLaunchPromise = (async () => {
        try {
        console.log('🚀 Lancement du navigateur...');
        
        // Configuration pour Docker/Railway ou local
        const launchOptions = {
            headless: 'new',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-web-security',
                '--disable-features=IsolateOrigins,site-per-process',
                '--single-process'
            ],
            defaultViewport: {
                width: 1920,
                height: 1080
            }
        };
        
        // Utiliser le chemin Chrome de l'environnement si disponible
        if (process.env.PUPPETEER_EXECUTABLE_PATH) {
            launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
        }
        
        browserInstance = await puppeteer.launch(launchOptions);
            
            console.log('✅ Navigateur lancé avec succès');
            
            // Fermer le navigateur proprement à la fin du processus
            browserInstance.on('disconnected', () => {
                browserInstance = null;
                browserLaunchPromise = null;
            });
            
            return browserInstance;
        } catch (error) {
            console.error('❌ Erreur lors du lancement du navigateur:', error.message);
            browserLaunchPromise = null;
            throw error;
        }
    })();
    
    return browserLaunchPromise;
}

/**
 * Récupère le contenu HTML d'une page avec Puppeteer
 */
async function fetchPage(url, options = {}) {
    const { 
        waitForSelector = null, 
        waitTime = 2000,
        timeout = 30000 
    } = options;
    
    let page = null;
    
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        // Configuration de la page pour ressembler à un vrai navigateur
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
        });
        
        // Bloquer les ressources inutiles pour accélérer le chargement
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const resourceType = req.resourceType();
            if (['image', 'font', 'media'].includes(resourceType)) {
                req.abort();
            } else {
                req.continue();
            }
        });
        
        console.log(`📄 Chargement de: ${url}`);
        
        // Navigation vers la page
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: timeout
        });
        
        // Attendre un sélecteur spécifique si demandé
        if (waitForSelector) {
            await page.waitForSelector(waitForSelector, { timeout: 10000 }).catch(() => {});
        }
        
        // Attendre un peu pour que le JavaScript s'exécute
        await new Promise(r => setTimeout(r, waitTime));
        
        // Récupérer le HTML
        const html = await page.content();
        
        console.log(`✅ Page chargée: ${url.substring(0, 50)}...`);
        
        return {
            status: 200,
            data: html,
            url: page.url()
        };
        
    } catch (error) {
        console.error(`❌ Erreur lors du chargement de ${url}:`, error.message);
        return {
            status: 500,
            data: '',
            error: error.message
        };
    } finally {
        if (page) {
            await page.close().catch(() => {});
        }
    }
}

/**
 * Exécute du JavaScript sur une page et récupère les données
 */
async function fetchPageWithScript(url, script, options = {}) {
    const { timeout = 30000, waitTime = 3000, args = [] } = options;
    
    let page = null;
    
    try {
        const browser = await getBrowser();
        page = await browser.newPage();
        
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
        
        console.log(`🔧 Exécution de script sur: ${url}`);
        
        await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: timeout
        });
        
        await new Promise(r => setTimeout(r, waitTime));
        
        // Exécuter le script et récupérer les données (avec arguments si fournis)
        const result = await page.evaluate(script, ...args);
        
        console.log(`✅ Script exécuté avec succès`);
        
        return {
            status: 200,
            data: result
        };
        
    } catch (error) {
        console.error(`❌ Erreur lors de l'exécution du script:`, error.message);
        return {
            status: 500,
            data: null,
            error: error.message
        };
    } finally {
        if (page) {
            await page.close().catch(() => {});
        }
    }
}

/**
 * Ferme le navigateur
 */
async function closeBrowser() {
    if (browserInstance) {
        console.log('🔌 Fermeture du navigateur...');
        await browserInstance.close().catch(() => {});
        browserInstance = null;
        browserLaunchPromise = null;
    }
}

// Fermer proprement le navigateur à l'arrêt
process.on('SIGINT', closeBrowser);
process.on('SIGTERM', closeBrowser);
process.on('exit', closeBrowser);

module.exports = {
    getBrowser,
    fetchPage,
    fetchPageWithScript,
    closeBrowser
};

