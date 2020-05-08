const express = require("express");
const http = require("http");
const socketIO = require("socket.io");
const fs = require("fs");

(() => {

    const app = express();
    const server = http.createServer(app);
    const io = socketIO(server);

    const COUNT = 30;

    function vec(x, y) {
        return { x, y };
    }

    function sub(a, b) {
        return vec(a.x - b.x, a.y - b.y);
    }

    let dots = Array(COUNT + 1).fill(0).map((_, x) => Array(COUNT + 1).fill(0).map((_, y) => {
        let xx = x;
        let yy = y;
        if (xx !== 0 && xx < COUNT) {
            xx += Math.random() * 0.2 - 0.1;
        }
        if (yy !== 0 && yy < COUNT) {
            yy += Math.random() * 0.2 - 0.1;
        }
        return vec(xx / COUNT, yy / COUNT);
    }));

    let pieces = [];
    for (let x = 0; x < COUNT; x++) {
        for (let y = 0; y < COUNT; y++) {
            pieces.push({
                center: vec(x / COUNT, y / COUNT),
                edges: [ dots[x][y], dots[x + 1][y], dots[x + 1][y + 1], dots[x][y + 1] ].map(dot => sub(dot, vec((x + 0.5) / COUNT, (y + 0.5) / COUNT))),
                pos: vec(Math.random(), Math.random()),//vec(x / COUNT, y / COUNT),
                id: x * COUNT + y,
                r: Math.random() * 4 | 0,
                sides: [0, 0, 0, 0],
                imgCorner: vec(x / COUNT, y / COUNT)
            });
        }
    }
    for (let x = 0; x < COUNT; x++) {
        for (let y = 0; y < COUNT - 1; y++) {
            let idx1 = x * COUNT + y;
            let idx2 = x * COUNT + y + 1;
            if (Math.random() < 0.5) {
                pieces[idx1].sides[1] = 1;
                pieces[idx2].sides[3] = -1;
            } else {
                pieces[idx1].sides[1] = -1;
                pieces[idx2].sides[3] = 1;
            }
        }
    }
    for (let y = 0; y < COUNT; y++) {
        for (let x = 0; x < COUNT - 1; x++) {
            let idx1 = x * COUNT + y;
            let idx2 = (x + 1) * COUNT + y;
            if (Math.random() < 0.5) {
                pieces[idx1].sides[0] = 1;
                pieces[idx2].sides[2] = -1;
            } else {
                pieces[idx1].sides[0] = -1;
                pieces[idx2].sides[2] = 1;
            }
        }
    }

    app.use(express.static("client"));

    server.listen(3030, () => {
        console.log("Started server on port 3030");
    });

    io.on("connection", socket => {
        console.log("New connection");
        socket.emit("pieces", { c: COUNT, p: pieces });

        socket.on("setPos", ({ id, pos }) => {
            let p = pieces.find(p => p.id === id);
            p.pos.x = pos.x;
            p.pos.y = pos.y;
            socket.broadcast.emit("setPos", { id, pos });

            pieces.splice(pieces.indexOf(p), 1);
            pieces.unshift(p);
        });

        socket.on("rotate", id => {
            let p = pieces.find(p => p.id === id);
            p.r++;

            io.emit("rotate", id);
        });
    });




})();