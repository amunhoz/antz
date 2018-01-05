var napa = require('napajs');
var zone = napa.zone.create('sample-zone', { workers: 4 });

var path = require('path');

const xxtea = require('xxtea-node'); 
const Pbf = require('pbf'); 
const compile = require('pbf/compile'); 
const schema = require('protocol-buffers-schema'); 
//const snappy = require('snappyjs'); 
const snappy = require('snappy'); 
const fs = require('fs');
var protoScheme = '';
var proto = '';

 protoScheme= schema.parse(fs.readFileSync(path.resolve(__dirname, "../classes/protocol.proto")) );
 proto = compile(protoScheme)

 //protoScheme= schema.parse(fs.readFileSync(path.resolve(__dirname, "../classes/protocol.proto")) );
 //proto = compile(protoScheme)

 var buffer = Buffer.from("aaaaaaaaaaaaaaaa")
 //compress
 //if (obj.compressed) {
   var data = snappy.compressSync(buffer);

//return
zone.broadcast(" \
      const fs = require('fs');\
      const xxtea = require('xxtea-node'); \
      const pako = require('pako'); \
")
function prepare (data, key, compress) {
  if (compress)  data = pako.deflate(data);
  if (key !="") data = xxtea.encrypt(data, xxtea.toBytes(key));
  return data;
}

function load (data, key, compressed, type) {
  if (key !="") data = xxtea.decrypt(data, xxtea.toBytes(key));
  if (compressed)  data = pako.inflate(data);
  if (type =="o" )        this.data = JSON.parse(Buffer.from(data).toString('utf8'));
  else if (type =="t" )   this.data = data.toString();
  return data;
}

zone.broadcast(prepare.toString());
zone.broadcast(load.toString());

//start test
start()
async function start () {
  var data = xxtea.toBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  
  var result = await zone.execute('','prepare', [data,'key', true])
  //var result2 = await zone.execute('','load', [result.value,'key', true, 't'])
  console.log(result.value);
  
  
  console.log("foi")
}
