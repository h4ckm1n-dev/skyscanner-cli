const axios = require('axios');
const chalk = require('chalk');

// Fonction utilitaire pour logger les réponses API de manière sécurisée
function logResponse(response) {
  try {
    if (process.env.DEBUG_API !== 'true') return;
    
    console.log('[DEBUG] Réponse API reçue:');
    console.log(`[DEBUG] Status: ${response.status}`);
    console.log(`[DEBUG] Headers: ${JSON.stringify(response.headers, null, 2)}`);
    
    // Limiter la taille des données pour éviter de surcharger la console
    const responseSummary = JSON.stringify(response.data, null, 2).substring(0, 1000);
    console.log(`[DEBUG] Data (limité à 1000 car.): ${responseSummary}${responseSummary.length >= 1000 ? '...' : ''}`);
  } catch (error) {
    console.log('[DEBUG] Erreur lors du log de la réponse:', error.message);
  }
}


// Base de données mockée des aéroports populaires

// Base de données des compagnies aériennes
const AIRLINES_DB = [
  { code: 'AF', name: 'Air France', country: 'France' },
  { code: 'BA', name: 'British Airways', country: 'Royaume-Uni' },
  { code: 'LH', name: 'Lufthansa', country: 'Allemagne' },
  { code: 'FR', name: 'Ryanair', country: 'Irlande' },
  { code: 'U2', name: 'EasyJet', country: 'Royaume-Uni' },
  { code: 'KL', name: 'KLM', country: 'Pays-Bas' },
  { code: 'IB', name: 'Iberia', country: 'Espagne' },
  { code: 'SN', name: 'Brussels Airlines', country: 'Belgique' },
  { code: 'LX', name: 'Swiss', country: 'Suisse' },
  { code: 'AZ', name: 'Alitalia', country: 'Italie' },
  { code: 'SK', name: 'SAS', country: 'Suède' },
  { code: 'OS', name: 'Austrian Airlines', country: 'Autriche' },
  { code: 'TK', name: 'Turkish Airlines', country: 'Turquie' },
  { code: 'EK', name: 'Emirates', country: 'Émirats arabes unis' },
  { code: 'QR', name: 'Qatar Airways', country: 'Qatar' },
  { code: 'EY', name: 'Etihad Airways', country: 'Émirats arabes unis' },
  { code: 'SQ', name: 'Singapore Airlines', country: 'Singapour' },
  { code: 'CX', name: 'Cathay Pacific', country: 'Hong Kong' },
  { code: 'JL', name: 'Japan Airlines', country: 'Japon' },
  { code: 'NH', name: 'ANA', country: 'Japon' },
  { code: 'OZ', name: 'Asiana Airlines', country: 'Corée du Sud' },
  { code: 'KE', name: 'Korean Air', country: 'Corée du Sud' },
  { code: 'CA', name: 'Air China', country: 'Chine' },
  { code: 'MU', name: 'China Eastern', country: 'Chine' },
  { code: 'CZ', name: 'China Southern', country: 'Chine' },
  { code: 'TG', name: 'Thai Airways', country: 'Thaïlande' },
  { code: 'SU', name: 'Aeroflot', country: 'Russie' },
  { code: 'AA', name: 'American Airlines', country: 'États-Unis' },
  { code: 'UA', name: 'United Airlines', country: 'États-Unis' },
  { code: 'DL', name: 'Delta Air Lines', country: 'États-Unis' },
  { code: 'AC', name: 'Air Canada', country: 'Canada' },
  { code: 'QF', name: 'Qantas', country: 'Australie' }
];

// Fonction pour obtenir la liste des compagnies aériennes
function getAirlinesList() {
  return AIRLINES_DB.map(airline => ({
    name: `${airline.name} (${airline.code})`,
    value: airline.name,
    country: airline.country
  }));
}

// Fonction pour calculer le score de similitude entre deux chaînes

