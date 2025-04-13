const api = require('../api');
const fs = require('fs');

/**
 * Module pour l'extraction et la génération de deeplinks
 * en utilisant l'approche à deux étapes (searchFlights + getFlightDetails)
 */

/**
 * Génère différents formats de deeplinks pour un vol
 * @param {Object} flight - L'objet vol
 * @param {Object} searchConfig - La configuration de recherche
 * @returns {Object} Les différents formats de deeplinks
 */
function generateDeeplinks(flight, searchConfig) {
  // Format standard
  const standardLink = api.createDeeplink(flight, searchConfig);
  
  // Nouveau format config
  const configLink = api.createConfigDeeplink(flight, searchConfig);
  
  // Format config avec domaine thai
  const thaiConfigLink = api.createConfigDeeplink(flight, searchConfig, 'th');
  
  return { 
    id: flight.id, 
    standardLink: standardLink,
    configLink: configLink,
    thaiConfigLink: thaiConfigLink,
    originalLink: flight.deepLink || ''
  };
}

/**
 * Extraction de deeplinks basée sur une configuration
 * @param {Object} searchConfig - La configuration de recherche
 * @param {boolean} saveToFile - Sauvegarder les résultats dans un fichier
 * @param {string} outputFile - Nom du fichier de sortie
 * @returns {Object} Les résultats de l'extraction
 */
async function extractDeeplinks(searchConfig, saveToFile = false, outputFile = 'enhanced-deeplinks.json') {
  try {
    // ÉTAPE 1: Recherche initiale pour obtenir le sessionId
    const searchResults = await api.searchFlights(searchConfig);
    
    if (!searchResults || searchResults.length === 0) {
      return { success: false, message: 'Aucun vol trouvé' };
    }
    
    // Extraire le sessionId
    const sessionId = searchResults[0].sessionId;
    
    let deeplinks;
    
    // ÉTAPE 2: Tenter d'obtenir les détails des vols avec getFlightDetails
    if (sessionId) {
      // Configuration pour getFlightDetails
      const detailsConfig = {
        origin: searchConfig.originId,
        destination: searchConfig.destinationId,
        date: searchConfig.departureDate,
        adults: parseInt(searchConfig.adults),
        cabinClass: searchConfig.cabin,
        sessionId: sessionId
      };
      
      // Obtenir les détails des vols
      const detailedFlights = await api.getFlightDetails(detailsConfig);
      
      // Si on a des résultats détaillés, on les utilise
      if (detailedFlights && detailedFlights.length > 0) {
        deeplinks = detailedFlights.slice(0, 5).map(flight => generateDeeplinks(flight, searchConfig));
      }
    }
    
    // Si on n'a pas de résultats détaillés, on utilise les résultats de recherche comme fallback
    if (!deeplinks) {
      deeplinks = searchResults.slice(0, 5).map(flight => generateDeeplinks(flight, searchConfig));
    }
    
    // Sauvegarder les deeplinks si demandé
    if (saveToFile && deeplinks && deeplinks.length > 0) {
      fs.writeFileSync(outputFile, JSON.stringify(deeplinks, null, 2));
    }
    
    return { 
      success: true, 
      deeplinks, 
      totalResults: searchResults.length,
      message: 'Extraction réussie'
    };
    
  } catch (error) {
    return { 
      success: false, 
      message: 'Erreur lors de l\'extraction', 
      error: error.message 
    };
  }
}

module.exports = {
  extractDeeplinks,
  generateDeeplinks
}; 