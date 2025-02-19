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
    name: 'get_endpoint_info',
    description: 'Get information about an API endpoint',
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

async function getEndpointInfo(endpoint) {
  console.log('Tool called for', endpoint);
  return await apiNow.info(endpoint);
}

async function main() {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo-preview',
    messages: [
      { role: 'user', content: 'What are the details of https://apinow.fun/api/endpoints/placeholder/posts?' }
    ],
    tools,
    tool_choice: 'auto'
  });

  const toolCall = response.choices[0].message.tool_calls?.[0];
  
  if (toolCall) {
    const args = JSON.parse(toolCall.function.arguments);
    const result = await getEndpointInfo(args.endpoint);
    
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'user', content: 'Explain the endpoint details' },
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