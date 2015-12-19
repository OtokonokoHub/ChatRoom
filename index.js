var io          = require('socket.io')();
var cookie      = require('cookie');
var xss         = require('xss');
var mysql       = require('mysql');
var Memcached   = require('memcached');
var groups      = require('./groups.json');
var errCodes    = require('./error_code.json');
var mysqlConfig = require('./mysql.json');
var onlineUsers = {};
var xssOption   ={
    whiteList:{
        img:['src', 'alt'],
        a:['href', 'title']
    }
};
                                
io.set('authorization', function(socket, callback){
    var responseHead = socket.res._header;
    var socketId     = ;
    var memcached    = new Memcached('127.0.0.1:11211');
    var cookies      = cookie.parse(socket.headers.cookie);
    if (!cookies.hasOwnProperty('oto_sexy')) {
        return callback(null, false);
    };
    var ClientSession = cookies.oto_sexy;
    var ServerSession = memcached.get('memc.sess.key.' + ClientSession);
    if (!ServerSession || !ServerSession.hasOwnProperty('__id') || !ServerSession.hasOwnProperty('nick')) {
        if (!cookies.hasOwnProperty('_identity')) {
            return callback(null, false);
        };
        var IdentityCookie = cookies._identity;
        IdentityCookie = JSON.parse(IdentityCookie);
        if (IdentityCookie.length < 2) {
            return callback(null, false);
        };
        var connection = mysql.createConnection(mysqlConfig);
        var result     = false;
        var query      = connection.query('SELECT nick,id FROM `user` WHERE id = ? AND auth_key = ?', [IdentityCookie[0], IdentityCookie[1]], function(err, rows){
            if (err) {
                console.log(err);
                return callback(null, false);
            };
            if (rows.length == 1) {
                onlineUsers[socketId]      = {};
                onlineUsers[socketId].name = rows[0]['nick'];
                return callback(null, true);
            };
            return callback(null, false);
        });
        return;
    };
    onlineUsers[socketId] = {};
    onlineUsers[socketId].name = ServerSession.nick;
    return callback(null, true);
});
io.on('connection', function(socket){
    socket.on('addRoom', function(data){
        flag = false;
        for (var i = 0; i < groups.length; i++) {
            if (data.roomName === groups[i]) {
                flag = true;
                break;
            };
        };
        if (flag) {
            socket.join(data.roomName);
            onlineUsers[socket.id].roomName = data.roomName;
        }
        else{
            socket.emit('exp', errCodes['GROUP_NOT_FOUND']);
        }
    });
    socket.on('disconnect', function(){
        if (onlineUsers.hasOwnProperty(socket.id)) {
            delete onlineUsers[socket.id];
            io.emit('logout', null);
        };
    });
    socket.on('message', function(obj){
        if (
            !obj.hasOwnProperty('content')||
            obj.content == ''
            ) {
            socket.emit('exp', errCodes['NOT_CONTENT']);
            return false;
        };
        for (var key in obj) {
            obj[key] = xss(obj[key], xssOption);
        };
        obj.nick = onlineUsers[socket.id].name;
        io.sockets.in(onlineUsers[socket.id].roomName).emit('message', obj);
    });
});
io.listen(3000);