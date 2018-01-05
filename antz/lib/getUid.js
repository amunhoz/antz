'use strict';

module.exports = function (userId) 
{
    var moment = require('moment');
             
    var ByteBuffer = require("bytebuffer");
              
              var bFinal = new ByteBuffer(12).flip();
              
              //getting date bytes
              var iDate = parseInt(moment().utc().unix())
              //var bDate = new ByteBuffer(4).writeInt(iDate,0).reverse();
              var bDate = new ByteBuffer(4).writeInt(iDate,0);
              bDate.copyTo(bFinal, 0, 0, 4);
              
              //getting current user bytes
              var bUser = new ByteBuffer(4);
              
              var md5 = require('md5');
              bUser.fill(md5(userId),0,3);
              bUser.copyTo(bFinal, 4, 0, 4);
              
              
              // getting random bytes
              var bRand = new ByteBuffer(4);
              var Random = new Number(0);
              Random = parseInt(Math.random() * (2147483648 - moment().millisecond() ) )  ;
              bRand.fill(Random,0,3);
              bRand.copyTo(bFinal, 8, 0, 4);        
              var sourceString = bFinal.toBase64(0,12);
              var newString = '_'; //Math.random().toString(36).substring(7);
              var outString = sourceString.replace(/[`~!@#$%^&*()|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, newString);
                                  
             return outString; 

}