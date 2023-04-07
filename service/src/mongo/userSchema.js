const mongoose = require('mongoose');

let userSchema = mongoose.Schema({
    username: String,
    password: String,
    status: Number,
    createtime: Date
})

module.exports = userSchema;
