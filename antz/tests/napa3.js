
const packetWorkClass = require('../lib/packetWork.js'); 
const packetWork = new packetWorkClass(4)

const xxtea = require('xxtea-node'); 
class testNapa { //just calling it from a class to simulate the antz enviroment
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
  console.log("success")
}