// Fonction améliorée pour rechercher des lieux intelligemment (autocomplétion)
async function searchLocations(query) {
  if (process.env.USE_REAL_API === 'true') {
    // Logs de débogage
    if (process.env.DEBUG_API === 'true') {
      console.log(`[DEBUG] Tentative d'utilisation de l'API réelle pour la recherche: "${query}"`);
      console.log(`[DEBUG] Clé API présente: ${process.env.RAPIDAPI_KEY ? 'Oui' : 'Non'}`);
      console.log(`[DEBUG] Host API: ${process.env.RAPIDAPI_HOST}`);
    }
    
    try {
      // Plusieurs API à essayer - nous allons tenter de les utiliser dans l'ordre
      const apiEndpoints = [
        // Sky-scrapper API
        {
          url: 'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchAirport',
          params: { 
            query: query
          }
        },
        // Skyscanner89 - endpoint auto-complete
        {
          url: `https://${process.env.RAPIDAPI_HOST}/flights/auto-complete`,
          params: { 
            query: query
          }
        },
        // Skyscanner89 - ancien endpoint
        {
          url: `https://${process.env.RAPIDAPI_HOST}/locations/query`,
          params: { 
            query: query,
            locale: 'fr-FR' 
          }
        },
        // Ancienne API
        {
          url: 'https://skyscanner-skyscanner-flight-search-v1.p.rapidapi.com/apiservices/autosuggest/v1.0/FR/EUR/fr-FR/',
          params: { 
            query: query
          },
          host: 'skyscanner-skyscanner-flight-search-v1.p.rapidapi.com'
        }
      ];
      
      let error = null;
      
      // Essayer chaque API jusqu'à ce qu'une fonctionne
      for (const endpoint of apiEndpoints) {
        try {
          const options = {
            method: 'GET',
            url: endpoint.url,
            params: endpoint.params,
            headers: {
              'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
              'X-RapidAPI-Host': endpoint.host || process.env.RAPIDAPI_HOST
            }
          };
          
          if (process.env.DEBUG_API === 'true') {
            console.log('[DEBUG] Essai avec l\'endpoint:', endpoint.url);
            console.log('[DEBUG] Options de requête:', JSON.stringify(options, null, 2));
          }
          
          const response = await axios.request(options);
          
          if (process.env.DEBUG_API === 'true') {
            console.log('[DEBUG] Réponse reçue de l\'API');
            logResponse(response);
          }
          
          // Vérifier si la réponse contient des données utilisables
          if (response.data && 
              ((response.data.Places && response.data.Places.length > 0) || 
               (response.data.data && response.data.data.length > 0) ||
               (response.data.inputSuggest && response.data.inputSuggest.length > 0) ||
               (response.data.data && response.data.data.places && response.data.data.places.length > 0) ||
               (Array.isArray(response.data) && response.data.length > 0))) {
            
            // Format API sky-scrapper
            if (response.data.data && Array.isArray(response.data.data)) {
              return response.data.data.map(place => {
                const presentation = place.presentation || {};
                const navigation = place.navigation || {};
                const flightParams = navigation.relevantFlightParams || {};
                
                return {
                  entityId: place.entityId || navigation.entityId || '',
                  skyId: place.skyId || flightParams.skyId || '',
                  name: navigation.localizedName || presentation.title || '',
                  city: presentation.title || navigation.localizedName || '',
                  countryId: '',
                  countryName: presentation.subtitle || '',
                  iata: place.skyId || flightParams.skyId || '',
                  value: place.skyId || flightParams.skyId || ''
                };
              });
            }
            
            // Format API sky-scrapper (autres formats)
            if (response.data.data && response.data.data.places && response.data.data.places.length > 0) {
              return response.data.data.places.map(place => ({
                entityId: place.entityId || place.id || place.placeId || '',
                skyId: place.iataCode || place.code || '',
                name: place.name || '',
                city: place.cityName || place.city || place.name || '',
                countryId: place.countryId || '',
                countryName: place.countryName || place.country?.name || '',
                iata: place.iataCode || place.code || '',
                value: place.iataCode || place.code || ''
              }));
            }
            
            // Traiter selon le format de l'API
            if (response.data.inputSuggest && response.data.inputSuggest.length > 0) {
              // Format API auto-complete
              return response.data.inputSuggest.map(item => {
                const nav = item.navigation || {};
                const flightParams = nav.relevantFlightParams || {};
                const presentation = item.presentation || {};
                
                return {
                  entityId: nav.entityId || '',
                  skyId: flightParams.skyId || '',
                  name: nav.localizedName || presentation.title || '',
                  city: presentation.title || nav.localizedName || '',
                  countryId: '',
                  countryName: presentation.subtitle || '',
                  iata: flightParams.skyId || '',
                  value: flightParams.skyId || ''
                };
              });
            } else if (response.data.Places) {
              // Format ancien Skyscanner
              return response.data.Places.map(place => ({
                entityId: place.PlaceId,
                skyId: place.PlaceId,
                name: place.PlaceName,
                city: place.CityName || place.PlaceName,
                countryId: place.CountryId,
                countryName: place.CountryName,
                iata: place.IataCode || place.PlaceId,
                value: place.IataCode || place.PlaceId
              }));
            } else if (response.data.data) {
              // Format données.data
              return response.data.data.map(item => ({
                entityId: item.entityId || item.id || '',
                skyId: item.skyId || item.id || '',
                name: item.name || item.title || '',
                city: item.city?.name || item.title || item.name || '',
                countryId: item.country?.id || '',
                countryName: item.country?.name || '',
                iata: item.iata || item.id || '',
                value: item.iata || item.id || ''
              }));
            } else if (Array.isArray(response.data)) {
              // Format tableau
              return response.data.map(item => ({
                entityId: item.entityId || item.id || '',
                skyId: item.skyId || item.id || '',
                name: item.name || item.title || '',
                city: item.city || item.title || item.name || '',
                countryId: item.country?.id || '',
                countryName: item.country?.name || '',
                iata: item.iata || item.id || '',
                value: item.iata || item.id || ''
              }));
            }
          }
        } catch (e) {
          error = e;
          if (process.env.DEBUG_API === 'true') {
            console.log(`[DEBUG] Échec de l'endpoint ${endpoint.url}:`, e.message);
            if (e.response) {
              console.log('[DEBUG] Détails:', {
                status: e.response.status,
                data: e.response.data
              });
            }
          }
          // Continuer avec l'endpoint suivant
          continue;
        }
      }
      
      // Si nous arrivons ici, aucune API n'a fonctionné
      console.log(chalk.red('ERREUR: Aucune API de recherche de lieux n\'a fonctionné.'));
      if (error && process.env.DEBUG_API === 'true') {
        console.log('[DEBUG] Dernière erreur:', error.message);
      }
      return [];
      
    } catch (finalError) {
      console.log(chalk.red(`ERREUR: Recherche de lieux échouée: ${finalError.message}`));
      if (process.env.DEBUG_API === 'true') {
        if (finalError.response) {
          console.log('[DEBUG] Détails de l\'erreur:', {
            status: finalError.response.status,
            headers: finalError.response.headers,
            data: finalError.response.data
          });
        }
      }
      return [];
    }
  } else {
    console.log(chalk.red('ERREUR: Mode API réelle désactivé. Pour utiliser les API réelles, définissez USE_REAL_API=true dans .env'));
    return [];
  }
}

// Fonction pour obtenir l'ID d'un lieu à partir d'un nom de ville
async function getLocationId(query) {
  const locations = await searchLocations(query);
  if (locations.length > 0) {
    const location = locations[0];
    // Créer un objet avec les propriétés code IATA et entityId
    return {
      code: location.iata || location.value,
      entityId: location.entityId || '',
      skyId: location.skyId || ''
    };
  }
  return null;
}

// Exemple de données de vol mockées

