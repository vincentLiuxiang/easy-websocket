var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');
var app = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});
var ws = websocket(app)
          .on('data',function (obj) {
            console.log(obj.type,obj.buffer.length);
          })
          .on('pong',function (text) {
            console.log('pong ...',text);
          })

// websocket
// app.on('upgrade',function (req,socket,head) {

//   var ws = websocket(socket)
//     .shakeHand(req)
//     .receiveFrame()
//     .on('data',function(obj){
//       switch(obj.type) {
//         case 'string':
//           ws.send(obj.buffer.toString());
//         break;
//         case 'binary':
//           ws.send(obj.buffer,'binary');
//         break;
//       }
//     })
//     .on('close',function(text){
//       console.log('close socket...',text);
//     })
//     .on('error',function(text){
//       console.log('error',text);
//     })
//     .on('pong',function(text){
//       console.log('pong ...',text);
//     })
//     .on('ping',function(text){
//       console.log('ping ...',text);
//     });

// })

app.listen(3001);
