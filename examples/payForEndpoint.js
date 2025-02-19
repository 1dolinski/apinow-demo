import dotenv from 'dotenv';
import { OpenAI } from 'openai';
import apiNow from 'apinow-sdk';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tools = [{
  type: 'function',
  function: {
    name: 'info_buy_response',
    description: 'Purchase access to an API endpoint',
    parameters: {
      type: 'object',
      properties: {
        endpoint: {
          type: 'string',
          description: 'The API endpoint URL'
        }
      },
      required: ['endpoint']
    }
  }
}];


// This is the function that will be called by the OpenAI API. It will gather the pricing information of the endpoint
async function infoBuyResponse(args) {
  console.log('Info Buy Response Tool called with args:', args);
  const result = await apiNow.infoBuyResponse(
    args.endpoint,
    process.env.ETH_PRIVATE_KEY,
    process.env.ETH_RPC_URL,
    { 
      fastMode: true 
    }
  );
  return result;
}

async function main() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'user', content: 'Buy 1 day access to https://apinow.fun/api/endpoints/data/apinow-sdk-example' }
    ],
    tools,
    tool_choice: 'auto'
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await infoBuyResponse(args);
    
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: 'Explain the purchase result' },
        response.choices[0].message,
        { 
          role: 'tool', 
          content: JSON.stringify(result),
          tool_call_id: toolCall.id 
        }
      ]
    });
    
    console.log(finalResponse.choices[0].message.content);
  }
}

main().catch(console.error); 