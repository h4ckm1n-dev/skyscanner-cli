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

## Licence

ISC

## Notes

Cette application a été développée pour offrir une expérience utilisateur optimale en ligne de commande pour la recherche de vols. Les données mockées sont basées sur des estimations réalistes de prix et de durées de vol.
