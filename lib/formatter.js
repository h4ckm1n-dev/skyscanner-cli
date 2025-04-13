const chalk = require('chalk');
const { createConfigDeeplink } = require('./api');
const fs = require('fs');
const path = require('path');

// Function to format duration in hours and minutes
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins > 0 ? mins.toString().padStart(2, '0') : ''}`;
}

// Function to format date and time
function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month} ${hours}:${minutes}`;
}

// Function to format days of the week
function getDayOfWeek(dateString) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

// Function to generate a Markdown report
function generateMarkdownReport(flights, reportName = 'flight-report') {
  if (flights.length === 0) {
    return null;
  }
  
  const now = new Date();
  const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}`;
  const fileName = `${reportName}_${timestamp}.md`;
  
  let markdown = `# 🛫 Flight Search Report\n\n`;
  markdown += `*Generated on ${now.toLocaleDateString('en-US')} at ${now.toLocaleTimeString('en-US')}*\n\n`;
  
  markdown += `## 📊 Summary\n\n`;
  markdown += `- **Number of flights found**: ${flights.length}\n`;
  markdown += `- **Minimum price**: ${flights[0].price.amount.toFixed(2)} ${flights[0].price.currency}\n`;
  markdown += `- **Maximum price**: ${flights[flights.length-1].price.amount.toFixed(2)} ${flights[flights.length-1].price.currency}\n\n`;
  
  markdown += `## 🎫 Detailed Results\n\n`;
  
  flights.forEach((flight, index) => {
    markdown += `### Flight ${index + 1}${index === 0 ? ' 🏆 BEST PRICE' : ''}\n\n`;
    markdown += `**Price**: **${flight.price.amount.toFixed(2)} ${flight.price.currency}**\n\n`;
    
    const totalDuration = flight.legs.reduce((total, leg) => total + leg.duration, 0);
    markdown += `**Total duration**: ${formatDuration(totalDuration)}\n\n`;
    
    flight.legs.forEach((leg, legIndex) => {
      const isOutbound = legIndex === 0;
      const legType = isOutbound ? '🛫 OUTBOUND' : '🛬 RETURN';
      const stops = leg.stops === 0 ? 'Direct' : `${leg.stops} stop${leg.stops !== 1 ? 's' : ''}`;
      
      // Trip information (outbound or return)
      markdown += `#### ${legType} - ${formatDuration(leg.duration)} (${stops})\n\n`;
      
      const departureDate = new Date(leg.segments[0].departure.time);
      const departureDay = getDayOfWeek(departureDate);
      const formattedDate = `${departureDate.getDate().toString().padStart(2, '0')}/${(departureDate.getMonth() + 1).toString().padStart(2, '0')}`;
      markdown += `*${departureDay} ${formattedDate}*\n\n`;
      
      markdown += `| Airline | Flight | Departure | Arrival | Duration |\n`;
      markdown += `|-----------|-----|--------|---------|-------|\n`;
      
      leg.segments.forEach((segment, segmentIndex) => {
        const departure = segment.departure;
        const arrival = segment.arrival;
        
        // Airline logos (emojis)
        let airlineEmoji = '✈️';
        switch(segment.carrier) {
          case 'Air France': airlineEmoji = '🇫🇷'; break;
          case 'British Airways': airlineEmoji = '🇬🇧'; break;
          case 'Lufthansa': airlineEmoji = '🇩🇪'; break;
          case 'KLM': airlineEmoji = '🇳🇱'; break;
          case 'Ryanair': 
          case 'EasyJet': airlineEmoji = '💰'; break;
        }
        
        markdown += `| ${airlineEmoji} ${segment.carrier} | ${segment.flightNumber} | ${formatDateTime(departure.time)} (${departure.code}) | ${formatDateTime(arrival.time)} (${arrival.code}) | ${formatDuration(segment.duration)} |\n`;
        
        // Add layover line if not the last segment
        if (segmentIndex < leg.segments.length - 1) {
          const layoverDeparture = new Date(segment.arrival.time);
          const layoverArrival = new Date(leg.segments[segmentIndex + 1].departure.time);
          const layoverDuration = Math.round((layoverArrival - layoverDeparture) / 60000); // In minutes
          
          markdown += `| | | **Layover at ${arrival.airport} (${arrival.code})** | **Duration: ${formatDuration(layoverDuration)}** | |\n`;
        }
      });
      
      markdown += '\n';
    });
    
    // Booking link
    const isThaiRoute = flight.legs[0]?.segments[0]?.departure?.code === 'BKK' || 
                        flight.legs[0]?.segments[0]?.departure?.code === 'DMK' ||
                        flight.legs[0]?.segments[0]?.departure?.code?.includes('BKK');
                        
    const isParisRoute = flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code === 'CDG' || 
                         flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code === 'ORY' ||
                         flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code?.includes('PAR');
    
    // Extract date in YYMMDD format for the deeplink
    let dateStr = '';
    if (flight.legs[0] && flight.legs[0].segments[0] && flight.legs[0].segments[0].departure.time) {
      const depTime = new Date(flight.legs[0].segments[0].departure.time);
      if (!isNaN(depTime.getTime())) {
        const year = depTime.getFullYear().toString().slice(2); // YY
        const month = (depTime.getMonth() + 1).toString().padStart(2, '0'); // MM
        const day = depTime.getDate().toString().padStart(2, '0'); // DD
        dateStr = `${year}${month}${day}`;
      }
    }
    
    // Generate an appropriate deeplink
    let bookingUrl = flight.deepLink || '';
    
    // Create a config deeplink for all flights
    if (dateStr) {
      const searchConfig = {
        originId: flight.legs[0].segments[0].departure.code,
        destinationId: flight.legs[0].segments[flight.legs[0].segments.length - 1].arrival.code,
        departureDate: dateStr,
        adults: '1'
      };
      
      // Use the default config format (fr domain)
      bookingUrl = createConfigDeeplink(flight, searchConfig);
      
      // For Bangkok-Paris routes, use the Thai domain
      if (isThaiRoute && isParisRoute) {
        bookingUrl = createConfigDeeplink(flight, searchConfig, 'th');
      }
    }
    
    if (bookingUrl) {
      markdown += `**[🔗 Book this flight](${bookingUrl})**\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  // Add footer
  markdown += `\n\n*Report generated via Skyscanner CLI*`;
  
  try {
    if (!fs.existsSync('reports')) {
      fs.mkdirSync('reports');
    }
    
    const filePath = path.join('reports', fileName);
    fs.writeFileSync(filePath, markdown);
    
    return { filePath, markdown };
  } catch (error) {
    console.error('Error generating Markdown report:', error);
    return null;
  }
}

// Function to format flight results
function formatFlightResults(flights, showSummary = true, detailedView = false) {
  if (flights.length === 0) {
    return chalk.yellow('No flights found.');
  }

  // Generate a Markdown report
  const markdownReport = generateMarkdownReport(flights);
  if (markdownReport) {
    console.log(chalk.green(`\nMarkdown report generated: ${markdownReport.filePath}`));
  }

  let output = '';

  flights.forEach((flight, index) => {
    // Flight header with index and price
    output += chalk.bold(`\n${index + 1}. Price: ${chalk.green(flight.price.amount.toFixed(2))} ${flight.price.currency}`);
    
    // "Best price" badge for the first flight if showing multiple flights
    if (index === 0 && flights.length > 1) {
      output += chalk.bgGreen.black(' BEST PRICE ');
    }
    
    output += '\n';
    
    // Calculate total duration for flights with layovers
    const totalDuration = flight.legs.reduce((total, leg) => total + leg.duration, 0);
    if (flights.length > 1) {
      output += chalk.gray(`Total duration: ${formatDuration(totalDuration)}\n`);
    }
    
    // Details for each leg (outbound/return)
    flight.legs.forEach((leg, legIndex) => {
      const isOutbound = legIndex === 0;
      const legType = isOutbound ? 'OUTBOUND' : 'RETURN';
      const stops = leg.stops === 0 ? 'Direct' : `${leg.stops} stop${leg.stops !== 1 ? 's' : ''}`;
      
      output += chalk.bold(`\n${legType} - ${formatDuration(leg.duration)} (${stops}) - `);
      
      // Show date with day of week
      const departureDate = new Date(leg.segments[0].departure.time);
      const departureDay = getDayOfWeek(departureDate);
      const formattedDate = `${departureDate.getDate().toString().padStart(2, '0')}/${(departureDate.getMonth() + 1).toString().padStart(2, '0')}`;
      output += chalk.bold(`${departureDay} ${formattedDate}`);
      
      // Separator line
      output += '\n' + chalk.gray('─'.repeat(45)) + '\n';
      
      // Process each segment (flight)
      leg.segments.forEach((segment, segmentIndex) => {
        const departure = segment.departure;
        const arrival = segment.arrival;
        
        // Airline logos/flags based on carrier
        let airlineEmoji = '✈️';
        switch(segment.carrier) {
          case 'Air France': airlineEmoji = '🇫🇷'; break;
          case 'British Airways': airlineEmoji = '🇬🇧'; break;
          case 'Lufthansa': airlineEmoji = '🇩🇪'; break;
          case 'KLM': airlineEmoji = '🇳🇱'; break;
          case 'Ryanair': 
          case 'EasyJet': airlineEmoji = '💰'; break;
        }
        
        // Departure and arrival information with times and airport codes
        output += `${airlineEmoji} ${segment.carrier} ${segment.flightNumber}\n`;
        
        const departureTime = new Date(departure.time);
        const arrivalTime = new Date(arrival.time);
        
        output += `${departureTime.getDate().toString().padStart(2, '0')}/${(departureTime.getMonth() + 1).toString().padStart(2, '0')} `;
        output += `${departureTime.getHours().toString().padStart(2, '0')}:${departureTime.getMinutes().toString().padStart(2, '0')} `;
        output += `${departure.code} `;
        output += chalk.gray(`${'─'.repeat(20)}✈️→ `);
        output += `${arrivalTime.getDate().toString().padStart(2, '0')}/${(arrivalTime.getMonth() + 1).toString().padStart(2, '0')} `;
        output += `${arrivalTime.getHours().toString().padStart(2, '0')}:${arrivalTime.getMinutes().toString().padStart(2, '0')} `;
        output += `${arrival.code} `;
        output += chalk.gray(`(${formatDuration(segment.duration)})`);
        output += '\n';
        
        // Additional details for detailed view
        if (detailedView) {
          output += chalk.gray(`  Departure: ${departure.airport}\n`);
          output += chalk.gray(`  Arrival: ${arrival.airport}\n`);
          
          // Simulate information about onboard services
          const services = ['Meals included', 'Wi-Fi available', 'In-flight entertainment', 'Power outlets'];
          const randomServices = services.filter(() => Math.random() > 0.5);
          if (randomServices.length > 0) {
            output += chalk.gray(`  Services: ${randomServices.join(', ')}\n`);
          }
        }
        
        // Add a layover line if not the last segment
        if (segmentIndex < leg.segments.length - 1) {
          const layoverDeparture = new Date(segment.arrival.time);
          const layoverArrival = new Date(leg.segments[segmentIndex + 1].departure.time);
          const layoverDuration = Math.round((layoverArrival - layoverDeparture) / 60000); // In minutes
          
          output += chalk.yellow(`\n   ↓ Layover at ${arrival.airport} (${arrival.code}) - ${formatDuration(layoverDuration)} ↓\n\n`);
        }
      });
      
      // Add a separator if it's a round-trip
      if (legIndex === 0 && flight.legs.length > 1) {
        output += chalk.gray('\n   ----------------- RETURN -----------------\n');
      }
    });
    
    // Booking link
    const isThaiRoute = flight.legs[0]?.segments[0]?.departure?.code === 'BKK' || 
                        flight.legs[0]?.segments[0]?.departure?.code === 'DMK' ||
                        flight.legs[0]?.segments[0]?.departure?.code?.includes('BKK');
                        
    const isParisRoute = flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code === 'CDG' || 
                         flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code === 'ORY' ||
                         flight.legs[0]?.segments[flight.legs[0].segments.length - 1]?.arrival?.code?.includes('PAR');
    
    // Extract date in YYMMDD format for the deeplink
    let dateStr = '';
    if (flight.legs[0] && flight.legs[0].segments[0] && flight.legs[0].segments[0].departure.time) {
      const depTime = new Date(flight.legs[0].segments[0].departure.time);
      if (!isNaN(depTime.getTime())) {
        const year = depTime.getFullYear().toString().slice(2); // YY
        const month = (depTime.getMonth() + 1).toString().padStart(2, '0'); // MM
        const day = depTime.getDate().toString().padStart(2, '0'); // DD
        dateStr = `${year}${month}${day}`;
      }
    }
    
    // Generate an appropriate deeplink
    let bookingUrl = flight.deepLink || '';
    
    // Create a config deeplink for all flights
    if (dateStr) {
      const searchConfig = {
        originId: flight.legs[0].segments[0].departure.code,
        destinationId: flight.legs[0].segments[flight.legs[0].segments.length - 1].arrival.code,
        departureDate: dateStr,
        adults: '1'
      };
      
      // Use default config format (fr domain)
      bookingUrl = createConfigDeeplink(flight, searchConfig);
      
      // For Bangkok-Paris routes, use Thai domain
      if (isThaiRoute && isParisRoute) {
        bookingUrl = createConfigDeeplink(flight, searchConfig, 'th');
      }
    }
    
    if (bookingUrl) {
      output += chalk.blue(`\nBook: ${bookingUrl}\n`);
    }
    
    // Separator between flights
    if (index < flights.length - 1) {
      output += chalk.gray('\n══════════════════════════════════════════════════════════\n');
    }
  });

  // Add a summary
  if (showSummary) {
    output += chalk.bold(`\n\n${flights.length} flight itinerary(s) found. Prices from ${chalk.green(flights[0].price.amount.toFixed(2))} ${flights[0].price.currency}\n`);
    
    if (markdownReport) {
      output += chalk.blue(`\nDetailed report available: ${markdownReport.filePath}\n`);
    }
  }

  return output;
}

// Function to format price trends
function formatTrendResults(trends) {
  if (!trends || trends.length === 0) {
    return chalk.yellow('No trend data available.');
  }
  
  let output = '\n';
  
  // Find min and max values for scale
  const minPrice = Math.min(...trends.map(t => t.price));
  const maxPrice = Math.max(...trends.map(t => t.price));
  const range = maxPrice - minPrice;
  
  // Graph width
  const graphWidth = 40;
  
  // Y scale
  output += chalk.gray(`    ${maxPrice} € ┐\n`);
  
  // For each trend
  trends.forEach(trend => {
    // Calculate bar height
    const barHeight = range === 0 ? graphWidth : Math.round((trend.price - minPrice) / range * graphWidth);
    const padding = graphWidth - barHeight;
    
    // Format date
    const date = new Date(trend.date);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const day = getDayOfWeek(date);
    
    // Color the bar according to price (green=good, yellow=medium, red=expensive)
    let barColor;
    if (trend.price === minPrice) {
      barColor = chalk.green;
    } else if (trend.price >= minPrice + range * 0.7) {
      barColor = chalk.red;
    } else {
      barColor = chalk.yellow;
    }
    
    // Display the line
    output += `${formattedDate} │ `;
    output += ' '.repeat(padding);
    output += barColor('█'.repeat(barHeight));
    output += ` ${trend.price} € (${day})\n`;
  });
  
  // Base line
  output += chalk.gray(`    ${minPrice} € ┘\n`);
  
  return output;
}

module.exports = {
  formatFlightResults,
  formatTrendResults,
  generateMarkdownReport
}; 