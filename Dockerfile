# Utiliser une image Node avec Chrome pré-installé pour Puppeteer
FROM ghcr.io/puppeteer/puppeteer:latest

# Définir le répertoire de travail
WORKDIR /app

# Copier les fichiers package
COPY package*.json ./

# Installer les dépendances (en tant que root temporairement)
USER root
RUN npm install --omit=dev

# Copier le reste du code
COPY . .

# Revenir à l'utilisateur pptruser pour la sécurité
USER pptruser

# Exposer le port
EXPOSE 7000

# Variable d'environnement pour Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Démarrer l'application
CMD ["node", "index.js"]

