var http         = require('http');
var util         = require('./util');
var EventEmitter = require('events').EventEmitter;
var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';


var WebSocket = function (socket,config) {
  this.socket        = socket;
  this.payloadBuffer = new Buffer(0);
  this.payloadData   = new Buffer(0);
  this.opcode        = null;
  this.config        = Object.assign(
    {
      pingTimer:null,
      pingInterval:10000,
      enablePing:true,
      enablePong:true
    },
    config
  );
}
WebSocket.prototype = Object.create(EventEmitter.prototype);
WebSocket.prototype.constructor = WebSocket;

WebSocket.prototype.shakeHand = function(req) {

  req.headers = req.headers || {};

  // origin 头 不存在
  if (!req.headers.origin) {
    return this.end('origin header is not exist');
  }

  // sec-websocket-key 头 不存在
  if (!req.headers['sec-websocket-key']) {
    return this.end('sec-websocket-key header is not exist');
  }

  this.socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: WebSocket\r\n' +
    'Connection: Upgrade\r\n' +
    'Sec-WebSocket-Accept:' + util.getSecWebSocketAccept(
      req.headers['sec-websocket-key']+MAGIC_STRING
    ) + '\r\n' +
    ( req.headers['sec-websocket-protocol'] ?
      'Sec-Websocket-Protocol:' + req.headers['sec-websocket-protocol'] + '\r\n'
      : ''
    ) +
    '\r\n'
  );

  return this;
}

WebSocket.prototype.receiveFrame = function () {

  if (this.socket.readyState !== 'open') {
    return ;
  }

  this.socket.on('data',(buf) => {
    this.payloadBuffer = Buffer.concat(
      [this.payloadBuffer,buf],
      this.payloadBuffer.length + buf.length
    );
    process.nextTick(this.decodeFrame.bind(this));
  });

  if (this.config.enablePing) {
    this.startPing();
  }

  return this;
}

WebSocket.prototype.onUpgrade = function () {
  if (!(this.socket instanceof http.Server)) {
    return this;
  }
  var server = this.socket ;
  server.on('upgrade', (req,socket,head) => {
    this.socket = socket;
    this.shakeHand(req).receiveFrame();
  });
  return this;
}

// WebSocket.prototype
WebSocket.prototype.startPing = function () {
  this.config.pingTimer = setInterval(() => {
    if (this.socket.readyState !== 'open') {
      return this.clearPing();
    }
    this.ping();
  }, this.config.pingInterval);
}

WebSocket.prototype.clearPing = function () {
  clearTimeout(this.config.pingTimer);
  this.config.pingTimer = null;
}

WebSocket.prototype.proccessFrame = function (fin,opcode) {

  if(!fin){
    return ;
  }

  this.opcode = null;

  switch (opcode) {
    // text frame
    case 0x01 :
      this.emit('data',{type:'string',buffer:this.payloadData});
    break;
    // binary frame
    case 0x02 :
      this.emit('data',{type:'binary',buffer:this.payloadData});
    break;
    // close socket
    case 0x08 :
      this.end('client close socket');
    break;
    // ping
    case 0x09 :
      this.emit('ping',this.payloadData);
      if (this.config.enablePong){
        this.pong(this.payloadData);
      }
    break;
    // pong
    case 0x0a :
      this.emit('pong',this.payloadData.toString());
    break;
    default:;
  }
  this.payloadData = new Buffer(0);
  return true;

}

