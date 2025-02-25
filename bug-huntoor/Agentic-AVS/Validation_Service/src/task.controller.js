"use strict";
const { Router } = require("express")
const CustomError = require("./utils/validateError");
const CustomResponse = require("./utils/validateResponse");
const validatorService = require("./validator.service");

const router = Router()

/**
 * Endpoint to validate security analysis results
 * Attesters call this endpoint to determine if they should approve a task
 */
router.post("/validate", async (req, res) => {
    const proofOfTask = req.body.proofOfTask;
    
    if (!proofOfTask) {
        return res.status(400).send(new CustomError("Missing proofOfTask in request body", {}));
    }
    
    console.log(`Validating security analysis task: proof of task: ${proofOfTask}`);
    
    try {
        const result = await validatorService.validate(proofOfTask);
        console.log('Validation result:', result ? 'Approved' : 'Not Approved');
        
        return res.status(200).send(new CustomResponse({
            isValid: result,
            proofOfTask: proofOfTask,
            message: result ? 'Security analysis passed validation' : 'Security analysis failed validation'
        }));
    } catch (error) {
        console.error("Error during validation:", error);
        return res.status(500).send(new CustomError(`Validation failed: ${error.message}`, {}));
    }
})

module.exports = router
