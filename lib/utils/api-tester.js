const api = require('../api');
const util = require('util');

/**
 * Module pour tester les fonctionnalités de l'API Skyscanner
 */

/**
 * Affiche un objet avec une profondeur spécifiée
 * @param {Object} obj - L'objet à inspecter
 * @param {number} depth - La profondeur maximale d'inspection
 * @returns {string} La représentation formatée de l'objet
 */
function inspectObject(obj, depth = 3) {
  return util.inspect(obj, { depth, colors: true });
}

/**
 * Teste la fonctionnalité de recherche de lieux
 * @param {string} query - La requête de recherche
 * @returns {Promise<Object>} Les résultats de la recherche
 */
async function testLocationSearch(query) {
  try {
    const locations = await api.searchLocations(query);
    
    return {
      success: true,
      locations,
      count: locations ? locations.length : 0,
      message: `${locations ? locations.length : 0} lieux trouvés pour "${query}"`
    };
  } catch (error) {
    return {
      success: false,
      message: `Erreur lors de la recherche pour "${query}"`,
      error: error.message
    };
  }
}

/**
 * Teste la fonctionnalité de recherche de vols
 * @param {Object} flightParams - Les paramètres de recherche de vols
 * @returns {Promise<Object>} Les résultats de la recherche
 */
async function testFlightSearch(flightParams) {
  try {
    const flights = await api.searchFlights(flightParams);
    
    return {
      success: true,
      flights,
      count: flights ? flights.length : 0,
      message: `${flights ? flights.length : 0} vols trouvés`,
      // Extraire quelques deeplinks pour vérification
      deeplinks: flights && flights.length > 0 
        ? flights.slice(0, 3).map(flight => flight.deepLink || 'Pas de deeplink')
        : []
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors de la recherche de vols',
      error: error.message
    };
  }
}

/**
 * Exécute une série de tests de l'API
 * @returns {Promise<Object>} Les résultats des tests
 */
async function runFullTest() {
  try {
    // 1. Test de recherche de lieux d'origine
    const originResults = await testLocationSearch('Paris');
    
    if (!originResults.success || !originResults.locations || originResults.locations.length === 0) {
      return {
        success: false,
        message: 'Échec lors de la recherche du lieu d\'origine',
        details: originResults
      };
    }
    
    const origin = originResults.locations[0];
    
    // 2. Test de recherche de destinations
    const destinationResults = await testLocationSearch('London');
    
    if (!destinationResults.success || !destinationResults.locations || destinationResults.locations.length === 0) {
      return {
        success: false,
        message: 'Échec lors de la recherche de la destination',
        details: destinationResults
      };
    }
    
    const destination = destinationResults.locations[0];
    
    // 3. Test de recherche de vols
    const flightParams = {
      originId: origin.iata || origin.value,
      destinationId: destination.iata || destination.value,
      originEntityId: origin.entityId,
      destinationEntityId: destination.entityId,
      departureDate: '2025-05-20', // Date future
      adults: '1',
      cabin: 'economy'
    };
    
    const flightResults = await testFlightSearch(flightParams);
    
    return {
      success: flightResults.success,
      message: 'Test complet terminé',
      origin: {
        name: origin.name,
        code: origin.iata || origin.value
      },
      destination: {
        name: destination.name,
        code: destination.iata || destination.value
      },
      flightParams,
      flightResults
    };
  } catch (error) {
    return {
      success: false,
      message: 'Erreur lors de l\'exécution des tests',
      error: error.message
    };
  }
}

module.exports = {
  inspectObject,
  testLocationSearch,
  testFlightSearch,
  runFullTest
}; 