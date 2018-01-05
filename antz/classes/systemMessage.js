
const { Message } = require("./message")

exports.SystemMessage = class Peer extends Message {
        constructor (peerObj, uid=false, timeout = 6000) {
            super(peerObj, uid, timeout); //execute  constructor
            this.params.system = true
        }
 }

 
