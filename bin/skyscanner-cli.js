#!/usr/bin/env node

require('dotenv').config();
const { program } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');

// Import modules
const { searchFlights, searchLocations } = require('../lib/api');
const { formatFlightResults } = require('../lib/formatter');
const { parseDate, formatDateForApi, isFutureDate } = require('../lib/utils/cli-tools');

// App configuration
program
  .version('1.0.0')
  .description('Command line interface to search flights via Skyscanner API');

// Function to display logo and stylized banner
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
  console.log(chalk.yellow('✈️  Find the best flights at the best prices right from your terminal ✈️\n'));
}

// Main function
async function main() {
  showBanner();
  
  try {
    // Start with a welcome message
    console.log(chalk.cyan('👋 Welcome to Skyscanner CLI! Let\'s find you a flight.\n'));
    
    // Search for departure location
    const origin = await handleIntelligentSearch('Enter a departure location (city or airport):', 'origin');
    if (!origin) {
      console.log(chalk.red('❌ Search cancelled.'));
      return;
    }
    
    // Search for destination
    const destination = await handleIntelligentSearch('Enter a destination (city or airport):', 'destination');
    if (!destination) {
      console.log(chalk.red('❌ Search cancelled.'));
      return;
    }
    
    // Ask for the trip type
    const tripTypeInput = await inquirer.prompt([
      {
        type: 'list',
        name: 'tripType',
        message: '🔄 Trip type:',
        choices: [
          { name: 'One-way flight', value: 'one-way' },
          { name: 'Round-trip', value: 'round-trip' }
        ],
        default: 'one-way'
      }
    ]);
    
    // Ask for the departure date
    const dateInput = await inquirer.prompt([
      {
        type: 'input',
        name: 'departureDate',
        message: 'Departure date (DD/MM/YYYY or DD-MM-YYYY):',
        validate: input => {
          const date = parseDate(input);
          if (!date) return '❌ Invalid date format. Use DD/MM/YYYY or DD-MM-YYYY.';
          if (!isFutureDate(date)) return '❌ Date must be in the future.';
          return true;
        }
      }
    ]);
    
    // Convert date to YYYY-MM-DD format
    const departureDate = formatDateForApi(parseDate(dateInput.departureDate));
    
    // Ask for return date if round-trip
    let returnDate = null;
    if (tripTypeInput.tripType === 'round-trip') {
      const returnDateInput = await inquirer.prompt([
        {
          type: 'input',
          name: 'returnDate',
          message: 'Return date (DD/MM/YYYY or DD-MM-YYYY):',
          validate: input => {
            const date = parseDate(input);
            if (!date) return '❌ Invalid date format. Use DD/MM/YYYY or DD-MM-YYYY.';
            if (!isFutureDate(date)) return '❌ Date must be in the future.';
            
            // Check if return date is after departure date
            const depDate = parseDate(dateInput.departureDate);
            if (date < depDate) return '❌ Return date must be after departure date.';
            
            return true;
          }
        }
      ]);
      
      returnDate = formatDateForApi(parseDate(returnDateInput.returnDate));
    }
    
    // Ask for number of passengers
    const passengersInput = await inquirer.prompt([
      {
        type: 'number',
        name: 'adults',
        message: 'Number of adults:',
        default: 1,
        validate: input => input > 0 && input <= 8 ? true : '❌ Number of adults must be between 1 and 8.'
      }
    ]);
    
    // Ask for cabin class
    const cabinInput = await inquirer.prompt([
      {
        type: 'list',
        name: 'cabin',
        message: 'Travel class:',
        choices: [
          { name: 'Economy', value: 'economy' },
          { name: 'Premium Economy', value: 'premiumeconomy' },
          { name: 'Business', value: 'business' },
          { name: 'First Class', value: 'first' }
        ],
        default: 'economy'
      }
    ]);
    
    // Display search summary
    console.log(chalk.cyan('\n📋 Flight Search Summary:'));
    console.log(chalk.cyan(`🛫 From: ${origin.name} (${origin.code}) → 🛬 To: ${destination.name} (${destination.code})`));
    console.log(chalk.cyan(`🔄 Trip type: ${tripTypeInput.tripType === 'one-way' ? 'One-way flight' : 'Round-trip'}`));
    console.log(chalk.cyan(`📅 Departure: ${dateInput.departureDate}${returnDate ? `, Return: ${returnDateInput.returnDate}` : ''}`));
    console.log(chalk.cyan(`👥 ${passengersInput.adults} adult(s), 💺 Class: ${cabinInput.cabin}`));
    
    // Confirm search
    const confirmSearch = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: '🔍 Start search?',
        default: true
      }
    ]);
    
    if (!confirmSearch.confirm) {
      console.log(chalk.yellow('🛑 Search cancelled.'));
      return;
    }
    
    // Configure search parameters
    const searchParams = {
      originId: origin.code,
      destinationId: destination.code,
      originEntityId: origin.entityId,
      destinationEntityId: destination.entityId,
      departureDate: departureDate,
      returnDate: returnDate,
      adults: passengersInput.adults.toString(),
      cabin: cabinInput.cabin
    };
    
    // Display a spinner during search
    const spinner = ora('🔎 Searching for flights...').start();
    
    try {
      // Perform the search
      const flights = await searchFlights(searchParams);
      
      spinner.succeed(`✅ ${flights.length} flights found!`);
      
      if (flights.length === 0) {
        console.log(chalk.yellow('\n😔 No flights match your search criteria.'));
        return;
      }
      
      // Apply filters if desired
      const filteredFlights = await applyFilters(flights);
      
      // Display results
      await displayPaginatedResults(filteredFlights);
      
    } catch (error) {
      spinner.fail('❌ Error during search');
      console.error(chalk.red('Error:'), error.message);
    }
    
  } catch (error) {
    console.error(chalk.red('❌ An error occurred:'), error.message);
  }
}

