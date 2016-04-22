var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('../index');

// app.use(...)
// app.use(...)
// app.use(...)

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

// websocket
server.on('upgrade',function (req,socket,head) {
  var ws = websocket(socket)
    .shakeHand(req)
    .receiveFrame()
    .on('data',function(obj){
      console.log(obj.type,obj.buffer.length);
      switch(obj.type) {
        case 'string':
          ws.send(obj.buffer.toString());
        break;
        case 'binary':
          ws.send(obj.buffer,'binary');
        break;
      }
    });
})

server.listen(3000);