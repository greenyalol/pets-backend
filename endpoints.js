const { getPetByID, advSearch, changeStatus, addFavorite, deleteFavorite, getPetsByUser, addNewUser, getUserByID, getUserByEmail, getFavoritesByUserID, updateUser, getAllUsers, getPets, getBreeds, getTypes, addBreed, addType, addPet, addPhoto, updatePet, getTransfers, deletePet, getUserRoles, addUserRole, updatePhoto, deleteUser, updateUserRole } = require('./services/db_services');
const { userLoginValidation, userCredentialValidation, userUpdateValidation, petValidation, typeValidation, breedValidation } = require('./middlewares/validation')
const express = require('express')
require('dotenv').config({ path: './.env' });
var cors = require('cors')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid')
const cookieParser = require('cookie-parser');
const { verifyUser, hasAdminRole } = require('./middlewares/protect-routes');
const bodyParser = require('body-parser');
const multer = require('multer');
const path = require('path');
const cloudinary = require('cloudinary').v2
const fs = require('fs');


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Only images are allowed'));
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });
const app = express();

app.use(cors(
    {
        origin: 'https://65e3612fb69336dfcf6d858a--celadon-macaron-0c9435.netlify.app',
        // origin: true,
        credentials: true
    }));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
    res.header('Content-Type', 'application/json;charset=UTF-8')
    res.header('Access-Control-Allow-Credentials', true)
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept'
    )
    res.header('Access-Control-Allow-Origin', '*')
    next()
})

// app.use(express.static(path.join(__dirname, 'uploads')));


