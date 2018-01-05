const nano = require('nanomsg');
const URL = require('url-parse');
const schedule = require('node-schedule');
const moment = require('moment');
const events = require('events');
const PrettyError = require('pretty-error');
const pe = new PrettyError();
const hasha = require('hasha');
const sortObject = require('sort-object-keys');
const fs = require('fs');
const path = require('path');


const peerLib = require("../lib/peerLib")
const awaitEventClass = require('../lib/awaitEvent.js');
const getUid = require("../lib/getUid")

const { Message } = require("./message")

exports.Peer = class Peer extends events.EventEmitter {
    
        constructor (name, address, options) {
            super(); //execute evenEmitter constructor

            //load external lib
            this.lib = new peerLib(this);

            //load configuration
            this.name = name;
            this.address = address;
            if (options.keys)  {
                this.keys = options.keys ? options.keys : []
                this.defaultKey = this.keys[0]
            }
            
            this.group = options.group ? options.group : ''
            this.portBus = options.portBus ? options.portBus : 5000
            this.portData = options.portData ? options.portData : 5001
            
            this.timeOut = options.timeOut ? options.timeOut : 6000

            this.priority = options.priority ? options.priority : 5
            
            //trhead workers
            this.workers = options.workers ? options.workers : 4

            //load public vars
            this.peers = {}; // current peer list
            this.conns = {}; //current direct connections
            this.streams = {};  //control the response for requests
            this.groups = {};  //control groups priorities
            this.loadBalance = {};  //control groups priorities

           
            //create sockets
            this.sockBus = false;
            this.sockData = nano.socket('pull');
            this.sockData.peer = this; //little hack to use in events
            
            let addr = this._getUrl(this.address, this.portData);
            try{
                this.sockData.bind(addr)
            }
            catch (e) {
                console.log(pe.render(e));
                return false;
            }
            this._handleDataConnection();
            this.status = 1

            //local utilities
            this.awaitEvent = new awaitEventClass(this, this.timeout)
        }

        _handleDataConnection() {
            var peer = this;
            //onData
            this.sockData.on("data", async (buff) => {
                let msg = new Message(peer);
                //DEGUG: console.log("handleData")
                //Receive message and parse
                try { 
                    await msg.loadMsg(buff)
                } catch (e) {
                    //cant send error back here
                    console.log(pe.render(e));
                    if (msg.uid && msg.from && msg.answer) {  //respondable message
                        //send response with error
                        msg.respond({ error:"Error loading message. Probaly are your keys.", data: e.toString()}, "ERROR", {error:true});
                    }
                    return false
                }
                
                //TREAT MESSAGE
                
                if (msg.params.system == true ) {
                    let result = false
                    result = result || peer.lib.handleSysMaster(msg);
                    result = result || peer.lib.handleSysPeer(msg);
                    if (!result) throw new Error("System message losted:" + JSON.stringify(msg))
                } else if (msg.params.stream == true )  {
                    let res = peer.lib.handleFiles(msg);
                } else if (msg.params.group == true )  {
                    peer.emit('groupmsg', msg);
                    //if (msg.answer === true && msg._responded === false) 
                    //    msg.deny({response: true}) //auto behaviour?? Se evento executar async, pode dar problema
                }
                    else {
                    if (msg.params.response) {
                        //returned from another requests
                        return peer.emit("RESPONSE:" + msg.uid, msg)
                    } else {
                        peer.emit('msg', msg);
                        //auto respond message if event does not
                        if (msg.answer === true && msg._responded === false) 
                            await msg.respond({autoResponse: true})
                        return true
                    }
                    
                }
            })

            //onOthers
            this.sockData.on("error", (err) => {
                console.log("-----------err:"+err.toString());
            })
            

        }

    
        async connect(addr) {
            this.master = false;
            this.sockBus = nano.socket('bus');
            var iThis = this;
           
           //connect and wait response
           var trigFunc = function () {
                iThis.sockBus.connect(addr)
                iThis._handleBusConnection()
           }
           var resultFunc = function (msg) {
                return true //send after registerd
           }

           try{
              let result = await this.awaitEvent.listen("connected", trigFunc, resultFunc)
              return result
           } catch (e) {
              console.log(pe.render(e));
              return false
           }

        }

        listen() {
            
           //master things
           this.master = true;
           this.peers[this.name] = this._getPeerInfo(); //first peer

            this.sockBus = nano.socket('bus');
            let addr = this._getUrl(this.address, this.portBus);
            try{
                this.sockBus.bind(addr)
            } catch (e) {
                console.log(pe.render(e));
                return false;
            }
           this._handleBusConnection()
           
           //master things
           this._scheduleEvents()

           return true;
        }

        _scheduleEvents() {
            var peer = this;
            
            //send peers and receive heartBeat
            var s1 = schedule.scheduleJob('0 * * * * *', function(){
                peer.lib.sysSendBus("PEERS", peer.peers)
            });

            //+ check old peers
            var s2 = schedule.scheduleJob('10 * * * * *', function(){
                let datTtl = moment().utc().add(-240, "seconds") //at least 4 heatbeats
                for (var i in peer.peers) {
                    //if expired
                    if (peer.peers[i].lastUpd < datTtl) {
                        delete peer.peers[i];
                    }
                }
            });

            //+ organize groups for load balance
            var s2 = schedule.scheduleJob('20 * * * * *', function(){
                var priorityGroups = {}
                for (var i in this.peers) {
                    let peer = this.peers[i];
                    if (!prioritGroups[peer.group]) prioritGroups[peer.group] = {};
                    if (!prioritGroups[peer.group][peer.priority]) prioritGroups[peer.group][peer.priority] = [];
                    prioritGroups[peer.group][peer.priority].push(peer)
                }
                
                //sort results inverse
                for (var i in priorityGroups) {
                    priorityGroups[i] = sortObject(priorityGroups[i], (keyA, keyB) => {
                        var a = parseInt(keyA.slice(4));
                        var b = parseInt(keyB.slice(4));
                        //return a - b; //verse
                        return b - a; //inverse
                    })
                }

                this.groups = priorityGroups;
            });

        }
        getBalancedPeer(group){
            var groupItem = this.groups[group]
            if (!groupItem) throw new Error("Group not found on load balance: " + group)
            
            //first step, start from zero
            if (!this.loadBalance[group]) {
                this.createCleanBalance(group);
                let pick = Object.keys(this.loadBalance[group])[0] //get first item from first priority
                if (!pick) throw new Error("Group withou peers: " + group)
                this.loadBalance[group][pick].count +=1
                return pick;
            }
            
            //get next in the line
            for (var pick in this.loadBalance[group]) 
            {   //run across groups and priorities
                let item =   this.loadBalance[group][pick];
                if (item.priority > item.count) {
                    item.count += 1;
                    return pick;
                }
            }
            
            //line exausted - start all over again
            this.createCleanBalance(group);
            let pick = Object.keys(this.loadBalance[group])[0] //get first item from first priority
            if (!pick) throw new Error("Group withou peers: " + group)
            this.loadBalance[group][pick].count +=1
            return pick;
            
        }
        createCleanBalance(group) {
            var groupItens = this.groups[group]
            if (!groupItens) throw new Error("Group not found on load balance: " + group)
            this.loadBalance[group] = {};
            for (var i in groupItem) 
            {   //run across groups and priorities
                for (var g in groupItem[i]) {
                    let item =  groupItem[i][g]
                    this.loadBalance[group][item.name] = {}
                    this.loadBalance[group][item.name].priority = item.priority;
                    this.loadBalance[group][item.name].count = 0;
                }
            }
        }

        _handleBusConnection() {
            var peer = this;
            //onData
            this.sockBus.on("data", (buff) => {
                let msg = new Message(peer);
                //DEGUG:console.log("handleBus")
                //can be a error on parsing, incorrect keys etc.
                try { 
                    msg.loadMsg(buff)
                } catch (e) {
                    //cant send error back here
                    console.log(pe.render(e));
                    return false;
                }
                
                if (msg.params.system === true ) {
                    let result = false
                    result = result || peer.lib.handleSysMaster(msg);
                    result = result || peer.lib.handleSysPeer(msg);
                    if (!result) throw new Error("System message losted:" + JSON.stringify(msg))
                } else {
                    //not system messages
                    peer.emit('busdata', msg);
                }
            })
            
            if (!this.master) //announce to master
                this.lib.sysSendBus("IN", this._getPeerInfo())

            this.status = 2
            
           return true;
        }

        disconnect(addr) {
            //send peer info to all 
            this.lib.sysSendBus("OUT", this._getPeerInfo())
            
            for (var i in this.conns) {
                this.conns[i].close;
            }
            this.sockBus.close
            this.sockData.close
            this.status = -1
            return true
        }

        hasConn(to) {
            if (this.conns[to]) return true
            else return false
        }

        getConn(to) {
            if (this.conns[to]) return this.conns[to]
            let peerInfo = this.peers[to]
            
            if (!peerInfo) {
                return false;
            }

            let addr = this._getUrl(peerInfo.address,peerInfo.portData);
            var newConn = nano.socket('push');
            
            try{
                //connect to pull port, wich receive from various nodes
                newConn.connect(addr);
            } catch (e) {
                console.log(pe.render(e));
                return false;
            }

            this.conns[to] = newConn;

            this.conns[to].on('close', function () {
                //closed connection
                delete this.conns[to];
                //remove peer into too?
            });
            this.conns[to].on('error', function (err) {
                //error con connection
                console.log(pe.render(err));
            });
            return newConn
        }
       
        createStream(to, uid, file) {
            let stats = fs.statSync(file);
            if (!stats.isFile()) throw new Error("Cant find file to create stream:" + file)
            
            let fileInfo = {}
            fileInfo.name = path.basename(file)
            fileInfo.size = stats.size
            fileInfo.createdDateUnix = stats.ctimeMs;
            fileInfo.updatedDateUnix = stats.mtimeMs;
            //change hash?? https://www.npmjs.com/package/murmurhash-native
            fileInfo.md5 = hasha.fromFileSync(file, {algorithm: 'md5'})
            fileInfo.stream = uid  // getUid(file)
            
            this.streams[fileInfo.stream] = {}
            this.streams[fileInfo.stream].fileInfo = fileInfo;
            this.streams[fileInfo.stream].fullName = file;
            this.streams[fileInfo.stream].to = to;

            return fileInfo;
        }

        _cancelStream(streamCode) {
            delete this.streams[streamCode]
        }
        _destCancelStream(to, streamCode) {
            let info = this.streams[streamCode];
            let msg = new Message(this, streamCode); //use streanCode in Uid
            msg.params.stream = true; //stream operations
            msg.send(to, "CANCEL", {stream: streamCode})
        }
        _destStartStream(to, streamCode) {
            let msg = new Message(this, streamCode); //use streanCode in Uid
            msg.params.stream = true; //stream operations
            msg.send(to, "START", {stream: streamCode})
        }

        //helper functions
        _getUrl(address, port) {
            let myURL = URL(address);
            myURL.set('port', port)
            return myURL.href;
        }
        _getPeerInfo() {
            let info = {}
            info.address = this.address
            info.portData = this.portData
            info.portBus = this.portBus
            info.name = this.name
            info.group = this.group
            info.master = this.master
            return info
       }
      
      
    
 }

 
