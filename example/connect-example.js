var app       = require('connect')();
var http      = require('http');
var fs        = require('fs');
var websocket = require('..');

app.use(function (req,res,next) {
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

websocket(server)
.on('connect',(ws) => {
  ws.on('data',(obj) => {
    console.log(obj.type);
    ws.send("hello world");
  })
})

server.listen(3000);