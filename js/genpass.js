var passwordHash = require('password-hash');
var hashedPassword = passwordHash.generate('password123', {algorithm:'sha256'});
console.log(hashedPassword);
console.log(passwordHash.verify('password123', 'sha256$907490fd$1$f3fa564eb397b8c48ef2300810673ba8c1455506879cdaf4180bc6ffd01e9cae'));