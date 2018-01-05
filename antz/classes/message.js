//external libs
const xxtea = require('xxtea-node');
const Pbf = require('pbf');
const compile = require('pbf/compile');
const schema = require('protocol-buffers-schema');
const snappy = require('snappyjs')
const pako = require('pako'); 
const hasha = require('hasha');
const syncPromise = require('promise-synchronizer')

const fs = require('fs');
const path = require('path');

const PrettyError = require('pretty-error');
const pe = new PrettyError();

const isBuffer = require('is-buffer')

//my libraries
const getUid = require("../lib/getUid")
const msgLib = require("../lib/messageLib")
const packetWorkClass = require('../lib/packetWork.js'); //not using napa for now
const packetWork = new packetWorkClass(4)

//my classes
const { streamMsg } = require("./streamMsg.js")

//variables
const protoScheme= schema.parse(fs.readFileSync(path.resolve(__dirname, "protocol.proto")) );
const proto = compile(protoScheme)


exports.Message =  
class  {
        constructor (peerObj, uid=false, timeout = 6000) {
            this.peer = peerObj;
            
            this.uid = uid;
            if (!this.uid || this.uid === "") this.uid = getUid(this.peer.name)
            
            this.to = false;
            this.from = false;
            this.to = false;
            this.type = false;
            this.compressed = true;
            this.data = false;
            this.file = false; //place for file info and stream

            this._msgType = false;
            this._received = false;
            this._responded = false;

            this.params = {
                denied: false,
                stream: false,
                fileOp: false,
                error: false,
                group: false,
                answer: false,
                response: false,
                system: false,
                bus: false
            }

            //response timeout
            this.timeout = timeout;
         
        }

        async loadMsg (buff) {
            if (this._msgType != false) throw new Error(`Class already initialized, create a new instance for a new message`)
            this._msgType = "received" 

            //read protocol
            var pbf = new Pbf(buff);
            var obj = proto.transfer.read(pbf);
            
            //assing values before to be used in error treatment
            this.cmd= obj.cmd;
            this.from = obj.from;
            this.type = obj.type;
            this.compressed = obj.compressed;
            this.uid = obj.uid;


            //custom to
            this.to = this.peer.name;

            this.params = msgLib.loadParam(obj.params)

            //get valid key
            let key = msgLib.findKey(this, obj.validate)
            
            if (key === false) {
                throw new Error(`Cant find correct key to parse the packet (uid: ${obj.uid}, from:${obj.from})` )
                return false
            }
            
            //decrypt if there is a key
            //if (key !="")               obj.data =  msgLib.decrypt(obj.data, key) //custom algoritim from peer??
            //if (obj.compressed )        obj.data = snappy.uncompress(obj.data) //custom compression from peer??
            //https://www.npmjs.com/package/node-zstd  (tentar zstd??)

            obj.data = await packetWork.inflate(obj.data, key, obj.compressed, obj.type) //napa multithread
            
            //DEGUG: console.log( obj.from + " => "+ this.peer.name )
            //DEGUG: console.log(Buffer.from(obj.data).toString('utf8'))


            if (obj.type =="o" )        this.data = JSON.parse(Buffer.from(obj.data).toString('utf8'))
            else if (obj.type =="t" )   this.data = obj.data.toString()
            else                        this.data = obj.data
                                   
            //check file stream
            if (this.params.file) {
                this.file = new streamMsg(this, this.data)
            }
            return true;
                        
        }
        async prepareMsg (data) {
            if (this._msgType != false) throw new Error(`Class already initialized, create a new instance for a new message`)
            this._msgType = "sended" 
            
            //get uid
            if (!this.uid || this.uid === "") this.uid = getUid(this.peer.name)
            
            //load new object
            let pObj = {};
            
            //custom from
            pObj.from = this.peer.name;
            
            //assing values before to be used in error treatment
            pObj.type = this.type;
            pObj.compressed = this.compressed;
            pObj.uid = this.uid;
            pObj.cmd = this.cmd;
            pObj.to = this.to;
            pObj.params = msgLib.resumeParam(this.params)

            //get compatible key
            var keyData =""
            if (this.to !="") {
                let pair = this.peer.getConn(this.to);
                if (pair && pair.key) {
                    keyData = pair.key;
                } else {
                    keyData = this.peer.defaultKey; //default key
                }
            } else {
                keyData = this.peer.defaultKey; //default key
            } 
            
            //create validation field
            //encrypt if there is a key
            if (keyData) pObj.validate =msgLib.encrypt(Buffer.from(keyData.validate), keyData.key)
            
            //put data in the place
            pObj.data = data
            
            //compress
            //if (pObj.compressed)  pObj.data = snappy.compress(pObj.data) 
            //encrypt data
            //if (keyData) pObj.data = msgLib.encrypt(pObj.data, keyData.key)
            
            pObj.data = await packetWork.deflate(pObj.data, keyData.key, pObj.compressed) //napa multithread
            

            //write obj
            let pbf = new Pbf();
            proto.transfer.write(pObj, pbf);
            return pbf.finish();
        }
        loadInfoTo (msg) {
            msg.params = this.params;
            msg.uid = this.uid;
            msg.compressed = this.compressed;
            msg.to = this.to;
            msg.cmd = this.cmd;
            msg.type = this.type;
            msg.from = this.from;
            msg.data = this.data;

        }
        getUid() {
            if (!this.uid || this.uid === "") this.uid = getUid(this.peer.name)
            return this.uid;
        }

