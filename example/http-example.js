var http      = require('http');
var fs        = require('fs');
var websocket = require('..');

var server = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});

var wsServer = websocket(server)
  .on('connect',(ws) => {
    ws.on('data',(obj) => {
      console.log(obj.type);
      ws.send("hello world");
    })
  })

server.listen(3000);
