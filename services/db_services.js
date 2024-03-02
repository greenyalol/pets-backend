const mysql = require('mysql');
require('dotenv').config({ path: './.env' });

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    port: process.env.DB_PORT,
    database: 'adoption_center'
});

connection.connect();

function execQuery(myQuery, ...params) {
    return new Promise((resolve, reject) => {
        const c = connection.query(myQuery, params, (err, results, fields) => {
            err ? reject(err) : resolve(JSON.parse(JSON.stringify(results)));
        })
    })
}

async function getPetByID(id) {
    const query = `SELECT DISTINCT hypoallergenic, link, name, status_name, type_name, height, weight, color, bio, dietary, breed_name
        FROM Pets p 
        INNER JOIN Statuses s ON p.status_id  = s.status_id
        INNER JOIN Pet_types pt ON p.type_id = pt.type_id 
        INNER JOIN Breeds b ON p.breed_id = b.breed_id 
        LEFT JOIN Pictures pic ON p.pet_id = pic.pet_id 
        WHERE p.pet_id = ?`;
    const pet = execQuery(query, id).catch((err) => {
        throw err.message
    })
    return pet;
}

async function advSearch(
    petStatus,
    petType,
    petName = '',
    minHeight = 0,
    maxHeight = 999,
    minWeight = 0,
    maxWeight = 999) {

    const query = `SELECT DISTINCT p.pet_id, name, link, status_name, type_name, height, weight, color, bio, dietary, breed_name
        FROM Pets p 
        INNER JOIN Statuses s ON p.status_id  = s.status_id
        INNER JOIN Pet_types pt ON p.type_id = pt.type_id 
        INNER JOIN Breeds b ON p.breed_id = b.breed_id
        LEFT JOIN Pictures pic ON p.pet_id = pic.pet_id  
        WHERE 
        status_name IN (SELECT status_name FROM Statuses s2 WHERE status_name = IFNULL(?, status_name))
        AND 
        name LIKE '%${petName}%'
        AND
        type_name IN (SELECT type_name FROM Pet_types pt2 WHERE type_name = IFNULL(?, type_name))
        AND
        height BETWEEN ? AND ?
        AND 
        weight BETWEEN ? AND ?`

    const pets = execQuery(query, petStatus, petType, minHeight, maxHeight, minWeight, maxWeight).catch((err) => {
        throw err.message
    })
    return pets;
}

async function changeStatus(newStatus, petID, userID) {
    connection.beginTransaction((err) => {
        if (err) throw err;
    })
    const statusIDQuery = `SELECT status_id FROM Statuses WHERE status_name = ?`
    const newStatusID = await execQuery(statusIDQuery, newStatus).catch((err) => {
        throw err.message;
    });

    const currentStatusIDQuery = `SELECT status_id FROM Pets WHERE pet_id = ?`
    const currentStatusID = await execQuery(currentStatusIDQuery, petID).catch((err) => {
        throw err.message;
    });

    const updatePetsQuery = `UPDATE Pets
        SET status_id = ?, owner_id = ?
        WHERE pet_id = ?;`

    let updatePets;
    if (newStatus === 'available') {
        updatePets = await execQuery(updatePetsQuery, newStatusID[0].status_id, null, petID).catch((err) => {
            throw err.message;
        });
    } else {
        updatePets = await execQuery(updatePetsQuery, newStatusID[0].status_id, userID, petID).catch((err) => {
            throw err.message;
        });
    }


    const insertTransferQuery = `INSERT INTO Transfers(pet_id, initiator_id, new_status_id, prev_status_id, transfer_date)
        VALUES
        (?, ?, ?, ?, NOW());`

    const insertTransfer = await execQuery(insertTransferQuery, petID, userID, newStatusID[0].status_id, currentStatusID[0].status_id).catch((err) => {
        throw err.message;
    });

    connection.commit((err) => {
        if (err) {
            return connection.rollback(() => {
                throw err;
            });
        }
    });
    //connection.end();
}

async function addFavorite(userID, petID) {
    const addFavQuery = `INSERT INTO Favorites (pet_id, owner_id) VALUES (?, ?)`;
    const addQuery = await execQuery(addFavQuery, petID, userID).catch((err) => {
        throw err.message;
    });
}

async function deleteFavorite(userID, petID) {
    const addFavQuery = `DELETE FROM Favorites WHERE pet_id = ? AND owner_id = ?`;
    const addQuery = await execQuery(addFavQuery, petID, userID).catch((err) => {
        throw err.message;
    });
}

async function getFavoritesByUserID(userID) {
    const favorites = `SELECT DISTINCT name, f.pet_id, status_name, f.owner_id, link, u.fname from Favorites f 
        INNER JOIN 
        Users u ON u.user_id = f.owner_id 
        INNER JOIN 
        Pets p ON p.pet_id = f.pet_id 
        INNER JOIN Statuses s ON s.status_id = p.status_id 
        LEFT JOIN 
        Pictures pic ON pic.pet_id = p.pet_id 
        where f.owner_id = ?`;

    const getFavoritesQuery = await execQuery(favorites, userID).catch((err) => {
        throw err.message;
    })

    return getFavoritesQuery;
}