// Fonction pour rechercher des vols (utilise uniquement Sky-Scrapper searchFlights)
async function searchFlights({ originId, destinationId, departureDate, returnDate, adults, cabin, originEntityId, destinationEntityId }) {
  // 1. Vérifier si le mode API réelle est activé
  if (process.env.USE_REAL_API !== 'true') {
    console.log(chalk.red('ERREUR: Mode API réelle désactivé. Pour utiliser l\'API Sky-Scrapper, définissez USE_REAL_API=true dans .env'));
    return [];
  }

  if (process.env.DEBUG_API === 'true') {
    console.log(chalk.blue('DEBUG: Tentative d\'utilisation de l\'API Sky-Scrapper (searchFlights uniquement)'));
    console.log(chalk.blue(`DEBUG: Clé API: ${process.env.RAPIDAPI_KEY ? '✓ présente' : '✗ manquante'}`));
  }

  // Définition des fonctions utilitaires locales
  // Fonction pour valider un lien deeplink
  function isValidDeeplink(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Vérifier que l'URL commence par http ou https
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
    // Vérifier que l'URL a une structure minimale valide
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  // Fonction pour trouver un deeplink valide dans un objet (recherche récursive)
  function findDeeplink(obj, maxDepth = 3, currentDepth = 0) {
    if (!obj || typeof obj !== 'object' || currentDepth > maxDepth) return null;
    
    // Liste des noms de propriétés potentielles pour les deeplinks
    const deepLinkProps = ['deeplink', 'deepLink', 'bookingLink', 'bookingUrl', 'url', 'referralUrl'];
    
    // Vérifier d'abord les propriétés directes
    for (const prop of deepLinkProps) {
      if (isValidDeeplink(obj[prop])) {
        return { url: obj[prop], source: `obj.${prop}` };
      }
    }
    
    // Rechercher dans les structures imbriquées connues
    if (obj.pricingOptions && Array.isArray(obj.pricingOptions) && obj.pricingOptions.length > 0) {
      // Vérifier dans les options de prix
      for (let i = 0; i < obj.pricingOptions.length; i++) {
        const option = obj.pricingOptions[i];
        
        // Vérifier directement dans l'option
        for (const prop of deepLinkProps) {
          if (isValidDeeplink(option[prop])) {
            return { url: option[prop], source: `obj.pricingOptions[${i}].${prop}` };
          }
        }
        
        // Vérifier dans les items de l'option
        if (option.items && Array.isArray(option.items)) {
          for (let j = 0; j < option.items.length; j++) {
            for (const prop of deepLinkProps) {
              if (isValidDeeplink(option.items[j][prop])) {
                return { url: option.items[j][prop], source: `obj.pricingOptions[${i}].items[${j}].${prop}` };
              }
            }
          }
        }
      }
    }
    
    // Vérifier dans la structure price
    if (obj.price && typeof obj.price === 'object') {
      for (const prop of deepLinkProps) {
        if (isValidDeeplink(obj.price[prop])) {
          return { url: obj.price[prop], source: `obj.price.${prop}` };
        }
      }
      
      // Vérifier dans les options de prix
      if (obj.price.options && Array.isArray(obj.price.options)) {
        for (let i = 0; i < obj.price.options.length; i++) {
          for (const prop of deepLinkProps) {
            if (isValidDeeplink(obj.price.options[i][prop])) {
              return { url: obj.price.options[i][prop], source: `obj.price.options[${i}].${prop}` };
            }
          }
        }
      }
    }
    
    // Vérifier dans la structure de liens
    if (obj.links && typeof obj.links === 'object') {
      for (const prop of deepLinkProps) {
        if (isValidDeeplink(obj.links[prop])) {
          return { url: obj.links[prop], source: `obj.links.${prop}` };
        }
      }
    }
    
    // Vérifier les chemins spécifiques à la structure Skyscanner
    const specificPaths = [
      'pricingDetails.actionDetails.referralUrl',
      'pricingDetails.actionDetails.deepLink',
      'pricingDetails.bookingDetails.referralUrl',
      'booking.referralUrl',
      'pricing.referralUrl'
    ];
    
    for (const path of specificPaths) {
      const pathParts = path.split('.');
      let current = obj;
      
      // Naviguer dans le chemin
      for (let i = 0; i < pathParts.length; i++) {
        if (!current || typeof current !== 'object') break;
        current = current[pathParts[i]];
      }
      
      if (isValidDeeplink(current)) {
        return { url: current, source: `obj.${path}` };
      }
    }
    
    // Si toujours pas trouvé, chercher récursivement dans tous les objets enfants
    if (currentDepth < maxDepth - 1) {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          const result = findDeeplink(obj[key], maxDepth, currentDepth + 1);
          if (result) return result;
        }
      }
    }
    
    return null;
  }

  // 2. Formater la date
  const formattedDate = departureDate.includes('/') ? departureDate.split('/').reverse().join('-') : departureDate;

  // 3. Fonction interne pour traiter la réponse de Sky-Scrapper searchFlights
  const processSkyScrapperResponse = (response) => {
    if (process.env.DEBUG_API === 'true') {
      console.log(chalk.green('Traitement de la réponse de sky-scrapper searchFlights...'));
    }

    // Vérifier le statut global et interne
    if (!response.data || response.data.status !== true || response.data.data?.context?.status === 'failure') {
      if (process.env.DEBUG_API === 'true') {
        console.log(chalk.yellow('Réponse API reçue mais indique un échec interne ou manque de données.'));
        if (response.data?.data?.context?.status) {
          console.log(chalk.yellow(`DEBUG: Statut API interne: ${response.data.data.context.status}`));
        }
      }
      return null; // Pas de vols valides à traiter
    }

    // Extraire les offres de vol brutes (adapter les chemins si nécessaire)
    let flightOffers = [];
    const data = response.data.data;
    if (data?.flightOffers && Array.isArray(data.flightOffers) && data.flightOffers.length > 0) {
      flightOffers = data.flightOffers;
    } else if (data?.flightResults && Array.isArray(data.flightResults) && data.flightResults.length > 0) {
      flightOffers = data.flightResults;
    } else if (data?.itineraries && Array.isArray(data.itineraries) && data.itineraries.length > 0) {
      flightOffers = data.itineraries; 
    } else if (response.data.flightResults && Array.isArray(response.data.flightResults) && response.data.flightResults.length > 0) {
       flightOffers = response.data.flightResults;
     } else if (Array.isArray(response.data.data) && response.data.data.length > 0) {
        flightOffers = response.data.data;
      } else if (Array.isArray(response.data) && response.data.length > 0) {
        flightOffers = response.data;
      }

    if (process.env.DEBUG_API === 'true') {
        console.log(chalk.green(`DEBUG: ${flightOffers.length} offres de vol brutes trouvées.`));
    }
    
    if (flightOffers.length === 0) {
        if (process.env.DEBUG_API === 'true') {
            console.log(chalk.yellow('Aucune structure de données de vol attendue trouvée dans la réponse.'));
        }
        return null;
    }

    // Formater les vols
    const flights = [];
    const sessionId = response.data.sessionId || data?.context?.sessionId || '';

    for (let i = 0; i < flightOffers.length; i++) {
      const offer = flightOffers[i];
      // S'assurer que l'offre et ses composants essentiels existent
      if (!offer || typeof offer !== 'object' || !offer.legs || !Array.isArray(offer.legs)) {
           if (process.env.DEBUG_API === 'true') console.log(chalk.yellow(`DEBUG: Offre ${i} invalide ou sans legs.`));
           continue;
      }

      const legs = [];
      for (const leg of offer.legs) {
        if (!leg || typeof leg !== 'object' || !leg.segments || !Array.isArray(leg.segments)) {
             if (process.env.DEBUG_API === 'true') console.log(chalk.yellow(`DEBUG: Leg invalide ou sans segments pour offre ${offer.id || i}.`));
             continue;
        }

        const segments = [];
        for (const segment of leg.segments) {
          if (!segment || typeof segment !== 'object') {
               if (process.env.DEBUG_API === 'true') console.log(chalk.yellow(`DEBUG: Segment invalide pour leg.`));
               continue;
          }
          segments.push({
            carrier: segment.marketingCarrier?.name || segment.airline?.name || segment.operatingCarrier?.name || 'Inconnue',
            flightNumber: segment.flightNumber || (segment.marketingCarrier?.alternateId ? `${segment.marketingCarrier.alternateId}${segment.marketingFlightNumber}` : '') || '',
            departure: {
              airport: segment.origin?.name || segment.origin?.displayCode || segment.departure?.airport?.name || '',
              code: segment.origin?.displayCode || segment.departure?.airport?.code || '',
              time: segment.departure || segment.departureDateTime || segment.departure?.time || ''
            },
            arrival: {
              airport: segment.destination?.name || segment.destination?.displayCode || segment.arrival?.airport?.name || '',
              code: segment.destination?.displayCode || segment.arrival?.airport?.code || '',
              time: segment.arrival || segment.arrivalDateTime || segment.arrival?.time || ''
            },
            duration: segment.durationInMinutes || segment.duration?.totalMinutes || segment.duration?.minutes || 0
          });
        } // Fin boucle segments

        if (segments.length > 0) {
          legs.push({
            duration: leg.durationInMinutes || leg.duration?.totalMinutes || leg.duration?.minutes || 0,
            segments: segments,
            stops: leg.stopCount ?? (segments.length - 1) // Calculer stops si manquant
          });
        } else {
             if (process.env.DEBUG_API === 'true') console.log(chalk.yellow(`DEBUG: Leg sans segments valides pour offre ${offer.id || i}.`));
        }
      } // Fin boucle legs

      // Ajouter le vol seulement s'il a des legs formatés
      if (legs.length > 0) {
         const priceAmount = offer.price?.raw ?? offer.price?.amount ?? offer.price?.total ?? offer.pricingOptions?.[0]?.price?.amount ?? 0;
         const priceCurrency = offer.price?.currency ?? offer.pricingOptions?.[0]?.price?.currency ?? 'EUR';
         
         // Amélioration de l'extraction du deeplink en utilisant la fonction de recherche
         let deepLinkUrl;
         let deeplinkSource = 'fallback';
         
         // Utiliser notre fonction de recherche de deeplink
         const deeplinkResult = findDeeplink(offer);
         
         if (deeplinkResult) {
           deepLinkUrl = deeplinkResult.url;
           deeplinkSource = deeplinkResult.source;
         } else {
           // Lien de repli amélioré avec des paramètres supplémentaires pour une meilleure pertinence
           deepLinkUrl = `https://www.skyscanner.fr/transport/flights/${originId}/${destinationId}/${formattedDate}${returnDate ? '/' + returnDate : ''}?adults=${adults || '1'}&cabinclass=${cabin || 'economy'}&rtn=${returnDate ? '1' : '0'}&preferDirects=true`;
           
           // En mode debug, signaler que nous utilisons un lien de repli
           if (process.env.DEBUG_API === 'true') {
             console.log(chalk.yellow(`DEBUG: Utilisation d'un lien de repli pour le vol ${offer.id || i}, aucun deeplink trouvé dans l'API`));
           }
         }
         
         // Log de débogage pour afficher la source et le lien
         if (process.env.DEBUG_API === 'true') {
           console.log(chalk.blue(`DEBUG: Deeplink pour vol #${i+1} [source: ${deeplinkSource}]: ${deepLinkUrl.substring(0, 100)}${deepLinkUrl.length > 100 ? '...' : ''}`));
         }

        flights.push({
          id: offer.id || `flight-${sessionId}-${i}`, // Créer un ID unique si manquant
          sessionId: sessionId,
          price: { amount: priceAmount, currency: priceCurrency },
          legs: legs,
          deepLink: deepLinkUrl
        });
      } else if (process.env.DEBUG_API === 'true') {
          console.log(chalk.yellow(`DEBUG: Offre ${offer.id || i} ignorée car aucun leg formaté.`));
      }
    } // Fin boucle flightOffers
    
    if (flights.length === 0) {
        if(process.env.DEBUG_API === 'true') {
            console.log(chalk.yellow(`AVERTISSEMENT: ${flightOffers.length} offres brutes trouvées mais aucune n'a pu être formatée en vol valide.`));
        }
        return null;
    }

    // Trier par prix
    return flights.sort((a, b) => a.price.amount - b.price.amount);
  }; // Fin processSkyScrapperResponse

  // 4. Préparer et exécuter la requête API
  try {
    const options = {
      method: 'GET',
      url: 'https://sky-scrapper.p.rapidapi.com/api/v1/flights/searchFlights',
      params: {
        originSkyId: originId,
        destinationSkyId: destinationId,
        originEntityId: originEntityId || '',
        destinationEntityId: destinationEntityId || '',
        date: formattedDate,
        adults: adults || "1",
        currency: "EUR",
        countryCode: "FR",
        market: "fr-FR",
        locale: "fr-FR",
        ...(cabin && { cabinClass: cabin }) // Inclure seulement si défini
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST,
        'Content-Type': 'application/json',
         'Accept-Encoding': 'gzip, deflate, br' // Recommandé par RapidAPI
      },
       timeout: 30000 // Timeout de 30 secondes
    };

    if (process.env.DEBUG_API === 'true') {
      console.log(chalk.blue('Envoi de la requête à Sky-Scrapper searchFlights...'));
      console.log(chalk.blue(`DEBUG: URL: ${options.url}`));
      console.log(chalk.blue(`DEBUG: Paramètres: ${JSON.stringify(options.params)}`));
    }

    const response = await axios.request(options);

    if (process.env.DEBUG_API === 'true') {
      console.log(chalk.blue(`Réponse reçue (Status: ${response.status})`));
      logResponse(response); // Utilise la fonction de log détaillée
    }

    // 5. Traiter la réponse
    const flights = processSkyScrapperResponse(response);

    if (flights && flights.length > 0) {
      if (process.env.DEBUG_API === 'true') {
        console.log(chalk.green(`${flights.length} vols trouvés et traités avec succès depuis Sky-Scrapper!`));
      }
      return flights;
    } else {
      console.log(chalk.yellow('Aucun vol valide trouvé via l\'API Sky-Scrapper pour ces critères après traitement.'));
      return []; // Retourner tableau vide si aucun vol valide
    }

  } catch (error) {
    // 6. Gérer les erreurs de l'appel API
    console.log(chalk.red(`ERREUR: L\'appel à l\'API Sky-Scrapper a échoué: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
       // Loguer la data seulement en mode debug pour éviter trop de bruit
       if (process.env.DEBUG_API === 'true') {
           console.log(chalk.red(`Data: ${JSON.stringify(error.response.data)}`));
       } else if (error.response.data && error.response.data.message) {
            // Afficher le message d'erreur de l'API s'il existe
            console.log(chalk.red(`Message API: ${error.response.data.message}`));
       }
    } else if (error.request) {
        console.log(chalk.red('Aucune réponse reçue de l\'API (Timeout ou problème réseau?).'));
    }
    
    if (process.env.DEBUG_API === 'true') {
      // Log plus détaillé de l'erreur en mode debug
      const errorDetails = {
        message: error.message,
        code: error.code,
        config_url: error.config?.url,
        config_params: error.config?.params,
        response_status: error.response?.status,
        response_data_preview: JSON.stringify(error.response?.data)?.substring(0, 200) + '...'
      };
      console.log(chalk.red(`DEBUG: Détails de l\'erreur API: ${JSON.stringify(errorDetails, null, 2)}`));
    }
    console.log(chalk.red('Veuillez vérifier votre clé API, les paramètres ou la disponibilité de l\'API Sky-Scrapper.'));
    return []; // Retourner tableau vide en cas d'erreur
  }
} // Fin searchFlights