// Function to handle intelligent search
async function handleIntelligentSearch(prompt, type) {
  try {
    let input = await inquirer.prompt([
      {
        type: 'input',
        name: 'query',
        message: prompt,
        validate: input => input.length >= 2 ? true : '❌ Please enter at least 2 characters'
      }
    ]);

    const spinner = ora(`🔍 Searching for ${type === 'origin' ? 'departure locations' : 'destinations'}...`).start();
    const options = await searchLocations(input.query);
    spinner.stop();

    if (options.length === 0) {
      console.log(chalk.yellow(`❌ No results found for "${input.query}".`));
      
      // Suggest alternatives
      console.log(chalk.blue('💡 Suggestions:'));
      console.log(chalk.blue('- Check your spelling'));
      console.log(chalk.blue('- Try with the city name instead of the airport'));
      console.log(chalk.blue('- Try with an IATA code (e.g. LHR for London Heathrow)\n'));
      
      return await handleIntelligentSearch(prompt, type);
    }

    // Modify options to store ID information
    const optionsWithMetadata = options.map(option => ({
      name: option.name,
      value: {
        code: option.value,
        entityId: option.entityId,
        skyId: option.skyId,
        name: option.name
      },
      short: option.value
    }));

    // Display results and ask user to choose
    const selection = await inquirer.prompt([
      {
        type: 'list',
        name: 'selected',
        message: `Select a ${type === 'origin' ? 'departure location' : 'destination'}:`,
        choices: optionsWithMetadata,
        pageSize: 10
      }
    ]);

    return selection.selected;
  } catch (error) {
    console.error(chalk.red(`❌ Error searching for ${type === 'origin' ? 'departure locations' : 'destinations'}:`), error.message);
    return null;
  }
}

