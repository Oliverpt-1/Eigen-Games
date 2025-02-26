require('dotenv').config();
const express = require('express');
const { generateTests } = require('./services/testGenerator');

const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting test generator agent server');
console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

// Add CORS middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS preflight request');
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Health check requested');
  res.status(200).json({ status: 'ok' });
});

// Generate tests endpoint
app.post('/generate-tests', async (req, res) => {
  console.log('Generate tests endpoint called');
  
  try {
    console.log('Parsing request body');
    const { contractCode, contractName, testType } = req.body;
    
    if (!contractCode || !contractName) {
      console.log('Missing required parameters');
      return res.status(400).json({ 
        error: 'Missing required parameters: contractCode and contractName are required' 
      });
    }
    
    console.log(`Generating tests for contract: ${contractName}`);
    console.log(`Contract code length: ${contractCode.length} characters`);
    console.log(`Test type: ${testType || 'unit'}`);
    
    const startTime = Date.now();
    console.log('Calling generateTests function');
    const testSuite = await generateTests(contractCode, contractName, testType || 'unit');
    const endTime = Date.now();
    
    console.log(`Tests generated successfully in ${(endTime - startTime) / 1000} seconds`);
    console.log(`Test suite length: ${testSuite.length} characters`);
    
    console.log('Sending response');
    res.status(200).json({ 
      success: true,
      testSuite 
    });
    console.log('Response sent');
  } catch (error) {
    console.error('Error generating tests:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to generate tests',
      message: error.message 
    });
    console.log('Error response sent');
  }
});

app.listen(PORT, () => {
  console.log(`Test Generator Agent running on port ${PORT}`);
  console.log(`Server URL: http://localhost:${PORT}`);
}); 