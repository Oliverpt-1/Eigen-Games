require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Directory where temporary workspaces will be created
const TEMP_DIR = path.join(__dirname, 'workspaces');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// Path to the template workspace
const TEMPLATE_DIR = path.join(__dirname, 'template-workspace/v4-template');

app.post('/api/compile-and-test', async (req, res) => {
  const { code, testCode } = req.body;
    if (!code || !testCode) return res.status(400).json({ error: 'Missing contract or test code' });
    
    const workspace = path.join(TEMP_DIR, crypto.randomUUID());
    
    try {
        console.log(`🛠 Creating workspace at ${workspace}`);
        // Copy template instead of initializing new project
        fs.cpSync(TEMPLATE_DIR, workspace, { recursive: true });
        
        // Remove template files
        fs.rmSync(path.join(workspace, 'src', 'Counter.sol'), { force: true });
        fs.rmSync(path.join(workspace, 'test', 'Counter.t.sol'), { force: true });
        
        const contractMatch = code.match(/contract\s+(\w+)/);
        const contractName = contractMatch ? contractMatch[1] : 'Contract';
        fs.writeFileSync(path.join(workspace, 'src', `${contractName}.sol`), code);
        fs.writeFileSync(path.join(workspace, 'test', `${contractName}.t.sol`), testCode);
        
        console.log(`🔍 Compiling contract...`);
        const { stdout: compileOut, stderr: compileErr } = await execPromise(`cd "${workspace}" && forge build`);
        if (compileErr) throw new Error(compileErr);
        
        console.log(`✅ Running tests...`);
        const { stdout: testOut, stderr: testErr } = await execPromise(`cd "${workspace}" && forge test -vv`);
        if (testErr) throw new Error(testErr);
        
        // Simple parsing of test output
        const tests = testOut.split('\n')
          .filter(line => line.includes('[PASS]') || line.includes('[FAIL]'))
          .map(line => {
            const isPassing = line.includes('[PASS]');
            const nameMatch = line.match(/\] (.+?)(?:\s+\[|$)/);
            const gasMatch = line.match(/\[(\d+) gas\]/);
            return {
              name: nameMatch ? nameMatch[1].trim() : 'Test',
              status: isPassing ? 'passed' : 'failed',
              message: isPassing ? 'Test passed' : 'Test failed',
              gasUsed: gasMatch ? parseInt(gasMatch[1]) : undefined
            };
          });
        
        res.json({ 
          success: true, 
          compileOut, 
          testOut, 
          results: tests.length ? [{ name: contractName, tests }] : [] 
        });
  } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        // Comment out workspace deletion for debugging
        // fs.rmSync(workspace, { recursive: true, force: true });
        console.log(`🔍 Workspace preserved at: ${workspace}`);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));