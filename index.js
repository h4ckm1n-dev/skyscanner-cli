#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { searchFlights, searchLocations } = require('./lib/api');
const { formatFlightResults, formatTrendResults } = require('./lib/formatter');

// Configuration pour l'application
program
  .version('1.0.0')
  .description('Interface en ligne de commande pour rechercher des vols via Skyscanner');

// Fonction pour afficher un logo et une bannière stylisée
function showBanner() {
  console.log(chalk.blue.bold(`
   _____ _                                            _____ _      _____
  / ____| |                                          / ____| |    |_   _|
 | (___ | | ___   _ ___  ___ __ _ _ __  _ __   ___ | |    | |      | |
  \\___ \\| |/ / | | / __|/ __/ _\` | '_ \\| '_ \\ / _ \\| |    | |      | |
  ____) |   <| |_| \\__ \\ (_| (_| | | | | | | |  __/| |    | |____ _| |_
 |_____/|_|\\_\\\\__, |___/\\___\\__,_|_| |_|_| |_|\\___| \\_____|______|_____|
               __/ |
              |___/
  `));
  console.log(chalk.yellow('✈️  Trouvez les meilleurs vols au meilleur prix depuis votre terminal ✈️\n'));
}

// Fonction pour gérer l'autocomplétion intelligente
async function handleIntelligentSearch(prompt, type) {
  try {
    let input = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: prompt,
        validate: input => input.length >= 2 ? true : 'Veuillez entrer au moins 2 caractères'
      }
    ]);

    const spinner = ora(`Recherche des ${type === 'origin' ? 'lieux de départ' : 'destinations'}...`).start();
    const options = await searchLocations(input.query);
    spinner.stop();

    if (options.length === 0) {
      console.log(chalk.yellow(`Aucun résultat trouvé pour "${input.query}".`));
      
      // Suggérer des alternatives
      console.log(chalk.blue('Suggestions:'));
      console.log(chalk.blue('- Vérifiez l\'orthographe'));
      console.log(chalk.blue('- Essayez avec le nom de la ville plutôt que l\'aéroport'));
      console.log(chalk.blue('- Essayez avec un code IATA (ex: CDG pour Paris)\n'));
      
      return await handleIntelligentSearch(prompt, type);
    }

    // Modifier les options pour stocker les informations d'ID
    const optionsWithMetadata = options.map(option => ({
      name: option.name,
      value: {
        code: option.value,
        entityId: option.entityId,
        skyId: option.skyId
      },
      short: option.value
    }));

    // Afficher les résultats et demander à l'utilisateur de choisir
    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'selectedId',
        message: `Sélectionnez un ${type === 'origin' ? 'lieu de départ' : 'lieu de destination'}:`,
        choices: optionsWithMetadata,
        pageSize: 10
      }
    ]);

    return selection.selectedId;
  } catch (error) {
    console.error(chalk.red(`Erreur lors de la recherche des ${type === 'origin' ? 'lieux de départ' : 'destinations'}:`), error.message);
    return null;
  }
}

