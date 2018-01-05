
const events = require('events');

exports.Peer = class Peer extends events.EventEmitter {
    
        constructor (name) {
            super(); //execute evenEmitter constructor

            //load configuration
            this.name = name;
            this.status = 1
        }
    }