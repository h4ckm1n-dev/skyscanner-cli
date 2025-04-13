const chalk = require('chalk');

// Fonction pour formater la durée en heures et minutes
function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

// Fonction pour formater la date et l'heure
function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  return `${day}/${month} ${hours}:${minutes}`;
}

// Fonction pour formater les jours de la semaine
function getDayOfWeek(dateString) {
  const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const date = new Date(dateString);
  return days[date.getDay()];
}

// Fonction pour formater les résultats de vol
function formatFlightResults(flights, showSummary = true, detailedView = false) {
  if (flights.length === 0) {
    return chalk.yellow('Aucun vol trouvé.');
  }

  let output = '';

  flights.forEach((flight, index) => {
    // En-tête du vol avec index et prix
    output += chalk.bold(`\n${index + 1}. Prix: ${chalk.green(flight.price.amount.toFixed(2))} ${flight.price.currency}`);
    
    // Badge "Meilleur prix" pour le premier vol si on affiche plusieurs vols
    if (index === 0 && flights.length > 1) {
      output += chalk.bgGreen.black(' MEILLEUR PRIX ');
    }
    
    output += '\n';
    
    // Calcul de la durée totale pour les vols avec escales
    const totalDuration = flight.legs.reduce((total, leg) => total + leg.duration, 0);
    if (flights.length > 1) {
      output += chalk.gray(`Durée totale: ${formatDuration(totalDuration)}\n`);
    }
    
    flight.legs.forEach((leg, legIndex) => {
      const isOutbound = legIndex === 0;
      const legType = isOutbound ? 'ALLER' : 'RETOUR';
      const stops = leg.stops === 0 ? 'Direct' : `${leg.stops} escale${leg.stops !== 1 ? 's' : ''}`;
      
      // Informations du trajet (aller ou retour)
      output += chalk.cyan.bold(`\n${legType} - ${formatDuration(leg.duration)} (${stops})`);
      
      // Ajouter la date au format jour de semaine pour plus de clarté
      const departureDate = new Date(leg.segments[0].departure.time);
      const departureDay = getDayOfWeek(departureDate);
      const formattedDate = `${departureDate.getDate().toString().padStart(2, '0')}/${(departureDate.getMonth() + 1).toString().padStart(2, '0')}`;
      output += chalk.gray(` - ${departureDay} ${formattedDate}`);
      
      output += '\n';
      output += chalk.gray('─────────────────────────────────────\n');
      
      // Détail des segments
      leg.segments.forEach((segment, segmentIndex) => {
        const departure = segment.departure;
        const arrival = segment.arrival;
        
        // Logos des compagnies aériennes (simulés avec des émojis)
        let airlineEmoji = '✈️ ';
        switch(segment.carrier) {
          case 'Air France': airlineEmoji = '🇫🇷 '; break;
          case 'British Airways': airlineEmoji = '🇬🇧 '; break;
          case 'Lufthansa': airlineEmoji = '🇩🇪 '; break;
          case 'KLM': airlineEmoji = '🇳🇱 '; break;
          case 'Ryanair': 
          case 'EasyJet': airlineEmoji = '💰 '; break; // Pour les low-cost
        }
        
        output += `${airlineEmoji}${chalk.bold(segment.carrier)} ${segment.flightNumber}\n`;
        
        // Horaires de départ et d'arrivée
        output += `${formatDateTime(departure.time)} ${chalk.yellow(departure.code)} `;
        
        // Représentation graphique de la durée du vol
        const durationBar = '─'.repeat(Math.min(20, Math.max(5, Math.floor(segment.duration / 30))));
        output += chalk.gray(`${durationBar}✈️→ `);
        
        output += `${formatDateTime(arrival.time)} ${chalk.yellow(arrival.code)}`;
        output += ` (${formatDuration(segment.duration)})\n`;
        
        // Mode détaillé : plus d'informations
        if (detailedView) {
          output += chalk.gray(`  Départ: ${departure.airport}\n`);
          output += chalk.gray(`  Arrivée: ${arrival.airport}\n`);
          
          // Simuler des informations sur les services à bord
          const services = ['Repas inclus', 'Wi-Fi disponible', 'Divertissement à bord', 'Prises électriques'];
          const randomServices = services.filter(() => Math.random() > 0.5);
          if (randomServices.length > 0) {
            output += chalk.gray(`  Services: ${randomServices.join(', ')}\n`);
          }
        }
        
        // Ajouter une ligne d'escale si ce n'est pas le dernier segment
        if (segmentIndex < leg.segments.length - 1) {
          const escaleDepart = new Date(segment.arrival.time);
          const escaleArrivee = new Date(leg.segments[segmentIndex + 1].departure.time);
          const dureeEscale = Math.round((escaleArrivee - escaleDepart) / 60000); // En minutes
          
          output += chalk.yellow(`\n   ↓ Escale à ${arrival.airport} (${arrival.code}) - ${formatDuration(dureeEscale)} ↓\n\n`);
        }
      });
      
      // Ajouter un séparateur si c'est un aller-retour
      if (legIndex === 0 && flight.legs.length > 1) {
        output += chalk.gray('\n   ----------------- RETOUR -----------------\n');
      }
    });
    
    // Lien de réservation
    const bookingUrl = flight.deepLink || '';
    if (bookingUrl) {
      output += chalk.blue(`\nRéserver: ${bookingUrl}\n`);
    }
    
    // Séparateur entre les vols
    if (index < flights.length - 1) {
      output += chalk.gray('\n══════════════════════════════════════════════════════════\n');
    }
  });

  // Ajouter un résumé
  if (showSummary) {
    output += chalk.bold(`\n\n${flights.length} itinéraire(s) trouvé(s). Prix à partir de ${chalk.green(flights[0].price.amount.toFixed(2))} ${flights[0].price.currency}\n`);
  }

  return output;
}

// Fonction pour formater les tendances de prix
function formatTrendResults(trends) {
  if (!trends || trends.length === 0) {
    return chalk.yellow('Aucune donnée de tendance disponible.');
  }
  
  let output = '\n';
  
  // Trouver les valeurs min et max pour l'échelle
  const minPrice = Math.min(...trends.map(t => t.price));
  const maxPrice = Math.max(...trends.map(t => t.price));
  const range = maxPrice - minPrice;
  
  // Largeur du graphique
  const graphWidth = 40;
  
  // Échelle Y
  output += chalk.gray(`    ${maxPrice} € ┐\n`);
  
  // Pour chaque tendance
  trends.forEach(trend => {
    // Calculer la hauteur de la barre
    const barHeight = range === 0 ? graphWidth : Math.round((trend.price - minPrice) / range * graphWidth);
    const padding = graphWidth - barHeight;
    
    // Formater la date
    const date = new Date(trend.date);
    const formattedDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    const day = getDayOfWeek(date);
    
    // Colorier la barre selon le prix (vert=bon, jaune=moyen, rouge=cher)
    let barColor;
    if (trend.price === minPrice) {
      barColor = chalk.green;
    } else if (trend.price >= minPrice + range * 0.7) {
      barColor = chalk.red;
    } else {
      barColor = chalk.yellow;
    }
    
    // Afficher la ligne
    output += `${formattedDate} │ `;
    output += ' '.repeat(padding);
    output += barColor('█'.repeat(barHeight));
    output += ` ${trend.price} € (${day})\n`;
  });
  
  // Ligne de base
  output += chalk.gray(`    ${minPrice} € ┘\n`);
  
  return output;
}

module.exports = {
  formatFlightResults,
  formatTrendResults
}; 