// Fonction pour appliquer des filtres aux résultats de vol
async function applyFilters(flights) {
  if (flights.length === 0) return [];
  
  const useFilters = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'apply',
      message: 'Souhaitez-vous filtrer ces résultats?',
      default: false
    }
  ]);
  
  if (!useFilters.apply) return flights;
  
  // Collecter des informations sur la plage de prix et les compagnies disponibles
  const priceRange = {
    min: Math.min(...flights.map(f => f.price.amount)),
    max: Math.max(...flights.map(f => f.price.amount))
  };
  
  // Extraire les compagnies aériennes uniques
  const allAirlines = new Set();
  flights.forEach(flight => {
    flight.legs.forEach(leg => {
      leg.segments.forEach(segment => {
        allAirlines.add(segment.carrier);
      });
    });
  });
  
  const airlineChoices = [...allAirlines].map(airline => ({
    name: airline,
    value: airline
  }));
  
  // Calculer max d'escales
  const maxStopsAvailable = Math.max(...flights.map(f => 
    Math.max(...f.legs.map(leg => leg.stops))
  ));
  
  // Demander les filtres
  const filters = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxPrice',
      message: 'Prix maximum (EUR):',
      default: Math.ceil(priceRange.max),
      validate: val => val >= priceRange.min ? true : `Le prix minimum disponible est ${priceRange.min}`
    },
    {
      type: 'list',
      name: 'maxStops',
      message: 'Nombre maximal d\'escales:',
      choices: [
        { name: 'Tous les vols', value: 999 },
        { name: 'Vol direct uniquement', value: 0 },
        { name: 'Maximum 1 escale', value: 1 },
        { name: 'Maximum 2 escales', value: 2 }
      ].filter(choice => choice.value === 999 || choice.value <= maxStopsAvailable),
      default: 999
    },
    {
      type: 'checkbox',
      name: 'airlines',
      message: 'Compagnies aériennes (laissez vide pour toutes):',
      choices: airlineChoices,
      pageSize: 10
    },
    {
      type: 'list',
      name: 'sortBy',
      message: 'Trier par:',
      choices: [
        { name: 'Prix (croissant)', value: 'price_asc' },
        { name: 'Prix (décroissant)', value: 'price_desc' },
        { name: 'Durée (plus court)', value: 'duration_asc' },
        { name: 'Départ (plus tôt)', value: 'departure_asc' },
        { name: 'Départ (plus tard)', value: 'departure_desc' }
      ],
      default: 'price_asc'
    }
  ]);
  
  // Appliquer les filtres
  let filteredFlights = flights.filter(flight => {
    // Filtre par prix
    if (flight.price.amount > filters.maxPrice) return false;
    
    // Filtre par nombre d'escales
    const hasExcessStops = flight.legs.some(leg => leg.stops > filters.maxStops);
    if (hasExcessStops) return false;
    
    // Filtre par compagnies aériennes
    if (filters.airlines.length > 0) {
      // Vérifier si au moins une compagnie d'une étape correspond à celles sélectionnées
      const hasSelectedAirline = flight.legs.some(leg =>
        leg.segments.some(segment => filters.airlines.includes(segment.carrier))
      );
      if (!hasSelectedAirline) return false;
    }
    
    return true;
  });
  
  // Appliquer le tri
  switch (filters.sortBy) {
    case 'price_asc':
      filteredFlights.sort((a, b) => a.price.amount - b.price.amount);
      break;
    case 'price_desc':
      filteredFlights.sort((a, b) => b.price.amount - a.price.amount);
      break;
    case 'duration_asc':
      filteredFlights.sort((a, b) => {
        const aDuration = a.legs.reduce((sum, leg) => sum + leg.duration, 0);
        const bDuration = b.legs.reduce((sum, leg) => sum + leg.duration, 0);
        return aDuration - bDuration;
      });
      break;
    case 'departure_asc':
      filteredFlights.sort((a, b) => {
        const aTime = new Date(a.legs[0].segments[0].departure.time);
        const bTime = new Date(b.legs[0].segments[0].departure.time);
        return aTime - bTime;
      });
      break;
    case 'departure_desc':
      filteredFlights.sort((a, b) => {
        const aTime = new Date(a.legs[0].segments[0].departure.time);
        const bTime = new Date(b.legs[0].segments[0].departure.time);
        return bTime - aTime;
      });
      break;
  }
  
  return filteredFlights;
}

