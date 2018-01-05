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
      const path = require('path');\
      const xxtea = require('xxtea-node'); \
      const Pbf = require('pbf'); \
      const compile = require('pbf/compile'); \
      const schema = require('protocol-buffers-schema'); \
      const pako = require('pako'); \
      var testxxx = 'lalalalala';\
")
var filep = path.resolve(__dirname, "../classes/protocol.proto").split("\\").join("/");
zone.broadcast(" \
    var protoScheme= schema.parse(fs.readFileSync('"+filep+"')); \
    var proto = compile(protoScheme);\
")

function prepare (obj, key) {
  if (obj.compressed)  obj.data = pako.deflate(obj.data);
  if (key !="") obj.data = xxtea.encrypt(obj.data, xxtea.toBytes(key));
  let pbf = new Pbf();
  proto.transfer.write(obj, pbf);
  return pbf.finish();
}

function load (buff, key) {
  var pbf = new Pbf(buff);
  var obj = proto.transfer.read(pbf);
  if (key !="") obj.data = xxtea.decrypt(obj.data, xxtea.toBytes(key));
  if (obj.compressed)  obj.data = pako.inflate(obj.data);
  if (obj.type =="o" )        this.data = JSON.parse(Buffer.from(obj.data).toString('utf8'));
  else if (obj.type =="t" )   this.data = obj.data.toString();
  else                        this.data = obj.data;
  for (let i in obj) {
    if (obj[i] === null) obj[i] =false;  //prevent error returning the object
  }
  return obj;
}

zone.broadcast(prepare.toString());
zone.broadcast(load.toString());

//start test
start()
async function start () {
  let pObj = {};
  pObj.compressed = true;
  pObj.type = 't';
  //pObj.validate =xxtea.toBytes("aa")
  pObj.data = xxtea.toBytes("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa")
  var result = await zone.execute('','prepare', [pObj,'key'])
  var result2 = await zone.execute('','load', [result.value,'key'])
  console.log(result2.value);
  console.log("foi")
}

function stringToUint8Array (source) {
  var arrayBuffer = new ArrayBuffer(source.length * 2)
  var view = new Uint16Array(arrayBuffer)
  var i
  for (i = 0; i < source.length; i++) {
    view[i] = source.charCodeAt(i)
  }
  return new Uint8Array(arrayBuffer)
}