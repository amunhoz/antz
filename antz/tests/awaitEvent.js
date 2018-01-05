
const EventEmitter  = require('events');

const myEE = new EventEmitter();
const awaitEventClass = require('../lib/awaitEvent.js');
const awaitE = new awaitEventClass(myEE, 5000)

var sleep = require('sleep-promise');
sync = require('promise-synchronizer')

sync(start("aaa"));
console.log("lalala");

async function start() {
    var trig = async function () {
        await sleep(2000);
        //myEE.emit("test","agora");
        throw new Error("danou-se")
        //return new Error("danou-se")
    }
    var ret = function (param) {
        console.log ("ouviu..." + param)
        return "retorno"
    }
    try {
        let result = await awaitE.listen("test", trig, ret)
        console.log("result: "+ result);
    } catch (e) {
        console.log("error detected");
        console.log(e.toString())
    }
    
    
    
}
