const PrettyError = require('pretty-error');
const pe = new PrettyError();
const moment = require('moment');

const params = {
    denied: 256,
    stream: 128,
    file: 64,
    error: 32,
    group: 16,
    answer: 8,
    response: 4,
    system: 2,
    bus: 1
}


function myLib() {
};

myLib.loadParam = function (value)  {
    var lastMod = value;
    let res = {}
    for (var key in params) {
            let mod = value % params[key];
            if (mod < lastMod ) {
                lastMod = mod
                res[key] = true
            }
            else res[key] = false
    }
    return res
};

myLib.resumeParam = function (res)  {
    var value = 0;
    for (var key in params) {
        if (key.charAt(0) !="#") { //not reserved ones for future compatibility
            if (res[key] ) value += params[key]
        }
    }
    return value;
};



// extra
myLib.convertToBuff = function (data) {
    //auto detect data
    let type = typeof data;
    let dType = Object.prototype.toString.call(data);
    if (dType === '[object Object]') {
        this.type = 'o'
        data = Buffer.from(JSON.stringify(data),'utf8')
    } else if (dType === '[object Array]') {
        this.type = 'o'
        data = Buffer.from(JSON.stringify(data),'utf8')
    } else if (dType === '[object String]') {
        this.type = 't'
        data = Buffer.from(data,'utf8')
    } else if (isBuffer(data)) { //[object Uint8Array]
        this.type = 'b'
    } else {
        throw new Error(`Only buffer, json, array or string accepted by this method` )
        return false
    }
    return data;
}

myLib.isString = function (data) {
    //auto detect data
    
    let dType = Object.prototype.toString.call(data);
    if (dType !== '[object String]') {
        return false;
    } 
    return true;
}


const xxtea = require('xxtea-node');

myLib.findKey = function(msg, buff) {
     //get current communication key
    var pair = msg.peer.getConn(msg.to);
    if (pair && pair.key) {
        //test it
        let key = pair.key.key;
        let decrypted = this.decrypt(buff, key).toString('utf8');
        if (decrypted === pair.key.validate) {
            return key;
        }
    }
    for (let i in msg.peer.keys) {
        let key = msg.peer.keys[i].key
        let validate = msg.peer.keys[i].validate
        let decrypted = this.decrypt(buff, key).toString('utf8');
        if (decrypted === validate) {
            if (msg.peer.conns[msg.to])  msg.peer.conns[msg.to].key = msg.peer.keys[i]
            return key;
        }
    }
    return false;
 }

 var crypto = require('crypto')
 //algorithm = 'camellia-256-ecb' //963
 //var algorithm = 'aes-256-ecb' //973
 var algorithm = 'aes-192-ecb' //973
 //https://gist.github.com/chris-rock/6cac4e422f29c28c9d88
 //https://gist.github.com/reggi/4459803
 
 myLib.encrypt = function (buffer, key){
    var cipher = crypto.createCipher(algorithm,key)
    var crypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
    return crypted;
  }

  myLib.decrypt = function (buffer, key){
    var decipher = crypto.createDecipher(algorithm, key)
    var dec = Buffer.concat([decipher.update(buffer) , decipher.final()]);
    return dec;
  }


module.exports = myLib;