// Function to apply filters to flight results
async function applyFilters(flights) {
  if (flights.length === 0) return [];
  
  const useFilters = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'apply',
      message: '🔍 Would you like to filter these results?',
      default: false
    }
  ]);
  
  if (!useFilters.apply) return flights;
  
  // Collect information about price range and available airlines
  const priceRange = {
    min: Math.min(...flights.map(f => f.price.amount)),
    max: Math.max(...flights.map(f => f.price.amount))
  };
  
  // Extract unique airlines
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
  
  // Calculate max stops
  const maxStopsAvailable = Math.max(...flights.map(f => 
    Math.max(...f.legs.map(leg => leg.stops))
  ));
  
  // Ask for filters
  const filters = await inquirer.prompt([
    {
      type: 'number',
      name: 'maxPrice',
      message: '💰 Maximum price (EUR):',
      default: Math.ceil(priceRange.max),
      validate: val => val >= priceRange.min ? true : `❌ The minimum available price is ${priceRange.min}`
    },
    {
      type: 'list',
      name: 'maxStops',
      message: '✈️ Maximum number of stops:',
      choices: [
        { name: 'All flights', value: 999 },
        { name: 'Direct flights only', value: 0 },
        { name: 'Maximum 1 stop', value: 1 },
        { name: 'Maximum 2 stops', value: 2 }
      ].filter(choice => choice.value === 999 || choice.value <= maxStopsAvailable),
      default: 999
    },
    {
      type: 'checkbox',
      name: 'airlines',
      message: '🏢 Airlines (leave empty for all):',
      choices: airlineChoices,
      pageSize: 10
    },
    {
      type: 'list',
      name: 'sortBy',
      message: '📊 Sort by:',
      choices: [
        { name: 'Price (lowest first)', value: 'price_asc' },
        { name: 'Price (highest first)', value: 'price_desc' },
        { name: 'Duration (shortest first)', value: 'duration_asc' },
        { name: 'Departure (earliest first)', value: 'departure_asc' },
        { name: 'Departure (latest first)', value: 'departure_desc' }
      ],
      default: 'price_asc'
    }
  ]);
  
  // Apply filters
  let filteredFlights = flights.filter(flight => {
    // Filter by price
    if (flight.price.amount > filters.maxPrice) return false;
    
    // Filter by number of stops
    const hasExcessStops = flight.legs.some(leg => leg.stops > filters.maxStops);
    if (hasExcessStops) return false;
    
    // Filter by airlines
    if (filters.airlines.length > 0) {
      // Check if at least one carrier of a leg matches those selected
      const hasSelectedAirline = flight.legs.some(leg =>
        leg.segments.some(segment => filters.airlines.includes(segment.carrier))
      );
      if (!hasSelectedAirline) return false;
    }
    
    return true;
  });
  
  // Apply sorting
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
  
  console.log(chalk.green(`\n✅ Found ${filteredFlights.length} flights matching your filters.`));
  
  return filteredFlights;
}

// Function to display paginated results
async function displayPaginatedResults(flights) {
  if (flights.length === 0) {
    console.log(chalk.yellow('😔 No flights match your criteria.'));
    return;
  }
  
  const PAGE_SIZE = 3; // Number of flights per page
  let currentPage = 0;
  const totalPages = Math.ceil(flights.length / PAGE_SIZE);
  
  let viewing = true;
  
  while (viewing) {
    // Clear console for better readability
    console.clear();
    showBanner();
    
    console.log(chalk.cyan.bold(`\n🔍 SEARCH RESULTS (Page ${currentPage + 1}/${totalPages})`));
    
    // Display flights on current page
    const startIdx = currentPage * PAGE_SIZE;
    const endIdx = Math.min(startIdx + PAGE_SIZE, flights.length);
    const pageFlights = flights.slice(startIdx, endIdx);
    
    // Format and display flights
    console.log(formatFlightResults(pageFlights, false));
    
    // Navigation options
    console.log(chalk.cyan.bold('\n📋 NAVIGATION:'));
    
    const navigationOptions = [];
    
    if (currentPage > 0) {
      navigationOptions.push({
        name: '⬅️ Previous page',
        value: 'prev'
      });
    }
    
    if (currentPage < totalPages - 1) {
      navigationOptions.push({
        name: '➡️ Next page',
        value: 'next'
      });
    }
    
    // Add options to view details or quit
    navigationOptions.push({
      name: '🔎 View flight details',
      value: 'details'
    });
    
    navigationOptions.push({
      name: '🚪 Exit',
      value: 'quit'
    });
    
    const navigation = await inquirer.prompt([
      {
        type: 'list',
        name: 'action',
        message: 'What would you like to do?',
        choices: navigationOptions
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
        // Ask which flight to display in detail
        const detailChoice = await inquirer.prompt([
          {
            type: 'list',
            name: 'flightIndex',
            message: 'Which flight would you like to see in detail?',
            choices: pageFlights.map((flight, idx) => ({
              name: `Flight ${startIdx + idx + 1} - ${flight.price.amount} ${flight.price.currency}`,
              value: startIdx + idx
            }))
          }
        ]);
        
        // Display the flight in detail
        console.clear();
        showBanner();
        console.log(chalk.cyan.bold(`\n✈️ FLIGHT DETAILS #${detailChoice.flightIndex + 1}`));
        console.log(formatFlightResults([flights[detailChoice.flightIndex]], true, true));
        
        // Wait for user to press Enter to continue
        await inquirer.prompt([
          {
            type: 'input',
            name: 'continue',
            message: 'Press Enter to return to results...'
          }
        ]);
        break;
      case 'quit':
        viewing = false;
        break;
    }
  }
  
  console.log(chalk.green('\n✅ Search completed. Thank you for using Skyscanner CLI!'));
}

// Main command for flight search
program
  .command('search')
  .description('Search for flights')
  .action(main);

// Default command
if (process.argv.length === 2) {
  main();
} else {
  program.parse(process.argv);
}