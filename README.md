# Skyscanner CLI

Command-line interface to search for flights via the Skyscanner API directly from your terminal.

## Features

- 🔍 Intelligent search for airports and cities with autocompletion
- 🌐 Search for international and domestic flights
- 🔄 Advanced filtering of results by price, duration, stops, and airlines
- 🔁 Support for both one-way and round-trip flights
- 📋 Display of results with pagination
- 📊 Detailed visualization of itineraries
- 📱 Generation of direct links to Skyscanner for booking
- 📄 Generation of Markdown reports with clickable links

## Installation

### Prerequisites

- Node.js v14+
- npm or yarn

### Global Installation

```bash
npm install -g skyscanner-cli
```

### Local Installation

```bash
# Clone the repository
git clone https://github.com/your-username/skyscanner-cli.git
cd skyscanner-cli

# Install dependencies
npm install

# Link as a global command (optional)
npm link
```

## Configuration

1. Create an `.env` file at the root of the project (you can use `.env.example` as a template)
2. Fill in the necessary environment variables:

```
# API Configuration
API_KEY=your_api_key_here
API_HOST=skyscanner-api-host.com

# Debug options
DEBUG_API=false
USE_MOCK_DATA=false
USE_REAL_API=true

# Defaults
DEFAULT_MARKET=US
DEFAULT_CURRENCY=USD
DEFAULT_LOCALE=en-US
```

## Usage

### Command Line Usage

```bash
# Launch the interactive application
skyscanner

# Search for flights
skyscanner search
```

### Usage as a Module

```javascript
const { searchFlights } = require("skyscanner-cli/lib/api");

async function findFlights() {
  const flights = await searchFlights({
    originId: "NYC",
    destinationId: "LON",
    departureDate: "2025-05-20",
    adults: "1",
  });

  console.log(`Found ${flights.length} flights!`);
}

findFlights();
```

## Project Structure

```
skyscanner-cli/
├── bin/                  # Executable scripts
│   └── skyscanner-cli.js # Main entry point
├── lib/                  # Libraries and modules
│   ├── api.js            # Skyscanner API
│   ├── formatter.js      # Results formatting
│   └── utils/            # Utilities
│       ├── api-tester.js        # API tests
│       ├── cli-tools.js          # CLI tools
│       └── deeplink-extractor.js # Deeplink management
├── reports/              # Generated MD reports
├── .env                  # Local configuration
├── .env.example          # Configuration example
├── package.json          # Dependencies and scripts
└── README.md             # Documentation
```

## Interactive Search Flow

When using the CLI, you'll go through the following steps:

1. **Enter departure location**: Type a city or airport name and select from the autocomplete results
2. **Enter destination**: Same as above
3. **Choose trip type**: One-way or round-trip
4. **Enter dates**: Departure date (and return date for round trips)
5. **Select passengers**: Number of adult travelers
6. **Select cabin class**: Economy, Premium Economy, Business, or First Class
7. **Confirm your search**: Review details and start the search
8. **Filter results** (optional): By price, number of stops, airlines, etc.
9. **Browse results**: Navigate through pages of flight options
10. **View details**: See comprehensive information about selected flights
11. **Get booking links**: Follow direct links to complete your booking on Skyscanner

## Markdown Report

The application automatically generates a Markdown report for each flight search. This report contains:

- A summary of the search
- Detailed information about each flight
- Clickable links to Skyscanner for booking

Example report:

```markdown
# 🛫 Flight Search Report

_Generated on 04/13/2024 at 4:45:09 PM_

## 📊 Summary

- **Number of flights found**: 3
- **Minimum price**: 31.00 USD
- **Maximum price**: 36.00 USD

## 🎫 Detailed Results

### Flight 1 🏆 BEST PRICE

**Price**: **31.00 USD**

**Total duration**: 1h10

#### 🛫 OUTBOUND - 1h10 (Direct)

_Tue 05/20_

| Airline             | Flight | Departure         | Arrival           | Duration |
| ------------------- | ------ | ----------------- | ----------------- | -------- |
| ✈️ Vueling Airlines | 8942   | 05/20 06:50 (JFK) | 05/20 07:00 (LHR) | 1h10     |

**[🔗 Book this flight](https://www.skyscanner.com/...)**
```

## License

ISC
