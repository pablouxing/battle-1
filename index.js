const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

var players = {};
var planets = n => [...Array(n)].map(() => new Planet());

var game_width = 1920;
var game_height = 1000;

const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

function isOutside(a) {
    return (a.x > game_width 
        || a.x < 0 
        || a.y > game_height 
        || a.y < 0)
}

function getDistance(a,b) {
    var x = a.x - b.x;
    var y = a.y - b.y;
    var c = Math.sqrt( (x*x) + (y*y) );
    return c
}

class Soldier {

    constructor(owner){
        this.x = Math.random() * 1000;
        this.y = Math.random() * 500;
        this.vel = 0;
        this.deg = 0;
        this.r = 15;
        this.color = "#" + genRanHex(6);
        this.bullets = [];
        this.health = 100;
        this.owner = owner;
    }

    shoot = () => {
        this.bullets.push(new Bullet(this.x,this.y,this.deg,this.owner,this.bullets.length))
    }

    update = () => {

        if (isOutside(this)){
            this.vel = (this.vel*-1);
        }

        if (this.health < 0) {
            this.x = 20000;
        }

        if (this.vel == 0) return;
        var aux = this.deg 
        this.x += Math.cos(aux) * this.vel;
        this.y += Math.sin(aux) * this.vel;
    }
    
    destroy = () => {
        delete players[this.owner];
    }

}

class Bullet {
    constructor(x,y,deg,owner,id){
        this.id = id;
        this.x = x + Math.cos(deg)*25;
        this.y = y + Math.sin(deg)*25;
        this.r = 2;
        this.deg = deg;
        this.vel = players[owner].vel + 1;
        this.owner = owner;
    }
    update = () => {

        if (isOutside(this)) {
            this.destroy();
            return;
        }

        for(player in players) {
            if (this.owner != player && getDistance(this,players[player]) < players[player].r) {
                players[player].health -= 20;
                this.destroy();
                return;
            }
            
        }
        
        this.x += Math.cos(this.deg) * 2 * this.vel
        this.y += Math.sin(this.deg) * 2 * this.vel
    }
    destroy = () => {
        players[this.owner].bullets = players[this.owner].bullets.filter(b => b.id != this.id)
    }
}

class Planet {
    constructor() {
        this.x = Math.random() * game_width;
        this.y = Math.random() * game_height;
        this.r = 20 + Math.random() * 100;
        this.color = "#" + genRanHex(6);
    }

    update = () => {
        
        for (player in players) {

            let p = players[player];

            if (getDistance(this,p) < this.r) {
                
                p.bullets.forEach((b) => {
                    if (getDistance(this,b) < this.r) {
                        b.destroy();
                    }
                })

                p.destroy();
            }
        }

           
        
        
    }
}

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    console.log('a user connected');
   
    players[socket.id] = new Soldier(socket.id);

    io.emit('player:create', { id: socket.id, game_width: game_width, game_height: game_height, planets: planets })
    
    

    socket.on('keypressed', data => {

        //right
        if(data.keycode == 39) {
            players[data.id].deg += Math.PI/18;
        }
        //left
        if(data.keycode == 37) {
            players[data.id].deg -= Math.PI/18;
        }
        //down
        if(data.keycode == 40) {
            players[data.id].vel = 1;
        }
        if(data.keycode == 38) {
            players[data.id].vel = 3;
        }
        
        if (data.keycode == 32) {
            players[data.id].shoot();
        }

    })

    socket.on('disconnect', () => {
        console.log('user disconnected');
    });
    
  });

  //var planets = planets(4);

  setInterval(() => {

    for (player in players) {
        players[player].update()
        players[player].bullets.forEach((b) => b.update())
    }

    /*planets.forEach(function(p) {
        p.update()
    })*/

    io.sockets.emit('state', players)
  }, 30)



server.listen(8080, () => {
  console.log('listening on *:3000');
});