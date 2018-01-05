const PrettyError = require('pretty-error');
const pe = new PrettyError();
const moment = require('moment')
const { Message } = require("../classes/message")
const { SystemMessage } = require("../classes/systemMessage")

function myLib(peerObj) {
    this.peer = peerObj;
};

myLib.prototype.handleSysMaster = function (msg) {
    if (this.peer.master === false)  return;//not master
    if (msg.params.system === false) return; //only system msges
    switch (msg.cmd) {
        case "IN":
            let newPeer = msg.data
            let peers = msg.peer.peers;
            
            //check duplicated
            if (peers[newPeer.name]) {
                let oldPeer = peers[newPeer.name];
                //check if its the same
                if (`${newPeer.address}${newPeer.portBus}${newPeer.portData}` != `${oldPeer.address}${oldPeer.portBus}${oldPeer.portData}`) {
                    this.sysSendPeer(msg.from, "ERROR", {message:"Peer name already exists, ignoring you."}, {error: true});
                    return  true
                }
            }

            //update MASTER LIST
            this.peer.peers[msg.from] = newPeer;
            this.peer.peers[msg.from].lastUpd = moment().utc().toDate();
            this.sysSendPeer(msg.from, "CONNECTED", msg.peer.peers);

            return true;
            break;
        case "OUT":
            //REMOVE FROM PEER LIST
            if (this.peer.peers[msg.from]) {
                delete this.peer.peers[msg.from]
            }
            return true;
            break;
        case "BEAT":
            //receive heartbeat
            //in case we miss the peer
            if (!this.peer.peers[msg.from])  this.peer.peers[msg.from] = msg.data;
            
            //update last update
            this.peer.peers[msg.from].lastUpd = moment().utc().toDate();
            return true;
            break;
        case "ERROR":
            throw new Error(msg.data.message)
            return true;
            break;
    }
    return false
}

myLib.prototype.handleSysPeer = function (msg) {
    if (msg.params.system  === false) return; //only system msges
    //not master
    switch (msg.cmd) {
        case "PEERS":
            //GET LIST FROM MASTERS
            this.peer.peers = msg.data
            //return HEART BEAT
            this.sysSendBus("BEAT", this.peer._getPeerInfo());
            return true;
            break;
        case "CONNECTED":
            //first peers list and connection confirmation
            this.peer.peers = msg.data
            this.peer.emit("connected")
            return true;
            break;                    
        case "PING":
            //put this on the socketData handle?
            this.sysSendPeer(msg.from, 'PONG', {});
            return true;
            break;
        case "ERROR":
            throw new Error(msg.data.message)
            return true;
            break;
    }
    return false
}

const { Writable } = require('stream');
const fs = require('fs');
const path = require('path');


myLib.prototype.handleFiles = function (msg) {
    //only stream tagged messages (START,CANCEL,CHUNK, END)
    if (msg.params.stream ==false) return false;

    switch (msg.cmd) {
        case "START":
            //ORIGIN START SENDING FILE
            var iStream = this.peer.streams[msg.uid];
            var iPeer = this.peer;
            var streamId = msg.uid;
            if (!iStream) throw new Error("Could not find stream to start:" + msg.uid)

            var fileStream = fs.createReadStream(iStream.fullName);

            //chunk message

            const outStream = new Writable({
                write(chunk, encoding, callback) {
                  //send chunk message - primise
                  var Cmsg = new Message(iPeer, streamId); //use streanCode in Uid
                  Cmsg.send(iStream.to,"CHUNK", chunk, {stream:true}).then(function() {
                            callback();
                    }
                  )
                }
              });
              
            fileStream.pipe(outStream);

            fileStream.on('end', () => {
                var Cmsg = new Message(iPeer, streamId); //use streanCode in Uid
                Cmsg.send(iStream.to, "END", iStream, {stream:true})
                //end locally
                iPeer._cancelStream(streamId)
                this.peer.emit("STREAMLOCAL\END:" + msg.uid, iStream)
             });

             return true;
            break;
        case "CANCEL":
             //ORIGIN CANCEL SENDING FILE
             if (this.peer.streams[msg.data.uid])     
                  delete this.peer.streams[msg.uid]
             return true;
            break;
        case "CHUNK":
             //DEST RECEIVED CHUNK
             this.peer.emit("STREAM\CHUNK:" + msg.uid, msg.data)
             return true
            break;
        case "END":
            //DEST END TRANSMISSION
            this.peer.emit("STREAM\END:" + msg.uid, msg.data)
            return true
            break;
    }   

}

myLib.prototype.sysSendBus = async function (cmd, data)  {
        let msg = new SystemMessage(this.peer);
        return await msg._sendBus(cmd, data);
};


myLib.prototype.sysSendPeer = async function (to, cmd, data, error = false)  {
        let msg = new SystemMessage(this.peer);
        msg.params.error = error
        msg.params.bus = true
        return await msg.send(to, cmd, data, {error:error, system: true, bus:true});
};


module.exports = myLib;