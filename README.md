# Skyscanner CLI

Interface en ligne de commande pour rechercher des vols via l'API Skyscanner directement depuis votre terminal.

## Fonctionnalités

- 🔍 Recherche intelligente d'aéroports et de villes avec autocomplétion
- 🌐 Recherche de vols internationaux et domestiques
- 🔄 Filtrage avancé des résultats par prix, durée, escales et compagnies
- 📋 Affichage des résultats avec pagination
- 📊 Visualisation détaillée des itinéraires
- 📱 Génération de liens directs vers Skyscanner pour la réservation
- 📄 Génération de rapports Markdown avec liens cliquables

## Installation

### Prérequis

- Node.js v14+
- npm ou yarn

### Installation globale

```bash
npm install -g skyscanner-cli
```

### Installation locale

```bash
# Cloner le dépôt
git clone https://github.com/votre-utilisateur/skyscanner-cli.git
cd skyscanner-cli

# Installer les dépendances
npm install

# Lier en tant que commande globale (optionnel)
npm link
```

## Configuration

1. Créez un fichier `.env` à la racine du projet (vous pouvez utiliser `.env.example` comme modèle)
2. Renseignez les variables d'environnement nécessaires:

```
# API Configuration
API_KEY=votre_clé_api_ici
API_HOST=skyscanner-api-host.com

# Debug options
DEBUG_API=false
USE_MOCK_DATA=false
USE_REAL_API=true

# Defaults
DEFAULT_MARKET=FR
DEFAULT_CURRENCY=EUR
DEFAULT_LOCALE=fr-FR
```

## Utilisation

### Utilisation en ligne de commande

```bash
# Lancer l'application interactive
skyscanner

# Rechercher des vols
skyscanner search
```

### Utilisation comme module

```javascript
const { searchFlights } = require("skyscanner-cli/lib/api");

async function findFlights() {
  const flights = await searchFlights({
    originId: "PARI",
    destinationId: "LOND",
    departureDate: "2025-05-20",
    adults: "1",
  });

  console.log(`Trouvé ${flights.length} vols!`);
}

findFlights();
```

## Structure du Projet

```
skyscanner-cli/
├── bin/                  # Scripts exécutables
│   └── skyscanner-cli.js # Point d'entrée principal
├── lib/                  # Bibliothèques et modules
│   ├── api.js            # API Skyscanner
│   ├── formatter.js      # Formatage des résultats
│   └── utils/            # Utilitaires
│       ├── api-tester.js        # Tests d'API
│       ├── cli-tools.js          # Outils CLI
│       └── deeplink-extractor.js # Gestion de deeplinks
├── reports/              # Rapports générés en MD
├── .env                  # Configuration locale
├── .env.example          # Exemple de configuration
├── package.json          # Dépendances et scripts
└── README.md             # Documentation
```

## Rapport Markdown

L'application génère automatiquement un rapport Markdown pour chaque recherche de vol. Ce rapport contient:

- Un résumé de la recherche
- Des informations détaillées sur chaque vol
- Des liens cliquables vers Skyscanner pour la réservation

Exemple de rapport:

```markdown
# 🛫 Rapport de Recherche de Vols

_Généré le 13/04/2024 à 16:45:09_

## 📊 Résumé

- **Nombre de vols trouvés**: 3
- **Prix minimum**: 31.00 EUR
- **Prix maximum**: 36.00 EUR

## 🎫 Résultats Détaillés

### Vol 1 🏆 MEILLEUR PRIX

**Prix**: **31.00 EUR**

**Durée totale**: 1h10

#### 🛫 ALLER - 1h10 (Direct)

_Mar 20/05_

| Compagnie           | Vol  | Départ            | Arrivée           | Durée |
| ------------------- | ---- | ----------------- | ----------------- | ----- |
| ✈️ Vueling Airlines | 8942 | 20/05 06:50 (ORY) | 20/05 07:00 (LGW) | 1h10  |

**[🔗 Réserver ce vol](https://www.skyscanner.fr/...)**
```

## Licence

ISC
