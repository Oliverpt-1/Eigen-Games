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

app.post('/api/compile-and-test', async (req, res) => {
    const { code, testCode } = req.body;
    if (!code || !testCode) return res.status(400).json({ error: 'Missing contract or test code' });
    
    const workspace = path.join(TEMP_DIR, crypto.randomUUID());
    fs.mkdirSync(workspace, { recursive: true });
    
    try {
        console.log(`🛠 Creating workspace at ${workspace}`);
        await execPromise(`cd "${workspace}" && forge init --force`);
        await execPromise(`cd "${workspace}" && forge install Uniswap/v4-core Uniswap/v4-periphery`);
        
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
        
        res.json({ success: true, compileOut, testOut });
    } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        res.status(500).json({ success: false, error: error.message });
    } finally {
        fs.rmSync(workspace, { recursive: true, force: true });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
