var io          = require('socket.io')();
var xss         = require('xss');
var Memcached   = require('memcached');
var groups      = require('./groups.json');
var errCodes    = require('./error_code.json');
var onlineUsers = {};
var xssOption   ={
    whiteList:{
        img:['src', 'alt'],
        a:['href', 'title']
    }
};
                                
io.set('authorization', function(socket, callback){
    var memcached   = new Memcached('127.0.0.1:11211');
    var session = memcached.get('aaa');
    console.log(session);
    return callback(null, true);
});
io.on('connection', function(socket, callback){
    onlineUsers[socket.id] = {};
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
        io.sockets.in(onlineUsers[socket.id].roomName).emit('message', obj);
    });
});
io.listen(3000);