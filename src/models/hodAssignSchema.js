const mongoose = require('mongoose');

const hodAssignSchema = new mongoose.Schema({
    teacherName: {
        type: String,
        required: true
    },
    teacherEmail: {
        type: String,
        required: true
    },
    teacherPassword: {
        type: String,
        required: true
    },
    teacherDepartment: {
        type: String,
        required: true
    },
    semester: {
        type: String,
        required: true
    },
    year: {
        type: String,
        required: true
    },
    otp: {
        type: String
    },
    newPassword: {
        type: String
    },
    questionPaper: {
        type: Buffer
    },
    submissionStatus: {
        type: String
    }
},
{collection:'hodAssign'}
);

const HodAssign = mongoose.model('HodAssign', hodAssignSchema);

module.exports = HodAssign;
