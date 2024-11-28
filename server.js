const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;
const path = require('path');
const fs = require('fs');

// Logger Middleware
const loggerMiddleware = (req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.url}`);
    next();
};

app.use(express.json());
app.set('port', 3000);
app.use(loggerMiddleware);

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://hammaddii.github.io', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
});

// Static file route to serve images
const imagesDirectory = path.join(__dirname, 'images');
app.use('/images', express.static(imagesDirectory));

// Route to handle missing image files
app.get('/images/:imageName', (req, res, next) => {
    const imagePath = path.join(imagesDirectory, req.params.imageName);

    // Check if the file exists
    fs.access(imagePath, fs.constants.F_OK, (err) => {
        if (err) {
            return res.status(404).send('Image not found');
        }
        // Send the image file if it exists
        res.sendFile(imagePath);
    });
});

let db;
const uri = 'mongodb+srv://admin:wednesday@coursework.nwofz.mongodb.net/Classwork?retryWrites=true&w=majority';

MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(client => {
        db = client.db('Classwork');
        console.log('Connected to MongoDB');

        app.listen(3000, () => {
            console.log('Express.js server is running at http://localhost:3000');
        });
    })
    .catch(err => {
        console.error('Error connecting to MongoDB:', err);
        process.exit(1); // Exit if the connection fails
    });

// Default route
app.get('/', (req, res) => {
    res.send('Select a collection, e.g., /collection/clubs');
});

// Route to get from MongoDB clubs collection
app.get('/collection/clubs', (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }

    const clubsCollection = db.collection('clubs');
    if (!clubsCollection) {
        return res.status(500).send('Collection not found');
    }

    console.log('Fetching clubs from the database');
    clubsCollection.find({}).toArray((e, results) => {
        if (e) {
            console.error('Error fetching clubs:', e);
            return next(e);
        }
        console.log('Fetched clubs:', results);
        res.send(results);
    });
});

// Route to post order information into the orders collection
app.post('/collection/orders', async (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }

    const ordersCollection = db.collection('orders');
    const { name, phoneNumber, clubs } = req.body;

    if (!name || !phoneNumber || !Array.isArray(clubs) || clubs.length === 0) {
        return res.status(400).send('Invalid order data. Ensure name, phone number, and club information are provided.');
    }

    const clubsWithNames = [];
    for (const club of clubs) {
        const clubData = await db.collection('clubs').findOne({ id: club.clubId });
        if (clubData) {
            clubsWithNames.push({
                clubId: club.clubId,
                clubName: clubData.subject,
                spaces: club.spaces,
            });

            // Update club available space after the order
            await fetch(`http://localhost:3000/collection/clubs/${club.clubId}/updateSpace`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ spaces: club.spaces }),
            });
        } else {
            return res.status(404).send(`Club with ID ${club.clubId} not found`);
        }
    }

    const orderData = {
        name,
        phoneNumber,
        clubs: clubsWithNames,
    };

    try {
        // Insert into the orders collection
        const result = await ordersCollection.insertOne(orderData);
        const orderId = result.insertedId;

        res.status(201).send({ message: 'Order saved successfully', orderId: orderId });

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).send('Error processing order');
    }
});

// Route to update available space for clubs
app.put('/collection/clubs/:clubId/updateSpace', async (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }

    const clubsCollection = db.collection('clubs');
    const { clubId } = req.params;
    const { spaces, type } = req.body;

    if (spaces === undefined || spaces < 0) {
        return res.status(400).send('Invalid number of spaces. Must be a non-negative number.');
    }

    try {
        const club = await clubsCollection.findOne({ id: parseInt(clubId) });

        if (!club) {
            return res.status(404).send(`Club with ID ${clubId} not found`);
        }

        let updateResult;

        if (type === "set") {
            updateResult = await clubsCollection.updateOne(
                { id: parseInt(clubId) },
                { $set: { availableSpace: spaces } }
            );
        } else if (type === "decrease") {
            if (spaces > club.availableSpace) {
                return res.status(400).send('Not enough available space to fulfill this order.');
            }

            updateResult = await clubsCollection.updateOne(
                { id: parseInt(clubId) },
                { $inc: { availableSpace: -spaces } }
            );
        } else {
            return res.status(400).send('Invalid action type. Use "set" or "decrease".');
        }

        if (updateResult.modifiedCount === 0) {
            return res.status(404).send(`Club with ID ${clubId} not found`);
        }

        res.status(200).send({ message: `Successfully updated available space for Club ID ${clubId}` });

    } catch (error) {
        console.error('Error updating available space:', error);
        res.status(500).send('Error updating available space');
    }
});