async function getPetsByUser(userID) {
    const getPetsByStatusQuery = `SELECT DISTINCT name, pet_id, status_name, owner_id, link
        FROM (SELECT * FROM Pets p WHERE owner_id = ?) mp
        INNER JOIN 
        Statuses s ON mp.status_id = s.status_id
        LEFT JOIN 
        Pictures pic USING (pet_id)`;

    const getPetsByStatus = await execQuery(getPetsByStatusQuery, userID).catch((err) => {
        throw err.message;
    });

    return getPetsByStatus;
}

async function getUserByID(id) {
    const getUserByIDQuery = `SELECT email, password, fname, lname, phone
    FROM Users u 
    WHERE user_id = ?;`

    const user = await execQuery(getUserByIDQuery, id).catch((err) => {
        throw err.message;
    });

    return user;
}

async function updateUser(user) {
    const { uid, email, password, fname, lname, phone } = user;
    const updateUserQuery = `UPDATE Users
    SET email = ?, password = ?, fname = ?, lname = ?, phone = ?
    WHERE user_id = ? `;

    const updateUser = await execQuery(updateUserQuery, email, password, fname, lname, phone, uid).catch((err) => {
        throw err.message;
    })

    return updateUser;
}

async function updatePhoto(pet_id, photo) {
    const updatePhotoQuery = `UPDATE Pictures SET
    link = ?
    where pet_id = ?`;

    const updatePhoto = await execQuery(updatePhotoQuery, photo, pet_id).catch((err) => {
        throw err.message;
    })

    return updatePhoto;
}

//auth
async function getUserByEmail(userEmail) {
    const getUserByEmailQuery = `SELECT user_id, email, password, fname, lname, phone, bio 
    FROM Users u 
    WHERE u.email = ?`

    const user = await execQuery(getUserByEmailQuery, userEmail).catch((err) => {
        throw err.message;
    });

    return user;
}

//new user
async function addNewUser(newUser) {
    const { email, password, fname, lname, phone } = newUser;
    const addNewUserQuery = `INSERT INTO Users (email, password, fname, lname, phone)
    VALUES
    (?, ?, ?, ?, ?)`;

    const addUser = await execQuery(addNewUserQuery, email, password, fname, lname, phone).catch((err) => {
        throw err.message;
    })

    return addUser;
}

async function addUserRole(user_id, role) {
    const uRoleQuery = `INSERT INTO user_roles (role_id, user_id)
    VALUES
    (?, ?);`;

    const addRole = await execQuery(uRoleQuery, role, user_id).catch((err) => {
        throw err.message;
    })

    return addRole;
}

//admin

//get all users
async function getAllUsers() {
    const allUsersQuery = `SELECT u.user_id, email, fname, lname, phone, slug, description
    from Users u 
    INNER JOIN 
    user_roles ur ON u.user_id = ur.user_id 
    INNER JOIN 
    Roles r ON r.role_id = ur.role_id`

    const allUsers = await execQuery(allUsersQuery).catch((err) => {
        throw err.message;
    })

    return allUsers;
}

async function getUserRoles(uid) {
    const userRolesQuery = `SELECT slug
    FROM
    user_roles ur 
    INNER JOIN
    Roles r ON ur.role_id  = r.role_id 
    WHERE ur.user_id = ?`;

    const userRoles = await execQuery(userRolesQuery, uid).catch((err) => {
        throw err.message;
    })

    return userRoles;
}

async function getPets(limit, offset) {

    const getPetsQuery = `SELECT DISTINCT p.pet_id, s.status_id, p.type_id, p.breed_id, p.owner_id, p.dietary, p.color, p.weight, p.height, p.bio, link, u.fname, u.phone, u.email, name, status_name, type_name, breed_name
    FROM Pets p
    INNER JOIN Statuses s ON p.status_id  = s.status_id
    INNER JOIN Pet_types pt ON p.type_id = pt.type_id 
    INNER JOIN Breeds b ON p.breed_id = b.breed_id 
    LEFT JOIN Pictures pic ON p.pet_id = pic.pet_id 
    LEFT JOIN Users u ON u.user_id = p.owner_id;`

    const pets = await execQuery(getPetsQuery, limit, offset).catch((err) => {
        throw err.message;
    });

    return pets;
}

async function addBreed(breed, typeID, hypoallergenic) {

    const addBreedQuery = `INSERT INTO Breeds (breed_name, type_id, hypoallergenic)
    VALUES
    (?, ?, ?)`;

    const addBreed = await execQuery(addBreedQuery, breed, typeID, hypoallergenic).catch((err) => {
        throw err.message;
    });
}

