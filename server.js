const express = require('express');
const app = express();
const MongoClient = require('mongodb').MongoClient;

app.use(express.json());
app.set('port', 3000);

app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://hammaddii.github.io', '*');
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,OPTIONS,POST,PUT");
    res.setHeader("Access-Control-Allow-Headers", "Access-Control-Allow-Headers, Origin,Accept, X-Requested-With, Content-Type, Access-Control-Request-Method, Access-Control-Request-Headers");
    next();
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
app.post('/collection/orders', (req, res, next) => {
    if (!db) {
        return res.status(500).send('Database not initialized');
    }
    const ordersCollection = db.collection('orders');

    // Validate incoming order data
    const { name, phoneNumber, clubs } = req.body;

    if (!name || !phoneNumber || !Array.isArray(clubs) || clubs.length === 0) {
        return res.status(400).send('Invalid order data. Ensure name, phone number, and club information are provided.');
    }

    const orderData = {
        name,
        phoneNumber,
        clubs,
    };

    // Insert the order into the database
    ordersCollection.insertOne(orderData, (err, result) => {
        if (err) {
            console.error('Error inserting order:', err);
            return next(err);
        }
        res.status(201).send({ message: 'Order saved successfully', orderId: result.insertedId });
    });
});