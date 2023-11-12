const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const routes = require('./routes');
const express = require("express");

require("dotenv").config();

const app = express();

app.use(bodyParser.json());
app.use('/', routes);

app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/Blogging', { useNewUrlParser: true });

const db = mongoose.connection;

db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', function () {
    console.log('Database connected successfully');
});

app.listen(3000, () => console.log("Server Started on port 3000"));