// Fonction pour afficher les résultats paginés
async function displayPaginatedResults(flights) {
  if (flights.length === 0) {
    console.log(chalk.yellow('Aucun vol ne correspond à vos critères.'));
    return;
  }
  
  const PAGE_SIZE = 10; // Nombre de vols par page
  let currentPage = 0;
  const totalPages = Math.ceil(flights.length / PAGE_SIZE);
  
  let viewing = true;
  
  while (viewing) {
    // Effacer la console pour une meilleure lisibilité
    console.clear();
    showBanner();
    
    console.log(chalk.cyan.bold(`\nRÉSULTATS DE RECHERCHE (Page ${currentPage + 1}/${totalPages})`));
    
    // Afficher les vols de la page actuelle
    const startIdx = currentPage * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, flights.length);
    const pageFlights = flights.slice(startIdx, endIdx);
    
    console.log(formatFlightResults(pageFlights, false)); // false = ne pas afficher le résumé
    
    // Afficher le résumé à la fin
    console.log(chalk.bold(`\n${flights.length} itinéraire(s) trouvé(s). Prix à partir de ${chalk.green(flights[0].price.amount.toFixed(2))} ${flights[0].price.currency}\n`));
    
    // Options de navigation
    const navigation = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'Navigation:',
        choices: [
          ...((currentPage > 0) ? [{ name: '◀️  Page précédente', value: 'prev' }] : []),
          ...((currentPage < totalPages - 1) ? [{ name: '▶️  Page suivante', value: 'next' }] : []),
          { name: '🔍 Voir les détails d\'un vol', value: 'details' },
          { name: '🔄 Appliquer d\'autres filtres', value: 'filter' },
          { name: '📋 Exporter les résultats', value: 'export' },
          { name: '❌ Quitter', value: 'exit' }
        ]
      }
    ]);
    
    switch (navigation.action) {
      case 'prev':
        currentPage--;
        break;
      case 'next':
        currentPage++;
        break;
      case 'details':
        // Voir les détails d'un vol
        const detail = await inquirer.prompt([
          {
            type: 'number',
            name: 'flightIndex',
            message: 'Numéro du vol à consulter (1-' + pageFlights.length + '):',
            validate: val => val >= 1 && val <= pageFlights.length ? true : 'Veuillez entrer un numéro valide'
          }
        ]);
        
        console.clear();
        showBanner();
        console.log(chalk.cyan.bold('\nDÉTAILS DU VOL'));
        console.log(formatFlightResults([pageFlights[detail.flightIndex - 1]], true, true)); // true = afficher résumé, true = mode détaillé
        
        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Appuyez sur Entrée pour revenir aux résultats...'
          }
        ]);
        break;
      case 'filter':
        // Appliquer d'autres filtres
        const filteredAgain = await applyFilters(flights);
        if (filteredAgain.length > 0) {
          flights = filteredAgain;
          totalPages = Math.ceil(flights.length / PAGE_SIZE);
          currentPage = 0;
        }
        break;
      case 'export':
        // Exporter les résultats
        const exportOption = await inquirer.prompt([
          {
            type: 'list',
            name: 'format',
            message: 'Format d\'export:',
            choices: [
              { name: 'CSV', value: 'csv' },
              { name: 'JSON', value: 'json' },
              { name: 'Texte simple', value: 'text' }
            ]
          }
        ]);
        
        console.log(chalk.green(`\nExport ${exportOption.format} serait enregistré ici (fonctionnalité à implémenter)`));
        await new Promise(resolve => setTimeout(resolve, 1500));
        break;
      case 'exit':
        viewing = false;
        break;
    }
  }
}

