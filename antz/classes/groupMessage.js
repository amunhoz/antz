
const { Message } = require("./message")
const moment = require('moment');
exports.GroupMessage = class Peer extends Message {
        constructor (peerObj, uid=false, timeoutMsg = 3000, timeoutGroup = 30000) {
            super(peerObj, uid, timeoutMsg); //execute  constructor
            this.params.group = true
            this.timeoutGroup = timeoutGroup
        }
        async sendWait(toGroup, cmd, obj, params = {}) {
            this.to = to
            this.cmd = cmd;

            if (!(msgLib.isString(to) && msgLib.isString(cmd))) {
                throw new Error(`Parameters incorrect: to or cmd` )
            }

            //fill info
            let data = this._convertToBuff(obj)
            if (data===false) return false;
            this._loadParams(params)
            this.params.answer = true; //require answer to wait

            //message to send
            var msg = await this.prepareMsg(data)
                        

            // get peer round
            let peerOnce = this.getGroupPeer(toGroup);
            var keepGoing = true;
            var response
            var timeoutPassed = false

            var timeout = setTimeout(function(){ 
                keepGoing = false;
                timeoutPassed = true;
                response = false;
            }, this.timeoutGroup);
        
            
            do {
                let conn = this.peer.getConn(peerOnce);
                if (conn===false) continue; //no connection for to
                
                response = await this.getResp(msg);
                
                if (!response.params.denied) keepGoing = false;
                
                if (timeoutPassed) {//ops, timeout group
                    keepGoing = false
                    throw new Error("Response timeout for group "+ event)                    
                }
            } while (keepGoing)
            
            return response;
        }

        async getResp (msg) {
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

        getGroupPeer(group) {
            for (var i in this.peer.peers) {
                let peer = this.peer.peers[i];
                let groupList = {};
                if (peer.group == toGroup) {
                    groupList[i] = peer;
                }
            }
            //make load balance and priority calculation
        }





        async send(to, cmd, obj, params = {}) {
            throw new Error(`Not available in this class` )
        }

        async  sendFile(to, cmd, file, extraInfo) {
            throw new Error(`Not available in this class` )
        }
        async  sendFile(to, cmd, file, extraInfo) {
            throw new Error(`Not available in this class` )
        }

        async sendMaster(cmd, obj) {
            throw new Error(`Not available in this class` )
        }

        async sendPeers(cmd, obj) {
            throw new Error(`Not available in this class` )
        }

        async _sendBus(cmd, obj, params = {}) {
            throw new Error(`Not available in this class` )
        }
 }

 
