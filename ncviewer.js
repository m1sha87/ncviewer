var commands = [];
var cnv = document.getElementById("a");
var ctx = cnv.getContext("2d");
var tools = [];
var sheet = null;
var currTool = null;
var currX = null;
var currY = null;
var currC = null;
var colors = ['#000000', '#FF00FF', '#800800', '#FF0000', '#800000', '#FFFF00', '#00FF00', '#008000', '#008080', '#000080',
    '#000000', '#FF00FF', '#800800', '#FF0000', '#800000', '#FFFF00', '#00FF00', '#008000', '#008080', '#000080'];

var control = document.getElementById("file");
control.addEventListener("change", function(event) {
    var file = control.files[0];
    readFile(file);
}, false);

var target = document.getElementById("dragFile");
target.addEventListener("dragover", function(event) {
    event.preventDefault(); // отменяем действие по умолчанию
}, false);
target.addEventListener("drop", function(event) {
    // отменяем действие по умолчанию
    event.preventDefault();
    var file = event.dataTransfer.files[0];
    readFile(file);
}, false);

var str = null;

function readFile(file) {
    var reader = new FileReader();
    reader.onload = function (event) {
        var contents = event.target.result;
        str = contents.split("\n");
        parseNC(str);
    };

    reader.onerror = function (event) {
        console.error("Файл не может быть прочитан! код " + event.target.error.code);
    };

    reader.readAsText(file);
    document.getElementById("load").setAttribute("hidden", "true");
    document.getElementById("view").removeAttribute("hidden");
}

function parseNC(str) {
    var len = str.length;
    for (var i=0; i < len; i++) {
        commands[i] = {};

        if (sheet == null) {
            findSheet(str[i]);
        }

        var tool = findTool(str[i]);
        if (tool >= 0) {
            commands[i].tool = tool;
            continue;
        }

        var x = findX(str[i]);
        if (x >= 0) {
            commands[i].x = x;
        }

        var y = findY(str[i]);
        if (y >= 0) {
            commands[i].y = y;
        }

        var c = findC(str[i]);
        if (c >= 0) {
            commands[i].c = c;
        }

        var h = findH(str[i]);
        if (h >= 0) {
            commands[i].h = h;
        }

        var m = findM(str[i]);
        if (m >= 0) {
            commands[i].m = m;
        }
    }
    draw();
}

function findSheet(str) {
    var reg = /[0-9][X ]+([0-9]+)[X ]+([0-9]+)/i;
    var found = str.match(reg);
    if (found != null) {
        sheet = {x: found[1], y: found[2]};
        return true;
    }
}

function findX(str) {
    var reg = /X([0-9]+(?:\.[0-9]+)?)/i;
    var found = str.match(reg);
    if (found != null) {
        return found[1];
    }
}

function findY(str) {
    var reg = /Y([0-9]+(?:\.[0-9]+)?)/i;
    var found = str.match(reg);
    if (found != null) {
        return found[1];
    }
}

function findC(str) {
    var reg = /C([0-9]+)/i;
    var found = str.match(reg);
    if (found != null) {
        return found[1];
    }
}

function findH(str) {
    var reg = /H([0-9]+)/i;
    var found = str.match(reg);
    if (found != null) {
        return found[1];
    }
}

function findM(str) {
    var reg = /M([0-9]+)/i;
    var found = str.match(reg);
    if (found != null) {
        return found[1];
    }
}

function findTool(str) {
    var reg = /T([0-9]{2})([0-9])([0-9]{2,5})([0-9]{5})?/i;
    var found = str.match(reg);
    if (found != null) {
        var type = undefined;
        switch (found[2]) {
            case '1':
                type = 'round';
                break;
            case '3':
                type = 'square';
                break;
            case '4':
                type = 'rect';
                break;
            case '8':
                type = 'obround';
                break;
            case '9':
                type = 'spec';
                break;
        }
        if (type != 'spec') {
            found[3] = parseInt(found[3]) / 100;
        }
        if (found[4] != 'undefined') {
            found[4] = parseInt(found[4]) / 100
        }
        var toolId = tools.length;
        console.log(toolId);
        tools[toolId] = {'type': type, 'a': found[3], 'b': found[4], 'color': colors[toolId]};
        return toolId;
    }
}

