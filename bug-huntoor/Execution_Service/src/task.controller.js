"use strict";
const { Router } = require("express")
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const agent = require("./agent.service");
const dalService = require("./dal.service");

const router = Router()

router.post("/execute", async (req, res) => {
    console.log("Executing task");

    try {
        var taskDefinitionId = Number(req.body.taskDefinitionId) || 0;
        console.log(`taskDefinitionId: ${taskDefinitionId}`);
        const solidityCode = req.body.solidityCode;
        console.log(`solidityCode: ${solidityCode}`);
        const result = await agent.securityCheck(solidityCode);

        // Store the full analysis result in IPFS
        const cid = await dalService.publishJSONToIpfs(result);
        
        // Create a simplified data object and serialize it to JSON string
        const data = JSON.stringify({
            vulnerabilities_count: result.vulnerabilities ? result.vulnerabilities.length : 0,
            risk_level: result.overall_risk_level,
            is_vulnerable: result.is_vulnerable,
            contains_malicious_code: result.contains_malicious_code
        });

        // Send the task with the serialized data
        await dalService.sendTask(cid, data, taskDefinitionId);
        
        return res.status(200).send(new CustomResponse({
            proofOfTask: cid, 
            data: JSON.parse(data), 
            taskDefinitionId: taskDefinitionId,
            full_analysis: result
        }, "Task executed successfully"));
    } catch (error) {
        console.log(error)
        return res.status(500).send(new CustomError("Something went wrong", {}));
    }
})


module.exports = router
