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
    var memcached   = new Memcached('127.0.0.1:11211');
    var cookies = cookie.parse(socket.headers.cookie);
    if (!cookies.hasOwnProperty('oto_sexy')) {
        return callback(null, false);
    };
    var ClientSession = cookies.oto_sexy;
    var ServerSession = memcached.get('memc.sess.key.' + ClientSession);
    if (!ServerSession || !ServerSession.hasOwnProperty('__id') || !ServerSession.hasOwnProperty('username')) {
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
        var query      = connection.query('SELECT username,id FROM `user` WHERE id = ? AND auth_key = ?', [IdentityCookie[0], IdentityCookie[1]], function(err, rows){
            console.log();
            return callback(null, true);
            if (err) {
                console.log(err);
                return;
            };
            if (rows.length == 1) {
                onlineUsers[rows[0]['id']]      = {};
                onlineUsers[rows[0]['id']].name = rows[0]['username'];
                return callback(rows[0]['id'], true);
            };
            return callback(null, false);
        });
        return;
    };
    onlineUsers[ServerSession.__id] = {};
    onlineUsers[ServerSession.__id].name = ServerSession.username;
    return callback(ServerSession.__id, true);
});
io.on('connection', function(socket){
    return;
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
            console.log(onlineUsers[socket.__id]);
            onlineUsers[socket.__id].roomName = data.roomName;
        }
        else{
            socket.emit('exp', errCodes['GROUP_NOT_FOUND']);
        }
    });
    socket.on('disconnect', function(){
        if (onlineUsers.hasOwnProperty(socket.__id)) {
            delete onlineUsers[socket.__id];
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
        obj.userName = onlineUsers[socket.__id].name;
        io.sockets.in(onlineUsers[socket.__id].roomName).emit('message', obj);
    });
});
io.listen(3000);