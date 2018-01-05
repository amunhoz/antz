// ======================================
// NOT USED BY NOW
// ======================================
var napa = require('napajs');


function startZone(workers) {
    var zone  = napa.zone.create('packetWorker', { workers: workers });
    zone.broadcast(" \
                    const fs = require('fs');\
                    var xxtea = require('xxtea-node'); \
                    const pako = require('pako'); \
                    ")
    zone.broadcast(deflateFunc.toString());
    zone.broadcast(inflateFunc.toString());
    return zone

}


function myLib(workers) {
    this.zone = startZone(workers)
};

myLib.prototype.deflate = async function (data, key, compress)  {
    var result = await this.zone.execute('','deflateFunc', [data, key, compress])
    return result.value;
};

myLib.prototype.inflate = async function (data, key, compressed, type)  {
    var result = await this.zone.execute('','inflateFunc', [data, key, compressed, type])
    return result.value;
};

function deflateFunc(data, key, compress) {

    if (compress)  data = pako.deflate(data);    
    if (key !="") data = xxtea.encrypt(data, xxtea.toBytes(key));

    return data;
  }
  
function inflateFunc (data, key, compressed, type) {

    var result = false
    if (key !="")           data = xxtea.decrypt(data, xxtea.toBytes(key));
    if (compressed)         data = pako.inflate(data);
    if (type =="o" )        data = JSON.parse( xxtea.toString(data) );
    else if (type =="t" )   data = data.toString();
    if (data == null) return false;
    return data;
}

module.exports = myLib;