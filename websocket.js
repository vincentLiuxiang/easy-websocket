var util         = require('./util');
var EventEmitter = require('events').EventEmitter;
var MAGIC_STRING = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
var urlParse     = require('url').parse;


var WebSocket = function (socket,config) {
  this.socket        = socket;
  this.payloadBuffer = new Buffer(0);
  this.payloadData   = new Buffer(0);
  this.opcode        = null;
  this.payLoadLen    = null;
  this.start         = 6;
  this.isSameFrame   = false;
  this.waitContinual = false;
  this.config        = Object.assign({
    pingTimer:null,
    pingInterval:10000,
    enablePing:true,
    enablePong:true
  },config);
}

WebSocket.prototype = Object.create(EventEmitter.prototype);
WebSocket.prototype.constructor = WebSocket;

WebSocket.prototype.defaultAuth = function (req) {
  if (!req.headers.origin) {
    return 'origin header is not exist';
  }

  if (!req.headers.host) {
    return 'host header is not exist';
  }

  var host = urlParse(req.headers.origin).host;

  if (host !== req.headers.host) {
    return 'Origin: ' + req.headers.origin + ' 403 forbidden\n'
  }

  return false
}

WebSocket.prototype.shakeHand = function (req) {
  var noAuth = this.auth ? this.auth(req) : this.defaultAuth(req);
  if (noAuth) {
    this.socket.end(noAuth);
    return this;
  }

  // sec-websocket-key not exist
  if (!req.headers['sec-websocket-key']) {
    this.socket.end('sec-websocket-key header is not exist');
    return this;
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

  this.emit('connect',this);
  return this;
}

WebSocket.prototype.receiveFrame = function () {
  if (this.socket.readyState !== 'open') {
    return ;
  }
  var self = this;
  this.socket.on('data',function (buf) {
    self.payloadBuffer = Buffer.concat(
      [self.payloadBuffer,buf],
      self.payloadBuffer.length + buf.length
    );
    setImmediate(function () {
      self.decodeFrame()
    })
  });

  if (this.config.enablePing) {
    this.startPing();
  }

  return this;
}

WebSocket.prototype.startPing = function () {
  var self = this;
  this.config.pingTimer = setInterval(function () {
    if (self.socket.readyState !== 'open') {
      return self.clearPing();
    }
    self.ping();
  }, this.config.pingInterval);
}

WebSocket.prototype.clearPing = function () {
  clearTimeout(this.config.pingTimer);
  this.config.pingTimer = null;
}

WebSocket.prototype.proccessFrame = function () {
  switch (this.opcode) {
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
  }
  this.payloadData = new Buffer(0);
  return true;
}

WebSocket.prototype.code = function() {
  var firstByte  = this.payloadBuffer[0];
  var secondByte = this.payloadBuffer[1];

  this.FIN         = firstByte >> 7;
  this.RSV         = firstByte & 0x70;
  this.hasMask     = secondByte >> 7;
  this.payLoadLen  = secondByte & 0x7f;
  this.start       = 6;

  if (!this.waitContinual) {
    this.opcode = firstByte & 0x0f;    
  }

  if (this.RSV) {
    return new Error('RSV1/2/3 must be 0');
  }

  if (this.opcode >= 8 ) {
    if(!this.FIN) {
      return new Error('Control frames must not be fragmented');
    }
    // close socket frame payload legnth must be less than 125
    if(this.payLoadLen > 125){
      return new Error('Close socket frame payload legnth must be less than 125')
    }
  }

  // Frames sent by clients must be masked
  if (!this.hasMask) {
    return new Error('Miss mask key');
  }

  // Get the actual payload length
  if (this.payLoadLen === 126) {
    this.payLoadLen = this.payloadBuffer.readUInt16BE(2)
    this.start += 2;
  } else if (this.payLoadLen === 127) {
    this.payLoadLen = this.payloadBuffer.readUIntBE(2,8)
    this.start += 8;
  }

  return null
}

// decode frames
WebSocket.prototype.decodeFrame = function () {
  if (this.payloadBuffer.length < 2) {
    return false;
  }

  if (!this.isSameFrame) {
    this.isSameFrame = true;    
    var err = this.code();
    if (err) {
      return this.error(err)
    }
  }
  
  // Not enough data in the buffer,waiting
  if (this.payloadBuffer.length < this.start + this.payLoadLen) {
    return false;
  }

  var payload = this.payloadBuffer.slice(this.start, this.start + this.payLoadLen)
  // if (hasMask) {
  // Decode with the given mask
  var mask = this.payloadBuffer.slice(this.start - 4, this.start);
  var payloadDataLen = payload.length;
  for (i = 0; i < payloadDataLen; i++) {
    payload[i] ^= mask[i % 4]
  }
  // }

  // Concat payload data
  this.payloadData = Buffer.concat(
    [this.payloadData,payload], this.payloadData.length + payload.length
  );

  // Clear handled frame
  this.payloadBuffer = this.payloadBuffer.slice(this.start + this.payLoadLen);

  // Current frame finshed
  this.isSameFrame = false;

  // Handle the !FIN frame
  if (!this.FIN) {
    var self = this;
    // FIN === 0, wait for More Continue Frame
    this.waitContinual = true;
    setImmediate(function () {
      self.decodeFrame()
    })
    return
  }

  // FIN === 1, no More Continue Frame
  this.waitContinual = false;
  // Last frame accepted
  this.proccessFrame();
}

// encode text / binary data
WebSocket.prototype.encodeFrame = function (FIN,opcode,payloadData) {
  var frameHead = [];

  if (!payloadData) {
    payloadData = ''
  }

  if (!Buffer.isBuffer(payloadData)) {
    payloadData = new Buffer(payloadData);
  }
  var l = payloadData.length;

  frameHead.push((FIN << 7) + opcode);

  if (l < 126) {
    frameHead.push(l);
  } else if (l < 0x10000) {
    frameHead.push(126, (l & 0xFF00) >> 8,l & 0xFF);
  } else {
    frameHead.push( 127, 0, 0, 0, 0,
      (l&0xFF000000)>>24,(l&0xFF0000)>>16,(l&0xFF00)>>8,l&0xFF
    );
  }
  return Buffer.concat([new Buffer(frameHead), payloadData]);
};

WebSocket.prototype.ping = function (data) {
  this.socket.write(this.encodeFrame(1,9,data));
}

WebSocket.prototype.pong = function (data) {
  this.socket.write(this.encodeFrame(1,0x0a,data));
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
  return this;
}

WebSocket.prototype.error = function (error) {
  this.end(error.message);
  this.emit('error', error);
}

module.exports = function (socket,config) {
  return new WebSocket(socket,config);
}