// decode frames
WebSocket.prototype.decodeFrame = function () {

  if (this.payloadBuffer.length < 2) {
    return false;
  }

  var firstByte  = this.payloadBuffer[0];
  var secondByte = this.payloadBuffer[1];

  var FIN        = firstByte >> 7;
  var RSV        = firstByte & 0x70;
  var opcode     = firstByte & 0x0f;
  var hasMask    = secondByte >> 7;
  var payLoadLen = secondByte & 0x7f;
  var start      = 6;

  if (!this.opcode) {
    //the first opcode decide the datagram's opcode if opcode is 0x00
    this.opcode = opcode;
  }

  if(RSV) {
    return this.error(new Error('RSV1/2/3 must be 0'));
  }

  if (opcode >= 8 ) {
    if(!FIN) {
      return this.error(new Error('Control frames must not be fragmented'));
    }
    // close socket frame payload legnth must be less than 125
    if(payLoadLen > 125){
      return this.error(
        new Error('close socket frame payload legnth must be less than 125')
      );
    }
  }

  // Frames sent by clients must be masked
  if (!hasMask) {
    this.end();
    return this.error(new Error('miss mask key'));
  }

  // Not enough data in the buffer,waiting
  if (this.payloadBuffer.length < start + payLoadLen) {
    return false;
  }

  // Get the actual payload length
  if (payLoadLen === 126) {
    payLoadLen = this.payloadBuffer.readUInt16BE(2)
    start += 2;
  }
  else if (payLoadLen === 127) {
    payLoadLen = (
      // this.payloadBuffer.readUInt32BE(2) * Math.pow(2, 32) +
      this.payloadBuffer.readUInt32BE(6)
    )
    start += 8;
  }
  // Not enough data in the buffer,waiting
  if (this.payloadBuffer.length < start + payLoadLen) {
    return false;
  }

  var payload = this.payloadBuffer.slice(start, start + payLoadLen)
  if (hasMask) {
    // Decode with the given mask
    var mask = this.payloadBuffer.slice(start - 4, start)
    var payloadDataLen = payload.length;
    for (i = 0; i < payloadDataLen; i++) {
      payload[i] ^= mask[i % 4]
    }
  }

  // concat payload data
  this.payloadData = Buffer.concat(
    [this.payloadData,payload], this.payloadData.length + payload.length
  );

  // Clear handled frame
  this.payloadBuffer = this.payloadBuffer.slice(start + payLoadLen);


  // handle the last frame
  // if(this.payloadBuffer.length && !FIN){
  process.nextTick(this.decodeFrame.bind(this))
  // }

  // last frame accepted
  this.proccessFrame(FIN,opcode || this.opcode,payload);

}

// encode text / binary data
WebSocket.prototype.encodeFrame = function(FIN,opcode,payloadData){
  var frameHead = [];
  if(!Buffer.isBuffer(payloadData)){
    payloadData = new Buffer(payloadData);
  }
  var l = payloadData.length;

  frameHead.push((FIN << 7) + opcode);

  if(l < 126) {
    frameHead.push(l);
  } else if(l < 0x10000) {
    frameHead.push(126, (l & 0xFF00) >> 8,l & 0xFF);
  } else {
    frameHead.push( 127, 0, 0, 0, 0,
      (l&0xFF000000)>>24,(l&0xFF0000)>>16,(l&0xFF00)>>8,l&0xFF
    );
  }
  return Buffer.concat([new Buffer(frameHead), payloadData]);
};

WebSocket.prototype.ping = function (data) {
  this.socket.write(this.encodeFrame(1,9,data||''));
}

WebSocket.prototype.pong = function (data) {
  this.socket.write(this.encodeFrame(1,0x0a,data||''));
}

WebSocket.prototype.send = function (data,opcode) {

  if (!opcode || opcode === 'text') {
    opcode = 1;
  }

  if (opcode === 'binary') {
    opcode = 2;
  }

  if ([1,2].indexOf(opcode) === -1) {
    throw new Error('send frame opcode must be 0x01 or 0x02');
  }

  this.socket.write(this.encodeFrame(1,opcode,data));
}

WebSocket.prototype.end = function (text) {
  this.emit('close',text);
  this.socket.end();
}

WebSocket.prototype.error = function (text) {
  this.end(text);
  this.emit('error', new Error(text));
}

module.exports = function (socket,config) {
  return new WebSocket(socket,config).onUpgrade();
}

