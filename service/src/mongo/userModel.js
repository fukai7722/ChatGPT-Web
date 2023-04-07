const connection = require('./connect');
const userSchema = require('./userSchema');

let userModel = connection.model('user', userSchema);

module.exports = userModel;
