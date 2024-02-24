const Ajv = require("ajv");
const addFormats = require("ajv-formats");
const ajv = new Ajv();
addFormats(ajv);

function userLoginValidation(req, res, next) {
    const { email, password } = req.body;
    const schema = {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email"
            },
            password: {
                type: "string",
                maxLength: 16,
                minLength: 8
            }
        },
        required: ["email", "password"],
        additionalProperties: false
    }
    const validate = ajv.compile(schema);
    const valid = validate({ email, password });
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
    } else {
        next();
    }
}

function userCredentialValidation(req, res, next) {
    const { email, password, lname, fname, phone } = req.body;
    const schema = {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email"
            },
            password: {
                type: "string",
                maxLength: 16,
                minLength: 8
            },
            lname: {
                type: "string"
            },
            fname: {
                type: "string"
            },
            phone: {
                type: "string",
                maxLength: 15 
            }
        },
        required: ["email", "password"],
        additionalProperties: false
    }
    const validate = ajv.compile(schema);
    const valid = validate({ email, password, lname, fname, phone });
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
        return;
    } else {
        next();
    } 
}


function userUpdateValidation(req, res, next) {
    const { email, password, lname, fname, phone } = req.body;
    const schema = {
        type: "object",
        properties: {
            email: {
                type: "string",
                format: "email"
            },
            password: {
                type: "string",
                maxLength: 16,
                minLength: 8
            },
            lname: {
                type: "string"
            },
            fname: {
                type: "string"
            },
            phone: {
                type: "string",
                maxLength: 15 
            }
        },
        additionalProperties: false
    }
    const validate = ajv.compile(schema);
    const valid = validate({ email, password, lname, fname, phone });
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
        return;
    } else {
        next();
    } 
}

module.exports = {
    userLoginValidation, userCredentialValidation, userUpdateValidation
};