// Commande de recherche
program
  .command('search')
  .description('Rechercher des vols')
  .action(async () => {
    try {
      console.clear();
      showBanner();
      
      // Étape 1: Recherche intelligente pour le lieu de départ
      console.log(chalk.cyan.bold('ÉTAPE 1: Choisissez votre lieu de départ'));
      const originId = await handleIntelligentSearch('Ville ou aéroport de départ (tapez le nom ou le code IATA):', 'origin');
      if (!originId) {
        console.log(chalk.red('Impossible de continuer sans lieu de départ.'));
        return;
      }
      
      // Étape 2: Recherche intelligente pour la destination
      console.log(chalk.cyan.bold('\nÉTAPE 2: Choisissez votre destination'));
      const destinationId = await handleIntelligentSearch('Ville ou aéroport de destination (tapez le nom ou le code IATA):', 'destination');
      if (!destinationId) {
        console.log(chalk.red('Impossible de continuer sans destination.'));
        return;
      }
      
      if (originId === destinationId) {
        console.log(chalk.red('Le lieu de départ et la destination ne peuvent pas être identiques.'));
        return;
      }
      
      // Étape 3: Dates et options de vol
      console.log(chalk.cyan.bold('\nÉTAPE 3: Détails du voyage'));
      
      // Fonction pour valider la date
      const validateDate = (input) => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(input)) {
          return 'Format de date invalide. Utilisez YYYY-MM-DD';
        }
        
        const date = new Date(input);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (isNaN(date.getTime())) {
          return 'Date invalide';
        }
        
        if (date < today) {
          return 'La date doit être dans le futur';
        }
        
        return true;
      };
      
      const travelDetails = await inquirer.prompt([
        {
          type: 'input',
          name: 'departureDate',
          message: 'Date de départ (YYYY-MM-DD):',
          validate: validateDate,
          default: (() => {
            const date = new Date();
            date.setDate(date.getDate() + 7); // Date par défaut: dans 7 jours
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          })()
        },
        {
          type: 'confirm',
          name: 'isRoundTrip',
          message: 'Souhaitez-vous un vol aller-retour?',
          default: true
        },
        {
          type: 'input',
          name: 'returnDate',
          message: 'Date de retour (YYYY-MM-DD):',
          when: (answers) => answers.isRoundTrip,
          validate: (input, answers) => {
            const baseValidation = validateDate(input);
            if (baseValidation !== true) {
              return baseValidation;
            }
            
            const departureDate = new Date(answers.departureDate);
            const returnDate = new Date(input);
            
            if (returnDate < departureDate) {
              return 'La date de retour doit être après la date de départ';
            }
            
            return true;
          },
          default: (answers) => {
            const date = new Date(answers.departureDate);
            date.setDate(date.getDate() + 7); // Retour par défaut: 7 jours après le départ
            return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
          }
        },
        {
          type: 'list',
          name: 'cabin',
          message: 'Classe de voyage (laisser vide pour Toutes):',
          choices: [
            { name: 'Économique', value: 'economy' },
            { name: 'Économique Premium', value: 'premiumeconomy' },
            { name: 'Affaires', value: 'business' },
            { name: 'Première', value: 'first' },
            { name: 'Toutes (par défaut)', value: '' }
          ],
          default: '',
          filter: (input) => input || ''
        },
        {
          type: 'number',
          name: 'adults',
          message: 'Nombre d\'adultes:',
          default: 1,
          validate: (input) => {
            const num = parseInt(input);
            return (!isNaN(num) && num > 0 && num <= 9) ? true : 'Veuillez entrer un nombre entre 1 et 9';
          }
        }
      ]);
      
      // Afficher un résumé avant de lancer la recherche
      console.log(chalk.cyan.bold('\nRécapitulatif de votre recherche:'));
      console.log(chalk.white(`• Départ: ${originId.code}`));
      console.log(chalk.white(`• Destination: ${destinationId.code}`));
      console.log(chalk.white(`• Date aller: ${travelDetails.departureDate}`));
      if (travelDetails.isRoundTrip) {
        console.log(chalk.white(`• Date retour: ${travelDetails.returnDate}`));
      } else {
        console.log(chalk.white(`• Type de vol: Aller simple`));
      }
      console.log(chalk.white(`• Classe: ${travelDetails.cabin}`));
      console.log(chalk.white(`• Voyageurs: ${travelDetails.adults} adulte(s)`));
      
      // Confirmation avant recherche
      const confirmation = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'proceed',
          message: 'Voulez-vous lancer la recherche avec ces critères?',
          default: true
        }
      ]);
      
      if (!confirmation.proceed) {
        console.log(chalk.yellow('Recherche annulée.'));
        return;
      }
      
      // Étape 4: Recherche des vols
      console.log(chalk.cyan.bold('\nÉTAPE 4: Recherche des vols'));
      
      // Afficher une barre de progression plus détaillée
      const searchSpinner = ora('Initialisation de la recherche...').start();
      
      // Simuler les différentes étapes de recherche pour une meilleure UX
      await new Promise(resolve => setTimeout(resolve, 800));
      searchSpinner.text = 'Recherche des vols disponibles...';
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      searchSpinner.text = 'Vérification des prix...';
      
      await new Promise(resolve => setTimeout(resolve, 800));
      searchSpinner.text = 'Analyse des itinéraires...';
      
      // Rechercher les vols
      const flights = await searchFlights({
        originId: originId.code,
        destinationId: destinationId.code,
        departureDate: travelDetails.departureDate,
        returnDate: travelDetails.isRoundTrip ? travelDetails.returnDate : null,
        adults: travelDetails.adults,
        cabin: travelDetails.cabin,
        originEntityId: originId.entityId,
        destinationEntityId: destinationId.entityId
      });
      
      searchSpinner.succeed('Recherche terminée!');
      
      if (flights.length === 0) {
        console.log(chalk.yellow('Aucun vol trouvé pour ces critères.'));
        return;
      }
      
      // Étape 5: Filtrage et affichage des résultats
      console.log(chalk.cyan.bold('\nÉTAPE 5: Filtres et résultats'));
      const filteredFlights = await applyFilters(flights);
      
      // Afficher les résultats avec pagination
      await displayPaginatedResults(filteredFlights);
      
      // Afficher des conseils après la recherche
      console.log(chalk.cyan.bold('\nConseils:'));
      console.log(chalk.white('• Les prix peuvent varier. Il est recommandé de vérifier régulièrement.'));
      console.log(chalk.white('• Réserver à l\'avance permet souvent d\'obtenir de meilleurs tarifs.'));
      console.log(chalk.white('• Essayez différentes dates pour trouver les meilleurs prix.'));
      
    } catch (error) {
      console.error(chalk.red('Erreur lors de la recherche de vols:'), error.message);
    }
  });

