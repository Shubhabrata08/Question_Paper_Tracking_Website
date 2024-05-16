const mongoose = require('mongoose');

const hodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    }
});

const Hod = mongoose.model('Hod', hodSchema, 'hodReg'); // Model name is Hod, collection name is hodReg

module.exports = Hod;