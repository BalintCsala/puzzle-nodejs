(() => {

    let img;
    let c, ctx;
    let socket;
    let pieces = null;
    let boardWidth;
    let count = 20;
    let size;
    let moving = -1;
    let dragging = false;
    let offset = { x: 0, y: 0 };
    let scroll = 1;

    function pixToCoord(x, y) {
        return {
            x: (x - (innerWidth - size) / 2) / size / scroll,
            y: (y - 20) / size / scroll
        };
    }

    function main() {
        img = new Image();
        img.src = "../puzzle.png";
        img.onload = () => {

            c = document.querySelector("#canvas");
            resize();
            onresize = resize;

            c.oncontextmenu = () => false;

            c.addEventListener("mousedown", e => {
                e.preventDefault();
                let coord = pixToCoord(e.clientX - offset.x, e.clientY - offset.y);

                for (let piece of pieces) {
                    if (coord.x >= piece.pos.x && coord.x <= piece.pos.x + 1 / count &&
                            coord.y >= piece.pos.y && coord.y <= piece.pos.y + 1 / count) {
                        if (e.button === 0) {
                            moving = piece.id;
                            let idx = pieces.indexOf(piece);
                            let p = pieces.splice(idx, 1)[0];
                            pieces.unshift(p);
                        } else if (e.button === 2) {
                            socket.emit("rotate", piece.id);
                        }
                        break;
                    }
                }
                if (moving === -1 && e.button !== 2)
                    dragging = true;
                return false;
            });

            c.addEventListener("mousemove", e => {
                if (dragging) {
                    offset.x += e.movementX;
                    offset.y += e.movementY;
                }
                if (moving !== -1) {
                    let pos = pixToCoord(e.clientX - offset.x, e.clientY - offset.y);
                    let p = pieces.find(p => p.id === moving);
                    p.pos.x = pos.x - 0.5 / count;
                    p.pos.y = pos.y - 0.5 / count;
                    socket.emit("setPos", { id: moving, pos: { x: pos.x - 0.5 / count, y: pos.y - 0.5 / count } });

                    pieces.splice(pieces.indexOf(p), 1);
                    pieces.unshift(p);
                }
            });

            onwheel = e => {
                scroll = Math.min(5, Math.max(0.2, scroll - e.deltaY / 100));
            };

            c.addEventListener("mouseup", e => {
                dragging = false;
                if (moving !== -1) {
                    let pos = pixToCoord(e.clientX - offset.x, e.clientY - offset.y);
                    let realPos = {
                        x: Math.floor(pos.x * count) / count,
                       y: Math.floor(pos.y * count) / count
                    };
                    let p = pieces.find(p => p.id === moving);

                    p.pos.x = realPos.x;
                    p.pos.y = realPos.y;
                    socket.emit("setPos", { id: moving, pos: realPos });

                    pieces.splice(pieces.indexOf(p), 1);
                    pieces.unshift(p);

                    moving = -1;
                }
            });

            socket = io();

            socket.on("pieces", ({c, p}) => {
                pieces = p;
                count = c;

                setInterval(() => console.log(pieces), 60000);
            });

            socket.on("setPos", ({ id, pos }) => {
                let p = pieces.find(p => p.id === id);
                p.pos.x = pos.x;
                p.pos.y = pos.y;

                pieces.splice(pieces.indexOf(p), 1);
                pieces.unshift(p);
            });

            socket.on("rotate", id => {
                let p = pieces.find(p => p.id === id);
                p.r++;
            });

            loop();
        }
    }

    function loop() {
        update();
        render();
        requestAnimationFrame(loop);
    }

    function update() {
    }

    function render() {
        ctx.restore();
        ctx.clearRect(0, 0, c.width, c.height);
        ctx.save();

        ctx.translate(c.width / 2, c.height / 2);
        ctx.scale(scroll, scroll);
        ctx.translate(-c.width / 2 / scroll, -c.height / 2 / scroll);

        ctx.translate(((c.width - size) / 2 + offset.x) / scroll, (20 + offset.y) / scroll);

        ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.miterLimit = 5;
        if (pieces) {
            for (let i = pieces.length - 1; i >= 0; i--) {
                let piece = pieces[i];
                ctx.beginPath();
                ctx.save();
                ctx.translate((piece.pos.x + 0.5 / count) * size, (piece.pos.y + 0.5 / count) * size);
                ctx.rotate(Math.PI / 2 * piece.r);
                for (let i = 0; i < 4; i++) {
                    drawSide(piece.edges[(i + 1) % 4], piece.edges[(i + 2) % 4], piece.sides[i], i)
                }
                ctx.clip();
                ctx.drawImage(img,
                    (piece.imgCorner.x - 0.5 / count) * img.width, (piece.imgCorner.y - 0.5 / count) * img.height,
                    img.width / count * 2, img.height / count * 2, -1 / count * size, -1 / count * size,
                    size / count * 2, size / count * 2);

                ctx.restore();

                //ctx.stroke();
            }
        }
    }

    function drawSide(start, end, knob, dir) {
        ctx.lineTo(start.x * size, start.y * size);
        if (knob !== 0) {

            let h = 0.2;
            ctx.lineTo(
                ((end.x - start.x) * (1 - h) / 2 + start.x) * size,
                ((end.y - start.y) * (1 - h) / 2 + start.y) * size
            );
            let r = 0.15;
            let d = Math.sqrt(r * r - 0.1 * 0.1);
            let a = Math.atan(h / d);
            let xx = (start.x + end.x) / 2 * size;
            let yy = (start.y + end.y) / 2 * size;
            let cx = 0;
            let cy = 0;
            let sa;
            switch (dir) {
                case 0:
                    cx += d * knob;
                    sa = knob === 1 ? Math.PI + a : -a;
                    break;
                case 1:
                    cy += d * knob;
                    sa = knob === 1 ? -Math.PI / 2 + a : Math.PI / 2 - a;
                    break;
                case 2:
                    cx -= d * knob;
                    sa = knob === 1 ? a : Math.PI - a;
                    break;
                case 3:
                    cy -= d * knob;
                    sa = knob === 1 ? Math.PI / 2 + a : -Math.PI / 2 - a;
                    break;
            }
            ctx.arc(xx + cx * size / count, yy + cy * size / count, r * size / count, sa, sa + (2 * Math.PI - 2 * a) * knob, knob === -1);
            ctx.lineTo(
                ((end.x - start.x) * (1 + h) / 2 + start.x) * size,
                ((end.y - start.y) * (1 + h) / 2 + start.y) * size
            );
        }

        ctx.lineTo(end.x * size, end.y * size);
    }

    function resize() {
        c.width = innerWidth;
        c.height = innerHeight;
        ctx = c.getContext("2d");
        boardWidth = c.width / 2;
        size = Math.min(c.width, c.height - 40) - 100;
    }

    main();
})();