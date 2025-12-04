# 🎌 Anime-Sama Stremio Addon

Regardez vos animes préférés depuis **Anime-Sama** directement dans **Stremio** !

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)

## ✨ Fonctionnalités

- 📺 **Catalogue dynamique** - Scraping en temps réel d'Anime-Sama
- 🔍 **Recherche** - Trouvez n'importe quel anime
- 🎬 **Multi-lecteurs** - VOSTFR et VF disponibles
- 🆕 **Mises à jour auto** - Nouveaux épisodes détectés automatiquement
- ⚡ **Cache intelligent** - Performances optimales
- 🛡️ **Anti-bot bypass** - Utilise Puppeteer Stealth

## 🚀 Installation Rapide

### Option 1: Utilisation Locale

```bash
# Cloner le repo
git clone https://github.com/votre-username/anime-sama-stremio.git
cd anime-sama-stremio

# Installer les dépendances
npm install

# Lancer l'addon
npm start
```

Puis dans Stremio :
1. Ouvrez **Paramètres** > **Addons**
2. Cliquez sur l'icône **+** (Add addon)
3. Entrez : `http://localhost:7000/manifest.json`
4. Cliquez **Install**

### Option 2: Déploiement sur Render (Gratuit)

1. **Forkez** ce repo sur GitHub
2. Créez un compte sur [render.com](https://render.com)
3. **New** > **Web Service**
4. Connectez votre repo GitHub
5. Configuration :
   - **Name**: `anime-sama-stremio`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`
6. Cliquez **Create Web Service**
7. Une fois déployé, copiez l'URL et ajoutez `/manifest.json`
8. Installez cette URL dans Stremio !

### Option 3: Déploiement sur Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/anime-sama)

1. Cliquez le bouton ci-dessus
2. Connectez votre compte GitHub
3. Railway déploie automatiquement
4. Utilisez l'URL fournie dans Stremio

## 📖 Utilisation

1. **Parcourir** - Le catalogue Anime-Sama apparaît dans Stremio
2. **Rechercher** - Tapez le nom d'un anime
3. **Sélectionner** - Choisissez une saison et un épisode
4. **Regarder** - Sélectionnez VOSTFR ou VF

## 🔧 Configuration

| Variable | Description | Défaut |
|----------|-------------|--------|
| `PORT` | Port du serveur | `7000` |

## 📁 Structure du Projet

```
anime-sama-stremio/
├── index.js              # Point d'entrée
├── src/
│   ├── addon.js          # Configuration Stremio
│   ├── scraper.js        # Extraction des données
│   └── browser.js        # Puppeteer (anti-bot)
├── package.json
├── Procfile              # Heroku/Render
├── render.yaml           # Config Render
└── README.md
```

## 🛠️ Développement

```bash
# Mode développement
npm run dev

# Les logs montrent :
# 📚 Requêtes catalogue
# 📋 Requêtes métadonnées
# 🎬 Requêtes streams
# ✅ Succès / ❌ Erreurs
```

## ⚠️ Notes Importantes

- **Puppeteer** est utilisé pour contourner la protection anti-bot d'Anime-Sama
- Le premier chargement peut être lent (lancement du navigateur)
- Les données sont mises en cache pour 2h
- Sur les hébergeurs gratuits, le premier accès peut prendre 30s (cold start)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à :
- 🐛 Signaler des bugs
- 💡 Proposer des améliorations
- 🔧 Soumettre des PRs

## 📄 Licence

MIT - Utilisez librement, mais de manière responsable.

## ⚠️ Avertissement

Cet addon est fourni à titre éducatif. L'utilisateur est responsable de son utilisation dans le respect des droits d'auteur en vigueur dans son pays.

---

**Fait avec ❤️ pour la communauté anime française**
