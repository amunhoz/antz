// test respondfile
const { Peer } = require("./antz")
const { Message } = require("./antz")

const peer = new Peer('test', 'tcp://127.0.0.1', {
  master: true,
  keys:[{key:'4545465465465', validate:'aaaaaaaaaaaaa'},{key:'454546546ssss5465', validate:'aaaaaaaaaaaaa'}],
  portBus:5000,
  portData:5001
}
);

const peer2 = new Peer('test2', 'tcp://127.0.0.1', {
  master: false,
  keys:[{key:'4545465465465', validate:'aaaaaaaaaaaaa'},{key:'454546546ssss5465', validate:'aaaaaaaaaaaaa'}],
  portBus:5002,
  portData:5003
}
);

start()


async function start() {
  //peer.connect("tcp://192.155.10.10:3000");
  peer.listen();

  peer2.on("msg", (msg)=> {
      if (msg.params.answer) {
        //msg.respond({responta:"i'll be back"},"RESP", {compressed:false})
        msg.respond({info1:"llaalala"})
      }
    }
  )
  await peer2.connect("tcp://127.0.0.1:5000");
  
  
  var ElapsedTime = require('elapsed-time')
  var et = ElapsedTime.new().start()
  console.log("started...")
  
  let msg = new Message(peer,false, 3000);
  msg.compressed = false;
  let result = await msg.sendWait('test2', "testcmd", {lala:"lulu"}, {compressed:false});
  console.log(result.data)

  console.log("ms:" + et.getValue())
  


/*
  for(var i = 0; i < 12;i++){
    let msg = new Message(peer,false, 3000);
    msg.compressed = false;
    let result = await msg.sendWait('test2', "testcmd", {lala:"lulu"}, {compressed:false});
    console.log(result);
    //if (i % 10000 == 0 ) console.log(i)
  }
  */
}