// Fonction pour obtenir les détails d'un vol spécifique
async function getFlightDetails({ origin, destination, date, adults = 1, cabinClass = 'economy', currency = 'EUR', locale = 'fr-FR', countryCode = 'FR', sessionId = '' }) {
  if (process.env.USE_REAL_API !== 'true') {
    console.log(chalk.red('ERREUR: Mode API réelle désactivé. Pour utiliser l\'API Sky-Scrapper, définissez USE_REAL_API=true dans .env'));
    return null;
  }

  if (process.env.DEBUG_API === 'true') {
    console.log(chalk.blue('DEBUG: Tentative d\'utilisation de l\'API Sky-Scrapper (getFlightDetails)'));
    console.log(chalk.blue(`DEBUG: Clé API: ${process.env.RAPIDAPI_KEY ? '✓ présente' : '✗ manquante'}`));
    console.log(chalk.blue(`DEBUG: SessionId: ${sessionId ? '✓ présent' : '✗ manquant'}`));
  }

  // Définir les fonctions utilitaires internes
  function isValidDeeplink(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Vérifier que l'URL commence par http ou https
    if (!url.startsWith('http://') && !url.startsWith('https://')) return false;
    
    // Vérifier que l'URL a une structure minimale valide
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  }

  function findDeeplink(obj, maxDepth = 3, currentDepth = 0) {
    if (!obj || typeof obj !== 'object' || currentDepth > maxDepth) return null;
    
    // Liste des noms de propriétés potentielles pour les deeplinks
    const deepLinkProps = ['deeplink', 'deepLink', 'bookingLink', 'bookingUrl', 'url', 'referralUrl'];
    
    // Vérifier d'abord les propriétés directes
    for (const prop of deepLinkProps) {
      if (isValidDeeplink(obj[prop])) {
        return { url: obj[prop], source: `obj.${prop}` };
      }
    }
    
    // Vérifier dans les structures imbriquées connues
    if (obj.pricingOptions && Array.isArray(obj.pricingOptions) && obj.pricingOptions.length > 0) {
      // Vérifier dans les options de prix
      for (let i = 0; i < obj.pricingOptions.length; i++) {
        const option = obj.pricingOptions[i];
        
        // Vérifier directement dans l'option
        for (const prop of deepLinkProps) {
          if (isValidDeeplink(option[prop])) {
            return { url: option[prop], source: `obj.pricingOptions[${i}].${prop}` };
          }
        }
        
        // Vérifier dans les items de l'option
        if (option.items && Array.isArray(option.items)) {
          for (let j = 0; j < option.items.length; j++) {
            for (const prop of deepLinkProps) {
              if (isValidDeeplink(option.items[j][prop])) {
                return { url: option.items[j][prop], source: `obj.pricingOptions[${i}].items[${j}].${prop}` };
              }
            }
          }
        }
      }
    }
    
    // Vérifier dans la structure price
    if (obj.price && typeof obj.price === 'object') {
      for (const prop of deepLinkProps) {
        if (isValidDeeplink(obj.price[prop])) {
          return { url: obj.price[prop], source: `obj.price.${prop}` };
        }
      }
      
      // Vérifier dans les options de prix
      if (obj.price.options && Array.isArray(obj.price.options)) {
        for (let i = 0; i < obj.price.options.length; i++) {
          for (const prop of deepLinkProps) {
            if (isValidDeeplink(obj.price.options[i][prop])) {
              return { url: obj.price.options[i][prop], source: `obj.price.options[${i}].${prop}` };
            }
          }
        }
      }
    }
    
    // Vérifier dans la structure de liens
    if (obj.links && typeof obj.links === 'object') {
      for (const prop of deepLinkProps) {
        if (isValidDeeplink(obj.links[prop])) {
          return { url: obj.links[prop], source: `obj.links.${prop}` };
        }
      }
    }
    
    // Vérifier les chemins spécifiques à la structure Skyscanner, y compris les chemins spécifiques à getFlightDetails
    const specificPaths = [
      'pricingDetails.actionDetails.referralUrl',
      'pricingDetails.actionDetails.deepLink',
      'pricingDetails.bookingDetails.referralUrl',
      'booking.referralUrl',
      'pricing.referralUrl',
      'pricing.deeplink',
      'context.booking.deeplink',
      'actionDetails.deeplink',
      'bookingOptions.0.actionDetails.deeplink'
    ];
    
    for (const path of specificPaths) {
      const pathParts = path.split('.');
      let current = obj;
      
      // Naviguer dans le chemin
      for (let i = 0; i < pathParts.length; i++) {
        if (!current || typeof current !== 'object') break;
        if (pathParts[i] === '0' && Array.isArray(current)) {
          current = current[0];
        } else {
          current = current[pathParts[i]];
        }
      }
      
      if (isValidDeeplink(current)) {
        return { url: current, source: `obj.${path}` };
      }
    }
    
    // Si toujours pas trouvé, chercher récursivement dans tous les objets enfants
    if (currentDepth < maxDepth - 1) {
      for (const key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
          const result = findDeeplink(obj[key], maxDepth, currentDepth + 1);
          if (result) return result;
        }
      }
    }
    
    return null;
  }

  // Créer le paramètre legs
  const legs = [{ 
    origin, 
    destination, 
    date: date.includes('/') ? date.split('/').reverse().join('-') : date 
  }];
  
  try {
    const options = {
      method: 'GET',
      url: 'https://sky-scrapper.p.rapidapi.com/api/v1/flights/getFlightDetails',
      params: {
        legs: JSON.stringify(legs),
        adults: adults.toString(),
        currency,
        locale,
        market: locale,
        cabinClass: cabinClass.toLowerCase(),
        countryCode,
        ...(sessionId && { sessionId }) // Ajouter le sessionId s'il est présent
      },
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };
    
    if (process.env.DEBUG_API === 'true') {
      console.log(chalk.blue('Envoi de la requête à getFlightDetails...'));
      console.log(chalk.blue(`DEBUG: URL: ${options.url}`));
      console.log(chalk.blue(`DEBUG: Paramètres: ${JSON.stringify(options.params)}`));
    }
    
    const response = await axios.request(options);
    
    if (process.env.DEBUG_API === 'true') {
      console.log(chalk.blue(`Réponse getFlightDetails reçue (Status: ${response.status})`));
      logResponse(response);
    }
    
    // Si la réponse est en succès, essayer de traiter les données de vol
    if (response.data && response.data.status === true) {
      // Extraire les itinéraires
      const itineraries = response.data.data?.itineraries || 
                         response.data.data?.flightOffers || 
                         response.data.data?.flightResults || [];
      
      if (process.env.DEBUG_API === 'true') {
        console.log(chalk.green(`Nombre d'itinéraires trouvés: ${itineraries.length}`));
      }
      
      // Formatter les résultats
      const flights = [];
      
      for (let i = 0; i < itineraries.length; i++) {
        const itinerary = itineraries[i];
        
        // Trouver le deeplink
        let deepLinkUrl;
        let deeplinkSource = 'fallback';
        
        const deeplinkResult = findDeeplink(itinerary);
        
        if (deeplinkResult) {
          deepLinkUrl = deeplinkResult.url;
          deeplinkSource = deeplinkResult.source;
        } else {
          // Lien de repli
          deepLinkUrl = `https://www.skyscanner.fr/transport/flights/${origin}/${destination}/${legs[0].date}?adults=${adults}&cabinclass=${cabinClass}&rtn=0&preferDirects=true`;
          
          if (process.env.DEBUG_API === 'true') {
            console.log(chalk.yellow(`DEBUG: Utilisation d'un lien de repli pour l'itinéraire ${i}, aucun deeplink trouvé.`));
          }
        }
        
        // Log de débogage pour afficher la source et le lien
        if (process.env.DEBUG_API === 'true') {
          console.log(chalk.blue(`DEBUG: Deeplink pour itinéraire #${i+1} [source: ${deeplinkSource}]: ${deepLinkUrl.substring(0, 100)}${deepLinkUrl.length > 100 ? '...' : ''}`));
        }
        
        // Extraire les détails du prix
        const priceAmount = 
          itinerary.price?.raw ?? 
          itinerary.price?.amount ?? 
          itinerary.price?.total ?? 
          itinerary.pricing?.price?.amount ?? 
          itinerary.pricingOptions?.[0]?.price?.amount ?? 0;
        
        const priceCurrency = 
          itinerary.price?.currency ?? 
          itinerary.pricing?.price?.currency ?? 
          itinerary.pricingOptions?.[0]?.price?.currency ?? 
          currency;
        
        // Extraire les legs
        const legs = itinerary.legs || [];
        
        // Formatter les segments
        const formattedLegs = legs.map(leg => {
          const segments = (leg.segments || []).map(segment => ({
            carrier: segment.marketingCarrier?.name || segment.airline?.name || segment.operatingCarrier?.name || 'Inconnue',
            flightNumber: segment.flightNumber || (segment.marketingCarrier?.alternateId ? `${segment.marketingCarrier.alternateId}${segment.marketingFlightNumber}` : '') || '',
            departure: {
              airport: segment.origin?.name || segment.origin?.displayCode || segment.departure?.airport?.name || '',
              code: segment.origin?.displayCode || segment.departure?.airport?.code || '',
              time: segment.departure || segment.departureDateTime || segment.departure?.time || ''
            },
            arrival: {
              airport: segment.destination?.name || segment.destination?.displayCode || segment.arrival?.airport?.name || '',
              code: segment.destination?.displayCode || segment.arrival?.airport?.code || '',
              time: segment.arrival || segment.arrivalDateTime || segment.arrival?.time || ''
            },
            duration: segment.durationInMinutes || segment.duration?.totalMinutes || segment.duration?.minutes || 0
          }));
          
          return {
            duration: leg.durationInMinutes || leg.duration?.totalMinutes || leg.duration?.minutes || 0,
            segments: segments,
            stops: leg.stopCount ?? (segments.length - 1)
          };
        });
        
        // Ajouter le vol formaté
        flights.push({
          id: itinerary.id || `flight-getDetails-${i}`,
          sessionId: response.data.sessionId || response.data.data?.context?.sessionId || '',
          price: { amount: priceAmount, currency: priceCurrency },
          legs: formattedLegs,
          deepLink: deepLinkUrl
        });
      }
      
      return flights;
    } else {
      if (process.env.DEBUG_API === 'true') {
        console.log(chalk.yellow('Réponse API en échec ou sans données.'));
        if (response.data && response.data.message) {
          console.log(chalk.yellow(`Message: ${JSON.stringify(response.data.message)}`));
        }
      }
      return [];
    }
  } catch (error) {
    console.log(chalk.red(`ERREUR: L'appel à l'API Sky-Scrapper (getFlightDetails) a échoué: ${error.message}`));
    if (error.response) {
      console.log(chalk.red(`Status: ${error.response.status}`));
      if (process.env.DEBUG_API === 'true') {
        console.log(chalk.red(`Data: ${JSON.stringify(error.response.data)}`));
      }
    }
    return [];
  }
}