//Search Pets link format: http://localhost:3001/pets/search?status=&type=&minHeight=50&maxHeight=60&minWeight=&maxWeight=&name=
app.get('/pets/search', async (req, res) => {
    //validation


    const searchTerms = {
        petStatus: req.query.status ? req.query.status : undefined,
        petType: req.query.type ? req.query.type : undefined,
        petName: req.query.name ? req.query.name : undefined,
        minHeight: req.query.minHeight ? parseInt(req.query.minHeight) : undefined,
        maxHeight: req.query.maxHeight ? parseInt(req.query.maxHeight) : undefined,
        minWeight: req.query.minWeight ? parseInt(req.query.minWeight) : undefined,
        maxWeight: req.query.maxWeight ? parseInt(req.query.maxWeight) : undefined
    };
    try {
        const searchResult = await advSearch(
            searchTerms.petStatus,
            searchTerms.petType,
            searchTerms.petName,
            searchTerms.minHeight,
            searchTerms.maxHeight,
            searchTerms.minWeight,
            searchTerms.maxWeight);
        res.json(searchResult);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

//login
app.post('/login', [userLoginValidation], async (req, res) => {
    const { email, password } = req.body;
    let existedUser = [];
    try {
        existedUser = await getUserByEmail(email);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
    if (existedUser.length === 0) {
        res.status(401).json({ error: `User doesn't exist` });
    } else {
        let userRoles = [];
        try {
            userRoles = await getUserRoles(existedUser[0].user_id);
        } catch (err) {
            res.status(500).json({ error: 'Internal server error' });
        }
        const match = await bcrypt.compare(password, existedUser[0].password);
        if (!match) {
            res.status(401).json({ error: 'Wrong password' });
        } else {
            jwt.sign({ user_id: existedUser[0].user_id }, process.env.PRIVATE_KEY, function (err, token) {
                if (err) {
                    res.status(500).json({ error: 'Internal server error' });
                }
                res.cookie('token', token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    partitioned: true,
                });
                res.cookie('roles', userRoles[0].slug, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    partitioned: true,
                });
                res.cookie('uid', existedUser[0].user_id, {
                    httpOnly: true,
                    secure: true,
                    sameSite: 'none',
                    partitioned: true,
                });
                // res.cookie('uid', existedUser[0].fname, { expire: 24 * 60 * 60 * 1000 });
                const { lname, fname, email, phone } = existedUser[0];
                const u = { lname, fname, email, phone }
                return res.json(u);
            });
        }
    }
})

//get user by id
app.get('/user', [verifyUser], async (req, res) => {
    const { uid } = req;
    try {
        const user = await getUserByID(uid);
        res.json(user[0]);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//get favorite
app.get('/pets/user/favorites', [verifyUser], async (req, res) => {
    const { uid } = req;
    try {
        const favorites = await getFavoritesByUserID(uid);
        res.json(favorites);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

//add favorite
app.put('/pets/:id/save', [verifyUser], async (req, res) => {
    const { uid } = req;
    const { petID } = req.body;
    try {
        await addFavorite(uid, petID);
        res.status(200).json({ status: "saved" });;
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//delete favorite
app.delete('/pets/:id/unsave', [verifyUser], async (req, res) => {
    const { uid } = req;
    const petID = req.params.id;
    try {
        await deleteFavorite(uid, petID);
        res.status(200).json({ status: "unsaved" });;
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//get pets by user
app.get('/pets/user', [verifyUser], async (req, res) => {
    const { uid } = req;
    try {
        const userPets = await getPetsByUser(uid);
        res.json(userPets);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//update user
app.put('/user', [verifyUser, userUpdateValidation], async (req, res) => {
    const { uid } = req;
    //get user by id
    let existedUser;
    try {
        existedUser = await getUserByID(uid);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }

    let updatedUser;
    if (Object.hasOwn(req.body, 'password')) {
        const hash = await hashedPassword(req.body.password, 10);
        updatedUser = { ...existedUser[0], ...req.body, password: hash };
    } else {
        updatedUser = { ...existedUser[0], ...req.body };
    }

    try {
        const updUser = await updateUser({ uid, ...updatedUser });
        res.status(200).json({ status: "updated" });;
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//Get Pet By ID
app.get('/pets/:id', async (req, res) => {
    const petID = req.params.id;
    try {
        const pet = await getPetByID(petID);
        res.json(pet[0]);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
});

//change pet status
app.put('/pets/:id/modify', [verifyUser], async (req, res) => {
    const { uid } = req;
    const { newStatus } = req.body;
    const petID = parseInt(req.params.id);
    let petStatus = '';
    try {
        const pet = await getPetByID(petID);
        petStatus = pet[0].status_name;
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
        // return;
    }

    if (petStatus === newStatus) {
        res.status(400).json({ error: `${petStatus} pet can't be ${newStatus}` });
        return;
    } else if (petStatus === 'adopted' && newStatus === 'fostered') {
        res.status(400).json({ error: `${petStatus} pet can't be ${newStatus}. Please rehome to center first.` });
        return;
    }

    //check if pet in user list than he can rehome his else he can'r rehome his
    try {
        const userPets = await getPetsByUser(uid);
        if (!userPets.some((pet) => pet.pet_id === petID) && newStatus === 'available') {
            res.status(400).json({ error: `You can only rehome your own pet.` });
            return;
        }
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
        return;
    }

    try {
        await changeStatus(newStatus, petID, uid);
        res.status(200).json({ status: "updated" });;
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

const hashedPassword = (password, salt) => {
    return new Promise((resolve, reject) => {
        bcrypt.hash(password, salt, (err, hash) => {
            if (err) reject();
            resolve(hash);
        });
    });
};

app.post('/signup', [userCredentialValidation], async (req, res) => {
    const { email, password, fname, lname, phone } = req.body;
    let existedUser = [];

    try {
        existedUser = await getUserByEmail(email);
        //res.status(200).json({status: "ok"});
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
        return;
    }

    if (existedUser.length !== 0) {
        res.status(401).json({ error: `User already exists` });
        return;
    } else {
        const hash = await hashedPassword(password, 10);
        const newUser = { password: hash, email: email, fname: fname, lname: lname, phone: phone };
        if (JSON.stringify(newUser) !== '{}') {
            try {
                const result = await addNewUser(newUser);
                await addUserRole(result.insertId, 1);
                res.status(200).json({ status: "created" });
            } catch (err) {
                res.status('500').json({ error: 'Internal server error' });
                return;
            }
        }
    }
})

//admins endpoints
app.get('/users', [verifyUser, hasAdminRole], async (req, res) => {
    try {
        const allUsers = await getAllUsers();
        res.json(allUsers);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})


app.get('/pets', [verifyUser, hasAdminRole], async (req, res) => {
    const { limit, offset } = req.query;
    try {
        const pets = await getPets(parseInt(limit), parseInt(offset));
        res.json(pets);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.post('/pets', [verifyUser, hasAdminRole, petValidation], async (req, res) => {
    const { name, type_id, height, weight, color, bio, dietary, breed_id } = req.body;
    const p = {
        name: name,
        type_id: type_id,
        height: height,
        weight: weight,
        color: color,
        bio: bio,
        dietary: dietary,
        breed_id: breed_id
    };
    try {
        const newPet = await addPet(p);
        res.json(newPet);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.put('/pets', [verifyUser, hasAdminRole, petValidation], async (req, res) => {
    const { name, status_id, type_id, height, weight, color, bio, dietary, breed_id, owner_id, pet_id } = req.body;
    try {
        const updatedPet = await updatePet(req.body);
        res.json(updatedPet);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.post('/photo', upload.single('avatar'), async (req, res) => {
    const petID = parseInt(req.body.petID);

    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            fs.unlinkSync(req.file.path);
            const newPhoto = await addPhoto(petID, result.secure_url);
            res.json({ url: result.secure_url });
        } else {
            const newPhoto = await addPhoto(petID, '');
        }
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})


app.put('/photo', upload.single('avatar'), async (req, res) => {
    const petID = parseInt(req.body.petID);

    try {
        if (req.file) {
            const result = await cloudinary.uploader.upload(req.file.path);
            fs.unlinkSync(req.file.path);
            const newPhoto = await updatePhoto(petID, result.secure_url);
            res.json({ url: result.secure_url });
        }
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }

})

app.get('/chars', async (req, res) => {
    try {
        const breeds = await getBreeds();
        const types = await getTypes();
        res.json({
            breeds: breeds,
            types: types
        });
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.post('/breeds', [breedValidation, verifyUser, hasAdminRole], async (req, res) => {
    const { breed, typeID, hypoallergenic } = req.body;
    try {
        await addBreed(breed, typeID, hypoallergenic);
        res.status(200).json({ status: "added" });
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.post('/types', [typeValidation, verifyUser, hasAdminRole], async (req, res) => {
    const { typeName } = req.body;
    try {
        await addType(typeName);
        res.status(200).json({ status: "added" });
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})


app.get('/transfers', [verifyUser, hasAdminRole], async (req, res) => {
    try {
        const transfers = await getTransfers();
        res.json(transfers);
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.delete('/pets/:id', [verifyUser, hasAdminRole], async (req, res) => {
    const petID = parseInt(req.params.id);
    try {
        const removePet = await deletePet(petID);
        res.status(200).json({ status: "deleted" });
        return;
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})


app.delete('/users/:id', [verifyUser, hasAdminRole], async (req, res) => {
    const userID = parseInt(req.params.id);
    try {
        const removeUser = await deleteUser(userID);
        res.status(200).json({ status: "deleted" });
        return;
    } catch (err) {
        res.status(500).json({ error: 'Internal server error' });
    }
})

app.put('/users', [verifyUser, hasAdminRole], async (req, res) => {
    const { role_id, user_id } = req.body;
    try {
        const updatedUser = await updateUserRole(user_id, role_id);
        res.json(updatedUser);
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

app.get("/", (req, res) => {
    res.send("Express on Vercel");
});

const PORT = process.env.APP_PORT;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
});

module.exports = app;