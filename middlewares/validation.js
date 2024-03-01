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

function petValidation(req, res, next) {
    // console.log(req.body);
    // console.log(req.file);
    const { name, status_id, type_id, height, weight, color, bio, dietary, breed_id } = req.body;
    const schema = {
        type: "object",
        properties: {
            name: {
                type: "string",
            },
            status_id: {
                type: "integer",
                maximum: 9
            },
            type_id: {
                type: "integer"
            },
            height: {
                type: "integer",
                minimum: 1,
                maximum: 200,
            },
            weight: {
                type: "integer",
                minimum: 1,
                maximum: 150,
            },
            color: {
                type: "string"
            },
            bio: {
                type: "string"
            },
            dietary: {
                type: "string"
            },
            breed_id: {
                type: "integer"
            }
        },
        required: ["name", "status_id", "type_id", "height", "weight", "color", "bio", "dietary", "breed_id"],
        additionalProperties: true
    }
    const validate = ajv.compile(schema);
    const valid = validate({ name, status_id, type_id, height, weight, color, bio, dietary, breed_id });
    // console.log(valid);
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
        return;
    } else {
        next();
    }
}

function breedValidation(req, res, next) {
    const { breed } = req.body;
    const schema = {
        type: "object",
        properties: {
            breed: {
                type: "string",
                minLength: 3
            }
        },
        additionalProperties: true
    }
    const validate = ajv.compile(schema);
    const valid = validate({ breed });
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
        return;
    } else {
        next();
    }
}

function typeValidation(req, res, next) {
    const { typeName } = req.body;
    const schema = {
        type: "object",
        properties: {
            typeName: {
                type: "string",
                minLength: 3
            }
        },
        additionalProperties: true
    }
    const validate = ajv.compile(schema);
    const valid = validate({ typeName });
    console.log(valid);
    if (!valid) {
        res.status(400).json({ error: 'Bad request' });
        return;
    } else {
        next();
    }
}

module.exports = {
    petValidation, typeValidation, breedValidation, userLoginValidation, userCredentialValidation, userUpdateValidation
};