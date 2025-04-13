# Skyscanner CLI

Interface en ligne de commande pour rechercher des vols via l'API Skyscanner.

![Skyscanner CLI](https://via.placeholder.com/800x400?text=Skyscanner+CLI)

## Fonctionnalités

- Recherche de vols aller simple ou aller-retour
- **Autocomplétion intelligente** des aéroports et des villes
  - Reconnaissance des codes IATA
  - Correction de fautes d'orthographe courantes
  - Suggestions contextuelles
- Mode hors-ligne avec données mockées (pour éviter les limitations d'API)
- Sélection de la classe de voyage (économique, premium, affaires, première)
- Affichage détaillé des itinéraires avec escales
- Interface utilisateur intuitive avec étapes progressives
- Dates par défaut intelligentes
- Validation complète des entrées utilisateur
- Tri par prix croissant
- **Filtres avancés** pour affiner votre recherche:
  - Prix maximum
  - Nombre maximal d'escales
  - Compagnies aériennes préférées
  - Options de tri (prix, durée, horaires)

## Installation

1. Clonez ce dépôt :

```
git clone https://github.com/votre-nom/skyscanner-cli.git
cd skyscanner-cli
```

2. Installez les dépendances :

```
npm install
```

3. Si vous souhaitez utiliser l'API réelle (optionnel) :

   - Créez un compte sur [RapidAPI](https://rapidapi.com/)
   - Abonnez-vous à l'API [Skyscanner](https://rapidapi.com/skyscanner/api/skyscanner-flight-search)
   - Copiez votre clé API
   - Modifiez le fichier `.env` pour ajouter votre clé et activer l'API réelle :

   ```
   RAPIDAPI_KEY=votre_cle_api_ici
   USE_REAL_API=true
   RAPIDAPI_HOST=skyscanner89.p.rapidapi.com
   ```

   Note: L'application va essayer plusieurs endpoints API dans un ordre de priorité et utilisera automatiquement les données mockées si aucune API n'est disponible.

4. Installez globalement (optionnel) :

```
npm install -g .
```

## Utilisation

### Via NPM

```
npm start search     # Rechercher des vols
npm start airports   # Afficher les aéroports populaires
```

### Si installé globalement

```
skyscanner search
skyscanner airports
```

## Guide d'utilisation

L'application vous guide à travers les étapes suivantes :

1. **Sélection du lieu de départ**

   - Entrez une ville, un aéroport ou un code IATA
   - Choisissez parmi les suggestions intelligentes

2. **Sélection de la destination**

   - Même processus que pour le départ
   - Suggestions contextuelles basées sur votre recherche

3. **Détails du voyage**

   - Date de départ (avec validation)
   - Type de vol (aller simple ou aller-retour)
   - Date de retour (si applicable)
   - Classe de voyage
   - Nombre de passagers

4. **Confirmation et recherche**

   - Récapitulatif des détails du voyage
   - Confirmation avant recherche

5. **Résultats**
   - Affichage détaillé des vols disponibles
   - Prix, escales, durée, compagnies aériennes
   - Pagination pour faciliter la navigation
   - Option de filtrage avancé

## Filtres avancés

Après avoir obtenu vos résultats de recherche, vous pouvez appliquer des filtres:

- **Prix maximum** - Définissez un budget maximal pour votre vol
- **Nombre d'escales** - Filtrez par vols directs ou avec un nombre limité d'escales
- **Compagnies aériennes** - Sélectionnez vos transporteurs préférés
- **Options de tri**:
  - Prix (croissant/décroissant)
  - Durée (plus court en premier)
  - Heure de départ (plus tôt/plus tard)

## Exemples d'utilisation

### Recherche simple :

```
> npm start search
```

Suivez les étapes interactives :

```
ÉTAPE 1: Choisissez votre lieu de départ
> Ville ou aéroport de départ: paris

Sélectionnez un lieu de départ:
> Paris Charles de Gaulle (CDG) - Paris, France

ÉTAPE 2: Choisissez votre destination
> Ville ou aéroport de destination: new york

Sélectionnez un lieu de destination:
> New York JFK (JFK) - New York, États-Unis

ÉTAPE 3: Détails du voyage
> Date de départ (YYYY-MM-DD): 2023-12-15
> Souhaitez-vous un vol aller-retour? Oui
> Date de retour (YYYY-MM-DD): 2023-12-22
> Classe de voyage: Économique
> Nombre d'adultes: 1

Recherche de vols...

RÉSULTATS:
Vol #1: Air France - 599€
CDG 10:25 → JFK 13:05 (Direct, 8h40)
JFK 17:30 → CDG 06:45+1 (Direct, 7h15)

Vol #2: United Airlines - 632€
...

Souhaitez-vous filtrer ces résultats? Oui

Prix maximum (EUR): 700
Nombre maximal d'escales: Vol direct uniquement
Compagnies aériennes: Air France
Trier par: Prix (croissant)

RÉSULTATS FILTRÉS:
Vol #1: Air France - 599€
CDG 10:25 → JFK 13:05 (Direct, 8h40)
JFK 17:30 → CDG 06:45+1 (Direct, 7h15)
```

### Afficher les aéroports populaires :

```
> npm start airports
```

## Mode hors-ligne vs API réelle

Par défaut, l'application utilise un mode hors-ligne avec des données mockées pour éviter les limitations des API. Ces données sont basées sur des estimations réalistes de prix et de durées de vol.

### Utilisation d'une API réelle

Si vous souhaitez utiliser une API Skyscanner réelle, suivez ces étapes :

1. Créez un compte sur [RapidAPI](https://rapidapi.com/)
2. Recherchez et abonnez-vous à une API Skyscanner fonctionnelle
   - Consultez les options recommandées dans le fichier `.env.example`
   - Vérifiez que l'API dispose des endpoints nécessaires (recherche d'aéroports, vols)
3. Obtenez votre clé API et notez le nom d'hôte de l'API
4. Modifiez votre fichier `.env` :

```
USE_REAL_API=true
RAPIDAPI_KEY=votre_cle_api_ici
RAPIDAPI_HOST=nom_hote_api.p.rapidapi.com
```

**Note importante** : Les API Skyscanner sur RapidAPI évoluent fréquemment. L'application est conçue pour utiliser les données mockées si l'API n'est pas disponible ou ne renvoie pas de résultats.

## Dépendances

- axios - Pour les requêtes HTTP
- chalk - Pour la coloration du texte dans le terminal
- commander - Pour la gestion des commandes CLI
- dotenv - Pour la gestion des variables d'environnement
- inquirer - Pour les interfaces interactives
- ora - Pour les indicateurs de chargement
