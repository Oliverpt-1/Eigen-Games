"use strict";
const { Router } = require("express")
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const agentService = require("./agent.service");
const dalService = require("./dal.service");

const router = Router()

router.post("/execute", async (req, res) => {
    console.log("Executing security analysis task");

    try {
        var taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
        console.log(`taskDefinitionId: ${taskDefinitionId}`);

        const solidityCode = req.body.code;
        if (!solidityCode) {
            return res.status(400).send(new CustomError("Missing Solidity code in request body", {}));
        }

        console.log(`Analyzing Solidity code (${solidityCode.length} characters)`);
        
        const result = await agentService.analyzeSolidityCode(solidityCode);
        
        const cid = await dalService.publishJSONToIpfs(result);
        
        const data = JSON.stringify({
            vulnerabilities_count: result.vulnerabilities.length,
            risk_level: result.overall_risk_level,
            is_vulnerable: result.is_vulnerable
        });
        
        await dalService.sendTask(cid, data, taskDefinitionId);
        
        return res.status(200).send(new CustomResponse({
            proofOfTask: cid, 
            data: data, 
            taskDefinitionId: taskDefinitionId,
            analysis_summary: {
                vulnerabilities_count: result.vulnerabilities.length,
                risk_level: result.overall_risk_level,
                is_vulnerable: result.is_vulnerable
            }
        }, "Security analysis completed successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError(`Security analysis failed: ${error.message}`, {}));
    }
})

/**
 * Endpoint to analyze Solidity code using the Qwen Coder model
 */
router.post("/execute/qwen", async (req, res) => {
    console.log("Executing security analysis task with Qwen Coder model");

    try {
        var taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
        console.log(`taskDefinitionId: ${taskDefinitionId}`);

        const solidityCode = req.body.code;
        if (!solidityCode) {
            return res.status(400).send(new CustomError("Missing Solidity code in request body", {}));
        }

        console.log(`Analyzing Solidity code with Qwen Coder (${solidityCode.length} characters)`);
        
        const result = await agentService.analyzeWithQwenCoder(solidityCode);
        
        const cid = await dalService.publishJSONToIpfs(result);
        
        const data = JSON.stringify({
            vulnerabilities_count: result.vulnerabilities.length,
            risk_level: result.overall_risk_level,
            is_vulnerable: result.is_vulnerable
        });
        
        await dalService.sendTask(cid, data, taskDefinitionId);
        
        return res.status(200).send(new CustomResponse({
            proofOfTask: cid, 
            data: data, 
            taskDefinitionId: taskDefinitionId,
            analysis_summary: {
                vulnerabilities_count: result.vulnerabilities.length,
                risk_level: result.overall_risk_level,
                is_vulnerable: result.is_vulnerable
            }
        }, "Security analysis with Qwen Coder completed successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError(`Security analysis with Qwen Coder failed: ${error.message}`, {}));
    }
})

/**
 * Test endpoint to query the Qwen Coder model directly with a custom prompt
 */
router.post("/test/qwen", async (req, res) => {
    console.log("Testing Qwen Coder model with custom prompt");

    try {
        const prompt = req.body.prompt;
        if (!prompt) {
            return res.status(400).send(new CustomError("Missing prompt in request body", {}));
        }

        console.log(`Sending prompt to Qwen Coder (${prompt.length} characters)`);
        
        const result = await agentService.testQwenCoderQuery(prompt);
        
        return res.status(200).send(new CustomResponse({
            response: result
        }, "Qwen Coder query completed successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError(`Qwen Coder query failed: ${error.message}`, {}));
    }
})

router.get("/analysis/:cid", async (req, res) => {
    try {
        const cid = req.params.cid;
        if (!cid) {
            return res.status(400).send(new CustomError("Missing CID parameter", {}));
        }
        
        const analysisResults = await dalService.getIPfsTask(cid);
        return res.status(200).send(new CustomResponse(analysisResults, "Analysis results retrieved successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError(`Failed to retrieve analysis results: ${error.message}`, {}));
    }
})

module.exports = router