        async send(to, cmd, obj, params = {}) {
            
            if (!(msgLib.isString(to) && msgLib.isString(cmd))) {
                throw new Error(`Parameters incorrect: to or cmd` )
            }

            this.to = to
            this.cmd = cmd;
            
            //auto detect data
            let data = this._convertToBuff(obj) 
            if (data===false) return false;
            //get direct connection
            let conn = this.peer.getConn(to);
            if (conn===false) return false

            this._loadParams(params)

            var msg = await this.prepareMsg(data)

            conn.send(msg)

            return true
        }
        
        async sendFile(to, cmd, file, extraInfo) {
            
            if (!(msgLib.isString(to) && msgLib.isString(cmd))) {
                throw new Error(`Parameters incorrect: to or cmd` )
            }
            

            let fInfo = this.peer.createStream(to, this.uid, file);
            fInfo.extra = extraInfo;
            
            this.cmd  = cmd;
            
            this.params.file = true; //has file in it

            //get direct connection
            let conn = this.peer.getConn(to);
            if (conn===false) return false

            let data = this._convertToBuff(fInfo) 
            var msg = await this.prepareMsg(data)
            conn.send(msg)
            return true

        }

        
        async sendWait(to, cmd, obj, params = {}) {
            this.to = to
            this.cmd = cmd;

            if (!(msgLib.isString(to) && msgLib.isString(cmd))) {
                throw new Error(`Parameters incorrect: to or cmd` )
            }

            //auto detect data
            let data = this._convertToBuff(obj)
            
            if (data===false) return false;
            //get direct connection
            let conn = this.peer.getConn(to);
            if (conn===false) return false

            this._loadParams(params)

            this.params.answer = true; //require answer to wait

            //message to send
            var msg = await this.prepareMsg(data)

            //send and await response
            var trigFunc = function () { conn.send(msg)  } //send msg after registerd via trigger
            var resultFunc = function (msg) { return msg } //return msg to the await listen

            var response 
            try{
                response = await this.peer.awaitEvent.listen("RESPONSE:" + this.uid, trigFunc, resultFunc)
            } catch (e) {
                console.log(pe.render(e));
                return false
            }
            return response
        }

        async respond(obj, cmd = 'RESPONSE', params = {}) {
            if (this._msgType != "received") throw new Error(`Message not received or different type`)
            if (this._responded == true ) throw new Error(`Message already responded`)
            if (this.params.answer == false ) throw new Error(`Message dont require answer`)
            
            if (!cmd) cmd = 'RESPONSE';

            let msg = new Message(this.peer, this.uid, this.timeout);
            if (!cmd) msg.cmd = "RESPONSE";
            
            if (params) {
                for (var i in params) {
                    msg.params[i] = params[i]
                }
            }
            
            
            msg.params.response = true;
            await msg.send(this.from, cmd, obj)
            this._responded = true
            
        }

        async deny(obj) {
            return await this.respond(obj, "DENIED", {denied: true})
        }
        
        
        async respondFile(file, extraInfo) {
            if (this._msgType != "received") throw new Error(`Message not received or different type`)
            if (this._responded == true ) throw new Error(`Message already responded`)
            if (this.params.answer == false ) throw new Error(`Message dont require answer`)

            let msg = new Message(this.peer, this.uid, this.timeout);
            msg.params.response = true;
            await msg.sendFile(this.from,"RESPONSE", file, extraInfo)
            this._responded = true
        }
        

        async sendMaster(cmd, obj) {
            if (this.master == true ) throw new Error(`You are the master.`)
            await _sendBus(cmd, obj);
        }

        async sendPeers(cmd, obj) {
            if (this.master == false ) throw new Error(`You are not the master.`)
            await _sendBus(cmd, obj);
        }

        _loadParams(params) {
            if (params) {
                for (var i in params) {
                    this.params[i] = params[i]
                }
            }
        }
        async _sendBus(cmd, obj, params = {}) {
            //auto detect data
            let data = this._convertToBuff(obj)
            if (data===false) return false;
            
            this._loadParams(params)
            
            this.params.bus = true
            
            this.cmd = cmd

            var msg = await this.prepareMsg(data)
            
            this.peer.sockBus.send(msg)
        }
        _convertToBuff (data) {
            //auto detect data
            if (!data) {
                return Buffer.from("",'utf8');
            } 

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
 }

 
 
 //declare class for local use
 const Message = exports.Message;
 