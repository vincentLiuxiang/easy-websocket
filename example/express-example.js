var app       = require('express')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');

app.use(function (req,res,next) {
  console.log(req.url);
  next();
});

app.use(function (req,res,next) {
  if(!/^\/(index\.htm)?l?$/.test(req.url)){
    return next();
  }
  fs.readFile('./index.html',function (err,data) {
    res.end(data);
  })
});

var server = http.Server(app);

var ws = websocket(server)
  .on('data',function (obj) {
    console.log(obj.type,obj.buffer.length);
  })
  .on('pong',function (text) {
    console.log('pong ...',text);
  })

// websocket
// server.on('upgrade',function (req,socket,head) {
//   var ws = websocket(socket)
//     .shakeHand(req)
//     .receiveFrame()
//     .on('data',function(obj){
//       console.log(obj.type,obj.buffer.length);
//       switch(obj.type) {
//         case 'string':
//           ws.send(obj.buffer.toString());
//         break;
//         case 'binary':
//           ws.send(obj.buffer,'binary');
//         break;
//       }
//     });
// })

server.listen(3000);