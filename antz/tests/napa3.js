const packetWork = require('../lib/packetWork.js');
const xxtea = require('xxtea-node'); 
class testNapa {
  constructor () {

  }
  async test () {
    var data = xxtea.toBytes(JSON.stringify({A:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}))
    var result = await packetWork.deflate(data,'llalalal', true)
    var result2 = await packetWork.inflate(result,'llalalal', true, 'o')
    
    console.log(result2);
  }
}
//start test
start()
async function start () {
  var data = new testNapa();
  await data.test();
  console.log("foi")
}
