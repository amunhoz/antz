var msgLib = require("../lib/messageLib")


let msg = {
    file: false,
    bus: false,
    error: true,
    group: false,
    answer: false,
    response: false
}

let num = msgLib.resumeParam(msg)
console.log(num)

let msg2 = {};
console.log(msgLib.resumeParam(msg2, num))
