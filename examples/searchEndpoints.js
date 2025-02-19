import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import apiNow from 'apinow-sdk';

dotenv.config();

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });  

const SEARCH_ENDPOINT = 'https://apinow.fun/api/endpoints/apinowfun/endpoint-search';

const DEVELOPER_QUERY = "Find endpoints for placeholder posts, ycombinator and apinow-sdk-example endoints" 
const MAX_COST_USD = 0.30; // Maximum cost in USD

const tools = [{
  type: 'function',
  function: {
    name: 'generate_search_terms',
    description: 'Generate search terms for finding API endpoints',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Original search query'
        }
      },
      required: ['query']
    }
  }
}, {
  type: 'function',
  function: {
    name: 'search_endpoints',
    description: 'Search for API endpoints using terms',
    parameters: {
      type: 'object',
      properties: {
        terms: {
          type: 'array',
          items: { type: 'string' },
          description: 'Search terms to use'
        }
      },
      required: ['terms']
    }
  }
}];

// Convert crypto to USD based on chain
const CRYPTO_USD_PRICES = {
  base: 3000, // Base uses ETH pricing
  eth: 3000,
  sol: 100
};

function cryptoToUsd(amount, chain) {
  const price = CRYPTO_USD_PRICES[chain] || CRYPTO_USD_PRICES.eth; // Default to ETH price
  return parseFloat(amount) * price;
}

async function generateSearchTerms(query) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { 
        role: 'system', 
        content: 'You are a technical API search expert. Generate exactly 3 specific search terms and return them as a JSON object with a "terms" array. For example: {"terms": ["term1", "term2", "term3"]}'
      },
      { 
        role: 'user', 
        content: query 
      }
    ],
    response_format: { type: "json_object" }
  });

  const terms = JSON.parse(response.choices[0].message.content).terms.slice(0, 3); // Ensure max 3 terms
  console.log('🔍 Generated terms:', terms);
  return terms;
}

async function searchEndpoints(terms) {
  const allEndpoints = new Set();
  const failedEndpoints = [];

  // Search and deduplicate
  for (const term of terms) {
    try {
      const response = await apiNow.infoBuyResponse(SEARCH_ENDPOINT, process.env.ETH_PRIVATE_KEY, process.env.ETH_RPC_URL, {
        data: {
          query: term
        },
        method: 'POST',
        fastMode: true
      });
      const results = response.data.endpoints;
      console.log(`\n📊 Found ${results.length} results for "${term}"`);
      results.forEach(endpoint => {
        allEndpoints.add(`https://apinow.fun/api/endpoints/${endpoint.namespace}/${endpoint.endpointName}`);
      });
    } catch (error) {
      console.log(`❌ Failed to search for term "${term}": ${error.message}`);
    }
  }

  // Get info and filter by cost
  const viableEndpoints = [];
  
  for (const endpointUrl of allEndpoints) {
    try {
      const info = await apiNow.info(endpointUrl);
      const costUsd = cryptoToUsd(info.requiredAmount, info.chain);
      
      console.log(`\n💰 Endpoint: ${endpointUrl}\nCost: $${costUsd.toFixed(2)} (${info.requiredAmount} ${info.chain.toUpperCase()})\nDescription: ${info.description}`);
      
      if (costUsd <= MAX_COST_USD) {
        viableEndpoints.push({
          endpointName: info.endpointName,
          description: info.description,
          url: info.url,
          costUsd,
          namespace: info.namespace,
          chain: info.chain,
          requiredAmount: info.requiredAmount,
          httpMethod: info.httpMethod,
          querySchema: info.querySchema // Include schema for POST endpoints
        });
      } else {
        console.log('⚠️  Skipped: Cost exceeds maximum');
      }
    } catch (error) {
      failedEndpoints.push({ url: endpointUrl, error: error.message });
      console.log(`❌ Failed to fetch info for ${endpointUrl}: ${error.message}`);
    }
  }

  return { viableEndpoints, failedEndpoints };
}

