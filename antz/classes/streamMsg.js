//external libs
const fs = require('fs');
const path = require('path');
const hasha = require('hasha');

const PrettyError = require('pretty-error');
const pe = new PrettyError();


const { Message } = require("./message")
const awaitEventClass = require('../lib/awaitEvent.js');

exports.streamMsg =  
class  {
        constructor (msg, fileInfo) {
            this._msg = msg;
            //load properties
            for (var i in fileInfo) {
                this[i] = fileInfo[i]
            }
            //this.awaitEvent = new awaitEventClass(msg.peer, msg.timeout)
            this.awaitEvent = msg.peer.awaitEvent;
        }

        async writeToStream (stream) {
            var timeout = this._msg.timeout
            var progressEvent = "STREAM\CHUNK:" + this.stream
            var endEvent = "STREAM\END:" + this.stream
            var msg = this._msg;

            var trigFunc = function () {   //trigger
                msg.peer._destStartStream(msg.from, msg.uid) // trigger to start tranfer
            }                 
            var progressFunc = function (chunk) {  //progressFunc
                stream.write(chunk) //write every chunk to stream
            } 
            var endFunc = function () {  //end Func
                stream.end()  //end transfer
                return true
            } 
            
            //this is magical!!! Wait for transmission using events and renew the timeout at every chunk
            let result = await this.awaitEvent.listenProgress(progressEvent, endEvent, trigFunc, progressFunc, endFunc)
            return result
                                   
        }
        async writeToFile (file, checkIntegrity) {
            var stream = fs.createWriteStream(file)
            await this.writeToStream(stream)
            if (checkIntegrity) {
                let hash = hasha.fromFileSync(file, {algorithm: 'md5'})
                if (hash !== this.md5) {
                    throw new Error("Integrity check failed for:" + file + ` stream: ${this.stream}`)
                } 
            }
            return true;
        }

        cancel () {
            this._msg.peer._destCancelStream(msg.from, this.stream)
        }
        
    
 }

 