const PrettyError = require('pretty-error');
const pe = new PrettyError();
const moment = require('moment');


function myLib(eventClass, timeout) {
    this.events = eventClass;
    this.timeout = timeout ? timeout : 3000
};

myLib.prototype.listen = function (event, triggerFunc, returnFunc)  {
    var events = this.events;
    var timeoutMs = this.timeout;
    
    return new Promise( async function (resolve, reject) {

        var justOut = false //control execution

        var timeout = setTimeout(function(){ 
            if (justOut) return;
            justOut = true;
            console.log ("timeout..." + timeout)
            reject(new Error("Response timeout for "+ event)) 
        }, timeoutMs);
        
        var funcEvent = async function (param1, param2, param3) {
            if (justOut) return;
            justOut = true;
            //response came
            clearTimeout(timeout); //clear timeout
            let result = false
            if (returnFunc) result = await returnFunc(param1, param2, param3)
            resolve(result); //send the response
        }
        //wait for resopnse
        events.once(event, funcEvent)
        
        //trigger action
        if (triggerFunc) {
            try {
                let result = await triggerFunc()
            } catch (e) {
                justOut = true;
                clearTimeout(timeout); //clear timeout
                events.removeListener(event, funcEvent)
                reject(e) 
            }

        }
    })

};



myLib.prototype.listenProgress = function (eventProgress, event, triggerFunc, progressFunc, endFunc)  {
    var events = this.events;
    var timeoutMs = this.timeout;
    var lastUpd = moment().utc().unix();
    return new Promise( async function (resolve, reject) {

        var justOut = false //control execution

        var timeout = setInterval(function(){             
            if (lastUpd + timeoutMs < moment.utc().unix()) {
                //timeout pass
                if (justOut) {
                    clearInterval(timeout);
                    return;
                }
                justOut = true;
                reject(new Error("Response timeout for " + eventProgress + "/" + event)) 
            }
 
        }, timeoutMs);
        
        var funcEvent = async function (param1, param2, param3) {
            if (justOut) { 
                return;   //things done, get out
            }
            justOut = true;
            let result = false
            if (endFunc) result = await endFunc(param1, param2, param3)
            resolve(result); //send the response
        }
        //wait for resopnse
        events.once(event, funcEvent)

        var funcProgress = async function (param1, param2, param3) {
            if (justOut) {
                events.removeListener(eventProgress, funcProgress)
                return;   //things done, get out
            }
            lastUpd = moment().utc().unix();
            if (progressFunc) result = await progressFunc(param1, param2, param3)
        }
        //wait for progress event
        events.on(eventProgress, progressFunc)
        
        //trigger action
        if (triggerFunc) {
            try {
                let result = await triggerFunc()
            } catch (e) {
                justOut = true;
                clearTimeout(timeout); //clear timeout
                events.removeListener(event, funcEvent)
                reject(e) 
            }

        }
    })

};

module.exports = myLib;