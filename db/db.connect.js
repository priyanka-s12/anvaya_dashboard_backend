const mongoose = require('mongoose');
require('dotenv').config();
const MONGODB_URl = process.env.MONGODB_URI;

const initializeDatabase = async () => {
  await mongoose
    .connect(MONGODB_URl)
    .then(() => console.log('Connected to database'))
    .catch((error) => console.log('Error connecting to database', error));
};

module.exports = { initializeDatabase };
