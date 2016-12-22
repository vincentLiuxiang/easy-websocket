var http      = require('http');
var fs        = require('fs');
var websocket = require('..');

var app = http.createServer(function (req,res) {
  fs.readFile('./index.html',function (err,data) {
    res.end(data)
  })
});

var ws = websocket(app)
  .on('connect',(msg) => {
    msg.on('data',(obj) => {
      console.log(obj.type);
      msg.send("hello world");
    })
  })

app.listen(3000);
