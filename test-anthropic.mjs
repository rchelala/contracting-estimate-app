import { readFileSync } from 'fs';
import { join } from 'path';
import fetch from 'node-fetch';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = join(process.cwd(), '.env.local');
    const envContent = readFileSync(envPath, 'utf8');
    const envVars = {};

    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    });

    return envVars;
  } catch (error) {
    console.error('Failed to load .env.local:', error.message);
    return {};
  }
}

const env = loadEnv();
const ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

async function testAnthropicAPI() {
  if (!ANTHROPIC_API_KEY) {
    console.error('ANTHROPIC_API_KEY not set');
    return;
  }

  console.log('Testing Anthropic API key...');

  try {
    // First, try to list available models
    const modelsResponse = await fetch('https://api.anthropic.com/v1/models', {
      method: 'GET',
      headers: {
        'X-Api-Key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
    });

    if (modelsResponse.ok) {
      const modelsData = await modelsResponse.json();
      console.log('✅ Available models:', modelsData.data?.map(m => m.id) || 'No models listed');
    } else {
      console.error('❌ Failed to list models:', modelsResponse.status, modelsResponse.statusText);
      const errorData = await modelsResponse.json();
      console.error('Error details:', JSON.stringify(errorData, null, 2));
      return;
    }

    // Now try a simple message
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 100,
        temperature: 0.2,
        system: 'You are a helpful assistant.',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, world!" and nothing else.',
          },
        ],
      }),
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Anthropic API test successful!');
      console.log('Response:', data.content[0].text);
    } else {
      console.error('❌ Anthropic API test failed:', response.status, response.statusText);
      console.error('Error details:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Network error:', error.message);
  }
}

testAnthropicAPI();