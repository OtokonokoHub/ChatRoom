var io = require('socket.io')();
var onlineUsers = {};

io.set('authorization', function(hand, callback){
    return callback(null, true);
});
io.on('connection', function(socket){
    onlineUsers[socket.id] = {};
    socket.on('addRoom', function(data){
        socket.join(data.roomName);
        onlineUsers[socket.id].roomName = data.roomName;
    });
    socket.on('disconnect', function(){
        if (onlineUsers.hasOwnProperty(socket.id)) {
            delete onlineUsers[socket.id];
            io.emit('logout', null);
        };
    });
    socket.on('message', function(obj, obj2){
        io.sockets.in(onlineUsers[socket.id].roomName).emit('message', obj);
    });
});
io.listen(3000);