async function getBreeds() {
    const getBreedsQuery = `SELECT breed_id, breed_name, hypoallergenic
    FROM
    Breeds`;

    const breeds = await execQuery(getBreedsQuery).catch((err) => {
        throw err.message;
    });

    return breeds;
}

async function addType(typeName) {
    const addTypeQuery = `INSERT INTO Pet_types (type_name)
    VALUES
    (?)`;

    const addType = await execQuery(addTypeQuery, typeName).catch((err) => {
        throw err.message;
    });

    return addType;
}

async function getTypes() {
    const getTypesQuery = `SELECT type_id, type_name
    FROM
    Pet_types`;

    const types = await execQuery(getTypesQuery).catch((err) => {
        throw err.message;
    });

    return types;
}

async function addPet(pet) {
    const { name, type_id, height, weight, color, bio, dietary, breed_id } = pet;
    const addPetQuery = `INSERT INTO Pets (name, status_id, type_id, height, weight, color, bio, dietary, breed_id, owner_id)
    VALUES 
    (?, 3, ?, ?, ?, ?, ?, ?, ?, null)`

    const addPet = await execQuery(addPetQuery, name, type_id, height, weight, color, bio, dietary, breed_id).catch((err) => {
        throw err.message;
    });

    return addPet;
}

async function updatePet(pet) {
    const { name, status_id, type_id, height, weight, color, bio, dietary, breed_id, owner_id, pet_id } = pet;
    const addPetQuery = `UPDATE Pets 
    SET name = ?, 
    status_id = ?, 
    type_id = ?, 
    height = ?, 
    weight = ?, 
    color = ?,
    bio = ?, 
    dietary = ?, 
    breed_id = ?, 
    owner_id = ?
    WHERE pet_id = ?;`

    const addPet = await execQuery(addPetQuery, name, status_id, type_id, height, weight, color, bio, dietary, breed_id, owner_id, pet_id).catch((err) => {
        throw err.message;
    });

    return addPet;
}

async function addPhoto(petID, link) {
    const addPhotoQuery = `INSERT INTO Pictures(pet_id, link)
    VALUES
        (?, ?)`

    const addPhoto = await execQuery(addPhotoQuery, petID, link).catch((err) => {
        throw err.message;
    });

    return addPhoto;

}

async function getTransfers() {
    const getTransfersQuery = `SELECT
        t.transfer_id AS transfer_id,
        s_from.status_name AS previous_status,
        s_to.status_name AS new_status,
        u.email AS initiator,
        t.transfer_date,
        p.name,
        p.pet_id
    FROM
        Transfers t
    JOIN
        Statuses s_from ON t.prev_status_id  = s_from.status_id 
    JOIN
        Statuses s_to ON t.new_status_id = s_to.status_id
    JOIN 
        Users u ON t.initiator_id = u.user_id 
    JOIN 
        Pets p ON p.pet_id = t.pet_id 
    ORDER BY t.transfer_date DESC;`;

    const transfers = await execQuery(getTransfersQuery).catch((err) => {
        throw err.message;
    });

    return transfers;
}

async function deletePet(id) {
    const unsetKeys = `SET FOREIGN_KEY_CHECKS = 0;`;
    const setKeys = `SET FOREIGN_KEY_CHECKS = 1;`
    const deletePetQuery = `DELETE FROM Pets WHERE pet_id = ?;`

    await execQuery(unsetKeys).catch((err) => {
        throw err.message;
    });

    await execQuery(deletePetQuery, id).catch((err) => {
        throw err.message;
    });

    await execQuery(setKeys).catch((err) => {
        throw err.message;
    });

    return;
}


async function updateUserRole(user_id, role_id) {
    const updateUserRoleQuery = `UPDATE user_roles
    set role_id = ?
    where user_id = ?`;

    const updRole = await execQuery(updateUserRoleQuery, role_id, user_id).catch((err) => {
        throw err.message;
    });

    return updRole;
}


async function deleteUser(id) {
    const unsetKeys = `SET FOREIGN_KEY_CHECKS = 0;`;
    const setKeys = `SET FOREIGN_KEY_CHECKS = 1;`
    const deleteUserQuery = `DELETE FROM Users WHERE user_id = ?;`

    await execQuery(unsetKeys).catch((err) => {
        throw err.message;
    });

    await execQuery(deleteUserQuery, id).catch((err) => {
        throw err.message;
    });

    await execQuery(setKeys).catch((err) => {
        throw err.message;
    });

    return;
}


module.exports = {
    updateUserRole,
    deleteUser,
    updatePhoto,
    addUserRole,
    deletePet,
    getTransfers,
    updatePet,
    addPhoto,
    addPet,
    addBreed,
    getBreeds,
    getTypes,
    addType,
    getPets,
    getAllUsers,
    getUserRoles,
    getPetByID,
    advSearch,
    addNewUser,
    changeStatus,
    addFavorite,
    deleteFavorite,
    getPetsByUser,
    getUserByEmail,
    getFavoritesByUserID,
    updateUser,
    getUserByID
};