/**
 * Crée un deeplink optimisé pour Skyscanner à partir d'un objet vol et de la configuration de recherche
 * @param {Object} flight - Objet contenant les détails du vol
 * @param {Object} searchConfig - Configuration utilisée pour la recherche
 * @returns {string} - URL deeplink optimisée
 */
function createDeeplink(flight, searchConfig) {
  // Vérifier si nous avons déjà un deeplink valide
  if (flight.deepLink && flight.deepLink.startsWith('http')) {
    return flight.deepLink;
  }
  
  // Extraire les données nécessaires du vol
  const origin = searchConfig.originId || 'PARI';
  const destination = searchConfig.destinationId || 'LOND';
  const date = searchConfig.departureDate ? 
    (searchConfig.departureDate.includes('/') ? 
      searchConfig.departureDate.split('/').reverse().join('-') : 
      searchConfig.departureDate) : 
    '2025-05-20';
  const adults = searchConfig.adults || '1';
  const cabin = searchConfig.cabin || 'economy';
  
  // Extraire les compagnies aériennes du vol si disponibles
  let carriers = [];
  if (flight.legs && flight.legs.length > 0) {
    flight.legs.forEach(leg => {
      if (leg.segments && leg.segments.length > 0) {
        leg.segments.forEach(segment => {
          if (segment.carrier && typeof segment.carrier === 'string') {
            // Extraire le code de la compagnie aérienne s'il est inclus entre parenthèses
            const match = segment.carrier.match(/\(([A-Z0-9]{2})\)/);
            if (match && match[1]) {
              carriers.push(match[1]);
            } else {
              // Essayer d'extraire le code du numéro de vol
              const flightMatch = segment.flightNumber && segment.flightNumber.match(/^([A-Z0-9]{2})/);
              if (flightMatch && flightMatch[1]) {
                carriers.push(flightMatch[1]);
              }
            }
          }
        });
      }
    });
  }
  
  // Extraire l'escale si disponible
  let stops = [];
  if (flight.legs && flight.legs.length > 0) {
    flight.legs.forEach(leg => {
      if (leg.segments && leg.segments.length > 1) {
        for (let i = 0; i < leg.segments.length - 1; i++) {
          const stopCode = leg.segments[i].arrival && leg.segments[i].arrival.code;
          if (stopCode) {
            stops.push(stopCode);
          }
        }
      }
    });
  }
  
  // Construire l'URL de base
  let deeplink = `https://www.skyscanner.fr/transport/flights/${origin}/${destination}/${date}`;
  
  // Ajouter les paramètres
  const params = new URLSearchParams();
  params.append('adults', adults);
  params.append('cabinclass', cabin);
  params.append('rtn', '0'); // Aller simple
  params.append('preferDirects', 'true');
  
  // Ajouter des paramètres supplémentaires si disponibles
  if (carriers.length > 0) {
    params.append('carriers', carriers.join(','));
  }
  
  if (stops.length > 0) {
    params.append('stops', stops.join(','));
  }
  
  // Ajouter l'ID de session s'il est disponible
  if (flight.sessionId) {
    params.append('sessionId', flight.sessionId);
  }
  
  // Ajouter l'ID du vol s'il est disponible
  if (flight.id) {
    params.append('flightId', flight.id);
  }
  
  // Ajouter les paramètres d'entité si disponibles
  if (searchConfig.originEntityId) {
    params.append('originEntityId', searchConfig.originEntityId);
  }
  
  if (searchConfig.destinationEntityId) {
    params.append('destinationEntityId', searchConfig.destinationEntityId);
  }
  
  // Ajouter le prix pour aider l'utilisateur à retrouver le vol
  if (flight.price && flight.price.amount) {
    params.append('price', flight.price.amount);
    if (flight.price.currency) {
      params.append('currency', flight.price.currency);
    }
  }
  
  // Combiner l'URL de base et les paramètres
  return `${deeplink}?${params.toString()}`;
}

