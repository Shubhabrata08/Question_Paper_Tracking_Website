
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CoordinatorSchema = new Schema({
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
const Coordi = mongoose.model('Coordi', CoordinatorSchema, 'CoordinatorReg');

module.exports = Coordi;

