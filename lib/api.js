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
         const deepLinkUrl = offer.deeplink || offer.deepLink || `https://www.skyscanner.fr/transport/flights/${originId}/${destinationId}/${formattedDate}/${returnDate || ''}?adults=${adults}&cabinclass=${cabin || 'economy'}`;

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

module.exports = {
  getLocationId,
  searchLocations,
  searchFlights,
  getAirlinesList
}; 