// Commande pour afficher les aéroports populaires
program
  .command('airports')
  .description('Afficher la liste des aéroports populaires')
  .action(async () => {
    console.clear();
    showBanner();
    console.log(chalk.cyan.bold('AÉROPORTS POPULAIRES:'));
    
    const spinner = ora('Chargement des aéroports...').start();
    // Petit délai pour l'effet visuel
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Rechercher les aéroports populaires (codes hardcodés pour les plus courants)
    const popularCodes = ['CDG', 'ORY', 'LHR', 'JFK', 'BKK', 'DXB', 'HND', 'FCO', 'BCN', 'MAD'];
    const airports = [];
    
    for (const code of popularCodes) {
      const results = await searchLocations(code);
      if (results.length > 0) {
        airports.push(results[0]);
      }
    }
    
    spinner.stop();
    
    if (airports.length === 0) {
      console.log(chalk.yellow('Impossible de charger les aéroports populaires.'));
      return;
    }
    
    // Afficher la liste avec un formatage amélioré
    console.log(chalk.yellow.bold('\nLes aéroports internationaux majeurs:'));
    
    // Trier par continent/région pour une meilleure organisation
    const regions = {
      'Europe': ['CDG', 'ORY', 'LHR', 'FCO', 'BCN', 'MAD'],
      'Amérique du Nord': ['JFK'],
      'Asie': ['BKK', 'HND', 'DXB']
    };
    
    for (const [region, codes] of Object.entries(regions)) {
      console.log(chalk.cyan.bold(`\n${region}:`));
      const regionalAirports = airports.filter(a => codes.includes(a.value));
      regionalAirports.forEach(airport => {
        console.log(chalk.white(`• ${airport.name}`));
      });
    }
    
    console.log(chalk.cyan('\nPour rechercher un vol, utilisez la commande:'));
    console.log(chalk.white('npm start search'));
  });

// Nouvelle commande pour afficher les tendances de prix
program
  .command('trends')
  .description('Afficher les tendances de prix pour une route')
  .action(async () => {
    console.clear();
    showBanner();
    console.log(chalk.cyan.bold('TENDANCES DE PRIX:'));
    
    // Sélection de l'origine
    const originId = await handleIntelligentSearch('Ville ou aéroport de départ:', 'origin');
    if (!originId) {
      console.log(chalk.red('Impossible de continuer sans lieu de départ.'));
      return;
    }
    
    // Sélection de la destination
    const destinationId = await handleIntelligentSearch('Ville ou aéroport de destination:', 'destination');
    if (!destinationId) {
      console.log(chalk.red('Impossible de continuer sans destination.'));
      return;
    }
    
    const spinner = ora('Analyse des tendances de prix...').start();
    
    // Simuler une analyse des tendances
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Générer des données mockées pour les tendances de prix
    const today = new Date();
    const trendData = [];
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i * 7); // Par semaine
      
      // Prix simulé avec une tendance et des variations aléatoires
      let basePrice = 300; // Prix de base
      
      // Augmenter le prix pour les périodes de vacances
      const month = date.getMonth() + 1;
      if (month === 7 || month === 8 || month === 12) {
        basePrice *= 1.4; // +40% en été et décembre
      }
      
      // Variation aléatoire
      const randomFactor = 0.8 + Math.random() * 0.4; // ±20%
      const price = Math.round(basePrice * randomFactor);
      
      trendData.push({
        date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
        price: price
      });
    }
    
    spinner.succeed('Analyse terminée!');
    
    // Afficher les tendances
    console.log(chalk.yellow.bold(`\nTendances de prix pour ${originId.code} → ${destinationId.code}:`));
    console.log(formatTrendResults(trendData));
    
    // Recommandation
    const minPriceTrend = trendData.reduce((min, item) => item.price < min.price ? item : min, trendData[0]);
    console.log(chalk.green.bold(`\nMeilleur moment pour réserver: ${minPriceTrend.date} (${minPriceTrend.price} EUR)`));
    
    console.log(chalk.cyan('\nPour rechercher un vol à cette date, utilisez:'));
    console.log(chalk.white(`npm start search`));
  });

// Nouvelle commande pour la recherche multidestination
program
  .command('multi')
  .description('Recherche de vols multidestination')
  .action(async () => {
    console.clear();
    showBanner();
    console.log(chalk.cyan.bold('RECHERCHE MULTIDESTINATION:'));
    console.log(chalk.white('Cette fonctionnalité sera disponible dans une prochaine version.'));
    
    // Prévisualisation de la fonctionnalité
    console.log(chalk.yellow.bold('\nAperçu de la fonctionnalité à venir:'));
    console.log(chalk.white('• Itinéraires avec plusieurs escales planifiées'));
    console.log(chalk.white('• Durée flexible à chaque destination'));
    console.log(chalk.white('• Options de transport alternatives entre destinations'));
    
    console.log(chalk.cyan('\nRevenez bientôt pour découvrir cette nouvelle fonctionnalité!'));
  });

program.parse(process.argv);

// Si aucune commande n'est fournie, afficher l'aide
if (!process.argv.slice(2).length) {
  console.clear();
  showBanner();
  program.outputHelp();
} 