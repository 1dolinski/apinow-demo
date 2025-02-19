# APINoW SDK Examples

This repository contains examples demonstrating how to use the [APINoW SDK](https://github.com/apinow-io/apinow-sdk) to interact with the APINoW marketplace.

## Examples

- `getEndpointInfo.js` - Shows how to fetch metadata about an API endpoint
- `payForEndpoint.js` - Demonstrates purchasing access to an endpoint
- `searchEndpoints.js` - Example of searching available endpoints and analyzing results

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set environment variables:
   ```bash
   cp .env.example .env
   ```

3. Add your API keys and private keys to the `.env` file.

## Running Examples

1. Run the Endpoint Info example:
   ```bash
   node examples/getEndpointInfo.js
   ```

2. Run the Pay For Endpoint example:
   ```bash
   node examples/payForEndpoint.js
   ```

3. Run the Search Endpoints example:
   ```bash
   node examples/searchEndpoints.js 
   ```

## Contributing

We welcome contributions! Please open an issue or submit a PR.
