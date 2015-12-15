var io = require('socket.io')();
var onlineUsers = {};
var onlineCount = 0;

io.set('authorization', function(hand, callback){
    console.log(hand.headers.cookie);
});
io.on('connection', function(socket, obj){
    socket.on('disconnect', function(){
        if (onlineUsers.hasOwnProperty(socket.name)) {
            var obj = {userId:socket.name, userName:onlineUsers[socket.name]};
            delete onlineUsers[socket.name];
            onlineCount--;
            io.emit('logout', {onlineUsers:onlineUsers, onlineCount:onlineCount, user:obj});
        };
    });
    socket.on('message', function(obj){
        io.emit('message', obj.content);
        console.log(obj.userName+'说：'+obj.content);
    });
});
io.listen(3000);