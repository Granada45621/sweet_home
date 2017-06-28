const http = require("http");
const path = require("path");

const socketio = require("socket.io");
const express = require("express");

const router = express();
const server = http.createServer(router);
const io = socketio.listen(server);

router.use(express.static(__dirname + '/client'));
var sockets = [];
var users = [];

// Classes
function Vector(x, y){
    this.x = x;
    this.y = y;
}
Vector.prototype.Clone = function(){
    return new Vector(this.x, this.y);
};

function Tile(wall){
    this.wall = wall;
    this.owner = {
        type : 'public',
        owner : ''
    };
}

var map = {
    main : [],
    size : new Vector(60, 40)
};
var text = {};
var Set = {};
var Func = {};

Func.Random = function( min, max ){
    return Math.floor( Math.random() * ( max - min ) ) + min;
};

Func.InMap = function( x, y ){
    if( x >= 0 && y >= 0 && x < map.size.x && y < map.size.y )
        return true;
    else
        return false;
};


// Socket
io.set('log level', 1);
io.on('connection', function (socket) {
    sockets.push(socket);

    var user = {
        name : false,
        vector : false
    };
    var no = false;

    socket.on('login', function (name) {
        user.name = name;
        user.vector = Set.UserVector();
        users.push(user);
        no = users.length-1;

        socket.emit('user-update', user);
        io.emit('update-users', { users : users });
        io.emit('update-map', { type: 'all', map : map });
        io.emit('update-text', { text : text });

        console.log(name+' Login');
    });

    socket.on('update', function(data){
        user = data;
        users[no] = data;

        //socket.emit('user-update', user);
        io.emit('update-users', { users : users });
    });

    socket.on('update-map', function(vec){
        var tile = map.main[ vec.y ][ vec.x ];

        if( tile.wall == '' ) tile.wall = 'wall';
        else tile.wall = '';

        io.emit('update-map', { type: '', vec: vec });
    });

    socket.on('update-map-public', function(vec){
        var tile = map.main[ vec.y ][ vec.x ];

        if( tile.owner.type == 'private' ) tile.owner.type = 'public';
        else tile.owner.type = 'private';

        io.emit('update-area', { vec: vec });
    });

    socket.on('update-text', function(data){
        var vector = data.vector;
        text[ vector.x+' '+vector.y ] = data;

        io.emit('update-text', { text : text });
    });

    socket.on('disconnect', function () {
        users.splice(users.indexOf(user), 1);
        sockets.splice(sockets.indexOf(socket), 1);

        io.emit('update-users', { users : users });
    });
});

Set.Map = function(){
    map.main = [];

    for(var y = 0; y < map.size.y; y++){
        map.main.push([]);

        for(var x = 0; x < map.size.x; x++){
            var wall = Math.random() > 0.6 ? 'wall' : '';
            map.main[y].push( new Tile( wall ) );
        }
    }
}

Set.UserVector = function(){
    while (true) {
        var vector = new Vector( Func.Random( 0, map.size.x ), Func.Random( 0, map.size.y ) );
        var tile = map.main[ vector.y ][ vector.x ];

        if( !( tile.wall ) ){
            return vector;
        }
    }
}

Set.Map();

server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
    var addr = server.address();
    console.log("Chat server listening at", addr.address + ":" + addr.port);
});
