var EventEmitter = require('events').EventEmitter;
var websocket = require('./websocket');
var http = require('http');


function Server (server,config) {
  this.server = server;
  this.config = config || {};
}

Server.prototype = Object.create(EventEmitter.prototype);
Server.prototype.constructor = Server;

Server.prototype.onUpgrade = function () {
  var self = this;
  self.server.on('upgrade', function (req,socket,head) {
    var ws = websocket(socket,self.config)
    ws.auth = self.auth;
    ws.on('connect',function (s) {
      self.emit('connect',s)
    })
    .shakeHand(req,socket)
    .receiveFrame();
  });
  return this;
}

module.exports = function (server,config) {
  return new Server(server,config).onUpgrade();
}