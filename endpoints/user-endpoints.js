const { getPetByID, advSearch, changeStatus, addFavorite, deleteFavorite, getPetsByUser, getUserByEmail, getFavoritesByUserID } = require('../services/db_services');
const { userLoginValidation } = require('../middlewares/validation')
const express = require('express')
require('dotenv').config({ path: '../.env' });
var cors = require('cors')
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const { verifyUser } = require('../middlewares/protect-routes');


const app = express();

app.use(cors(
    {
        origin: 'http://localhost:5173',
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
    next()
})

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
    console.log(searchTerms);
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
        console.log(searchResult);
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
        const match = await bcrypt.compare(password, existedUser[0].password);
        if (!match) {
            res.status(401).json({ error: 'Wrong password' });
        } else {
            jwt.sign({ user_id: existedUser[0].user_id }, process.env.PRIVATE_KEY, function (err, token) {
                if (err) {
                    res.status(500).json({ error: 'Internal server error' });
                }
                res.cookie('token', token, { expire: 24 * 60 * 60 * 1000 });
                res.cookie('uid', existedUser[0].user_id, { expire: 24 * 60 * 60 * 1000 });
                // console.log(res.redirect(`/pets/user/${existedUser[0].user_id}`))
                return res.json({ message: "Auth Succeed" });
            });
        }
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
        res.status('200').json({ status: 'ok' });
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
        res.status('200').json({ status: 'ok' });
    } catch (err) {
        res.status('500').json({ error: 'Internal server error' });
    }
})

//change pet status
app.put('/pets/:id&:status/adopt', async (req, res) => {
    const userID = 1; //get user id by token
    const petID = parseInt(req.params.id);
    const newStatus = req.params.status;
    try {
        await changeStatus(newStatus, petID, userID);
        res.status('200').json({ status: 'ok' });
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


const PORT = process.env.APP_PORT;
app.listen(PORT, () => {
    console.log(`App listening on port ${PORT}`)
});