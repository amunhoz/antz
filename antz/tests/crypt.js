var CryptoJS = require("crypto-js");
var xxtea = require('xxtea-node');

var str = "OKOP";
var key = "12345678dddddd90";
var bytes = xxtea.toBytes(str);
var encrypt_data = xxtea.encrypt(xxtea.toBytes(str), xxtea.toBytes(key));

console.log(encrypt_data.length);


var decrypt_data = xxtea.toString(xxtea.decrypt(encrypt_data, xxtea.toBytes(key)));

console.assert(str === decrypt_data);