function draw() {
    // console.log(commands);
    ctx.translate(2500, 0);
    ctx.strokeStyle = colors[2];
    ctx.strokeRect(-sheet.x, 0, sheet.x, sheet.y);
    var len = commands.length;
    for (var i=0; i < len; i++) {
        if (Object.keys(commands[i]).length === 0) {continue;}
        console.log(commands[i]);
        if (commands[i].tool >= 0) {
            var id = commands[i].tool;
            currTool = tools[id];
            ctx.strokeStyle = colors[id];
            console.log(currTool);
            continue;
        }

        if (commands[i].m >= 0) {
            if (checkM(commands[i].m)) {
                currM = commands[i].m;
            }
            // console.log('m: ' + currM + ' : ' + commands[i].m);
        }

        if (currTool && commands[i].h) {
            // console.log('h: ' + commands[i].h);
            hitLine(commands[i].x, commands[i].y, commands[i].h);
            continue;
        }

        if (commands[i].x >= 0) {
            currX = commands[i].x;
            // console.log('x: ' + currX);
        }

        if (commands[i].y >= 0) {
            currY = commands[i].y;
            // console.log('y: ' + currY);
        }

        if (commands[i].c >= 0) {
            currC = correctAngle(commands[i].c);
            // console.log('c: ' + currC + ' : ' + commands[i].c);
        }

        if (currTool && !commands[i].h && (commands[i].x >= 0 || commands[i].y >= 0)) {
            hit();
        }

    }
}

function checkM(m) {
    switch (m) {
        case '20': return 20;
        case '25': return 25;
        case '26': return 26;
        case '27': return 27;
    }
}

function correctAngle(c) {
    c = parseFloat(c);
    if (c >= 0 && c < 180) {
        console.log("-------------" + c);
        return -(c + 180 - 360);
    }
    return -(c - 180 - 360);
}

function rotate(x, y, c) {
    ctx.save();
    ctx.translate(-x, y);
    if (c != 0) {
        ctx.rotate((Math.PI / 180) * c);
    }
}

function hit() {
    if (currM == 25 || currM == 26 || currM == 27) {
        console.log(currX + " " + currY + ' ' + currTool.type + ' ' + currTool.a);
        point(currX, currY);
        window[currTool.type](currX, currY, currTool.a, currTool.b, currC);
    }
}

function hitLine(x, y, h) {
    var deltaX = (x) ? Math.round(((x - currX) / h) * 100) / 100 : 0;
    var deltaY = (y) ? Math.round(((y - currY) / h) * 100) / 100 : 0;
    for (var i = 1; i < h; i++) {
        currX = parseFloat(currX) + deltaX;
        currY = parseFloat(currY) + deltaY;
        hit();
    }
    if (x > 0) {
        currX = x;
    }
    if (y > 0) {
        currY = y;
    }
    hit();
}

function point(x, y) {
    ctx.beginPath();
    ctx.arc(-x, y, 0.1, 0, 2 * Math.PI);
    ctx.stroke();
}

function round(x, y, d) {
    var r = d / 2;
    ctx.beginPath();
    ctx.arc(-x, y, r, 0, 2 * Math.PI);
    ctx.stroke();
}

function rect(x, y, w, h, c) {
    rotate(x, y, c);
    ctx.strokeRect(-w / 2, -h / 2, w, h);
    ctx.restore();
}

function obround(x, y, w, h, c) {
    rotate(x, y, c);
    var r = h / 2;
    ctx.beginPath();
    ctx.arc(-w / 2 + r, 0, r, (Math.PI / 180) * 90, (Math.PI / 180) * 270, false);
    ctx.lineTo(w / 2 - r, -r);
    ctx.arc(w / 2 - r, 0, r, (Math.PI / 180) * 270, (Math.PI / 180) * 90, false);
    ctx.lineTo(-w / 2 + r, r);
    ctx.stroke();
    ctx.restore();
}

function square(x, y, w, h, c) {
    rotate(x, y, c);
    ctx.strokeRect(-w / 2, -w / 2, w, w);
    ctx.restore();
}

function spec(x, y, w, h, c) {
    if (!specialTools[w]) {
        specialTools[93](x, y, c);
        return true;
    }
    specialTools[w](x, y, c);
}

specialTools = {};

specialTools[75] = function (x, y, c) { // HEX 6.2
    rotate(x, y, c);
    ctx.beginPath();
    ctx.moveTo(-3.5, 0);
    ctx.lineTo(-2, -3.1);
    ctx.lineTo(2, -3.1);
    ctx.lineTo(3.5, 0);
    ctx.lineTo(2, 3.1);
    ctx.lineTo(-2, 3.1);
    ctx.lineTo(-3.5, 0);
    ctx.stroke();
    ctx.restore();
};

specialTools[93] = function (x, y, c) { // M6
    rotate(x, y, c);
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, 2 * Math.PI);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 30);
    ctx.stroke();
    ctx.restore();
};



function writeMessage(message) {
    document.getElementById('currPos').innerHTML = message;
}
function getMousePos(canvas, evt) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left - 2500,
        y: evt.clientY - rect.top
    };
}

cnv.addEventListener('mousemove', function(evt) {
    var mousePos = getMousePos(cnv, evt);
    var message = mousePos.x * (-1) + ', ' + mousePos.y;
    writeMessage(message);
}, false);