async function payAndGetData(endpoint) {

    console.log("!!@#", JSON.stringify(endpoint, null, 2));
  try {
    const options = {
      fastMode: true
    };

    // Construct the correct API endpoint URL
    const apiUrl = `https://apinow.fun/api/endpoints/${endpoint.namespace}/${endpoint.endpointName}`;

    // Handle POST endpoints with required data
    if (endpoint.httpMethod === 'POST' && endpoint.querySchema) {
      options.method = 'POST';
      options.data = {};
      
      // Generate required fields based on schema
      Object.entries(endpoint.querySchema.properties).forEach(([key, prop]) => {
        if (endpoint.querySchema.required?.includes(key)) {
          // Generate sample data based on property type/description
          switch (key) {
            case 'message':
              options.data[key] = 'Hello! Please provide a brief introduction.';
              break;
            case 'apiChatId':
              options.data[key] = `test-${Date.now()}`;
              break;
            default:
              options.data[key] = `sample-${key}`;
          }
        }
      });
    }

    console.log(`Making request to: ${apiUrl}`);
    console.log('With options:', JSON.stringify(options, null, 2));

    const response = await apiNow.infoBuyResponse(
      apiUrl,
      process.env.ETH_PRIVATE_KEY,
      process.env.ETH_RPC_URL,
      options
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to get data from ${endpoint.endpointName}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Starting endpoint search...\n');
  console.log('Query:', DEVELOPER_QUERY);
  console.log(`Budget: $${MAX_COST_USD}\n`);

  // Step 1: Generate search terms
  const terms = await generateSearchTerms(DEVELOPER_QUERY);

  // Step 2: Search and filter endpoints
  const { viableEndpoints, failedEndpoints } = await searchEndpoints(terms);

  // Step 3: Pay for and analyze top 2 endpoints
  console.log('\n🔄 Fetching data from top 2 endpoints...');
  
  const top2Endpoints = viableEndpoints.slice(0, 2);
  const results = [];
  
  for (const endpoint of top2Endpoints) {
    console.log(`\n📡 Fetching from ${endpoint.namespace}/${endpoint.endpointName}...`);
    const data = await payAndGetData(endpoint);
    if (data) {
      results.push({
        endpoint,
        data
      });
      console.log(`✅ Successfully got data from ${endpoint.namespace}/${endpoint.endpointName}`);
    }
  }

  // Generate summary using GPT-4
  if (results.length > 0) {
    const analysisPrompt = {
      role: 'user',
      content: `Analyze these API endpoints and their data:\n${results.map(r => 
        `Endpoint: ${r.endpoint.endpointName}\nDescription: ${r.endpoint.description}\nData: ${JSON.stringify(r.data, null, 2)}`
      ).join('\n\n')}\n\nProvide a brief technical summary of the endpoints and their data.`
    };

    const analysis = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: 'You are a technical API analyst. Provide concise, technical summaries focusing on data structure and utility.'
        },
        analysisPrompt
      ]
    });

    console.log('\n📊 Analysis Summary:');
    console.log(analysis.choices[0].message.content);
  }

  // Step 4: Summarize findings
  console.log('\n📊 Search Summary:');
  console.log(`Found ${viableEndpoints.length} endpoints within budget:`);
  
  viableEndpoints.forEach(endpoint => {
    console.log(`\n🔹 ${endpoint.namespace}/${endpoint.endpointName}`);
    console.log(`   Cost: $${endpoint.costUsd.toFixed(2)} (${endpoint.requiredAmount} ${endpoint.chain.toUpperCase()})`);
    console.log(`   URL: ${endpoint.url}`);
    console.log(`   Description: ${endpoint.description}`);
  });

  const totalCost = viableEndpoints.reduce((sum, ep) => sum + ep.costUsd, 0);
  console.log(`\n💵 Total cost for all endpoints: $${totalCost.toFixed(2)}`);

  // Add failed endpoints summary at the end
  if (failedEndpoints.length > 0) {
    console.log('\n⚠️ Failed Endpoints:');
    failedEndpoints.forEach(({ url, error }) => {
      console.log(`   ❌ ${url}: ${error}`);
    });
  }
}

main().catch(console.error); 