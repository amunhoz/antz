
const EventEmitter  = require('events');

const myEE = new EventEmitter();
const awaitEventClass = require('../lib/awaitEvent.js');
const awaitE = new awaitEventClass(myEE, 5000)

var sleep = require('sleep-promise');

start("aaa");


async function start() {
    var trig = async function () {
        await sleep(2000);
        myEE.emit("progressEvent",1);
        await sleep(2000);
        myEE.emit("progressEvent",2);
        await sleep(2000);
        myEE.emit("progressEvent",3);
        
        await sleep(2000);
        myEE.emit("endEvent","agora");
        //throw new Error("danou-se")
        //return new Error("danou-se")
    }
    var progress = function (info) {
        console.log ("progress..." + info)
    }
    var end = function (param) {
        console.log ("final..." + param)
        return "retorno"
    }

    try {
        let result = await awaitE.listenProgress("progressEvent", "endEvent", trig, progress, end)
        console.log("result: "+ result);
    } catch (e) {
        console.log("error detected");
        console.log(e.toString())
    }
    
    
    
}