/**
 * Crée un deeplink au format config pour Skyscanner (format international)
 * @param {Object} flight - Objet contenant les détails du vol
 * @param {Object} searchConfig - Configuration utilisée pour la recherche
 * @param {string} domain - Domaine Skyscanner à utiliser (par défaut: fr)
 * @returns {string} - URL deeplink optimisée au format config
 */
function createConfigDeeplink(flight, searchConfig, domain = 'fr') {
  // Extraire les données de base
  const origin = searchConfig.originId || 'PARI';
  const destination = searchConfig.destinationId || 'LOND';
  
  // Convertir la date au format YYMMDD pour le chemin
  let dateStr = searchConfig.departureDate || '2025-05-20';
  let formattedDate = '';
  
  if (dateStr.includes('-')) {
    // Format YYYY-MM-DD
    const [year, month, day] = dateStr.split('-');
    formattedDate = `${year.slice(2)}${month}${day}`;
  } else if (dateStr.includes('/')) {
    // Format DD/MM/YYYY
    const [day, month, year] = dateStr.split('/');
    formattedDate = `${year.slice(2)}${month}${day}`;
  } else {
    formattedDate = dateStr; // Déjà au bon format ou format inconnu
  }
  
  // Générer l'identifiant de configuration basé sur les détails du vol
  let configId = '';
  
  // Si l'ID du vol est présent, l'utiliser pour la partie config
  if (flight.id) {
    configId = flight.id;
  } else if (flight.legs && flight.legs.length > 0) {
    // Sinon, construire un ID à partir des segments de vol
    const leg = flight.legs[0];
    const segments = leg.segments || [];
    
    if (segments.length > 0) {
      // Construire un ID à partir des heures de départ et des codes de compagnies
      const firstSegment = segments[0];
      const lastSegment = segments[segments.length - 1];
      
      // Extraire les informations nécessaires
      const departureTime = firstSegment.departure?.time || '';
      const arrivalTime = lastSegment.arrival?.time || '';
      
      // Convertir en timestamps si nécessaires et formater pour l'ID
      let depTimeStr = '';
      let arrTimeStr = '';
      
      if (departureTime) {
        if (typeof departureTime === 'string') {
          // Si c'est déjà une chaîne, extraire l'heure
          const timeMatch = departureTime.match(/\d{2}:\d{2}/);
          if (timeMatch) {
            depTimeStr = timeMatch[0].replace(':', '');
          }
        } else if (departureTime.getHours) {
          // Si c'est un objet Date
          depTimeStr = `${String(departureTime.getHours()).padStart(2, '0')}${String(departureTime.getMinutes()).padStart(2, '0')}`;
        }
      }
      
      if (arrivalTime) {
        if (typeof arrivalTime === 'string') {
          // Si c'est déjà une chaîne, extraire l'heure
          const timeMatch = arrivalTime.match(/\d{2}:\d{2}/);
          if (timeMatch) {
            arrTimeStr = timeMatch[0].replace(':', '');
          }
        } else if (arrivalTime.getHours) {
          // Si c'est un objet Date
          arrTimeStr = `${String(arrivalTime.getHours()).padStart(2, '0')}${String(arrivalTime.getMinutes()).padStart(2, '0')}`;
        }
      }
      
      // Identifier les compagnies aériennes
      let carriers = [];
      segments.forEach(segment => {
        if (segment.carrier) {
          const carrierCode = typeof segment.carrier === 'string' 
            ? segment.carrier.match(/\(([A-Z0-9]{2})\)/) 
            : null;
          
          if (carrierCode && carrierCode[1]) {
            carriers.push(carrierCode[1]);
          } else if (segment.flightNumber) {
            // Extraire le code de la compagnie à partir du numéro de vol
            const airlineCode = segment.flightNumber.match(/^([A-Z0-9]{2})/);
            if (airlineCode && airlineCode[1]) {
              carriers.push(airlineCode[1]);
            }
          }
        }
      });
      
      // Construire l'ID de configuration avec un format similaire à celui fourni
      // Format approximatif: [originAirport]-[dateTimeFormatted]--[carrierId]-[stops]-[destinationAirport]-[arrTimeFormatted]
      const stops = segments.length - 1;
      
      // Générer un ID fictif pour les aéroports si manquants
      const originCode = firstSegment.departure?.code || '9970';
      const destCode = lastSegment.arrival?.code || '10413';
      const carrierCode = carriers[0] || '31896';
      
      configId = `${originCode}-${formattedDate}${depTimeStr}--${carrierCode}-${stops}-${destCode}-${formattedDate}${arrTimeStr}`;
    }
  }
  
  // Fallback si aucun configId n'a pu être généré
  if (!configId) {
    configId = `flight-${Math.floor(Math.random() * 10000)}-${formattedDate}`;
  }
  
  // Construire l'URL au format config
  const tld = domain.includes('.') ? domain : `co.${domain}`;
  const baseUrl = `https://www.skyscanner.${tld}/transport/flights/${origin}/${destination}/${formattedDate}/config/${configId}`;
  
  // Ajouter les paramètres
  const params = new URLSearchParams();
  params.append('adultsv2', searchConfig.adults || '1');
  params.append('cabinclass', searchConfig.cabin || 'economy');
  params.append('childrenv2', '');
  params.append('ref', 'home');
  params.append('rtn', '0');
  params.append('preferdirects', 'false');
  params.append('outboundaltsenabled', 'false');
  params.append('inboundaltsenabled', 'false');
  
  return `${baseUrl}?${params.toString()}`;
}

module.exports = {
  getLocationId,
  searchLocations,
  searchFlights,
  getFlightDetails,
  getAirlinesList,
  createDeeplink,
  createConfigDeeplink
}; 