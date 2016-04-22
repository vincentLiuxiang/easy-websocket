var crypto  = require('crypto');


var Util = function () {};

Util.prototype.getSecWebSocketAccept = function (text) {
  var sha1 = crypto.createHash('sha1');
  return sha1.update(text).digest('base64');
}

module.exports = new Util();
