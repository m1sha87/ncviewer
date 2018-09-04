var commands = [];
var view = document.getElementById("view");
var toolbar = document.getElementById("toolbar");
var speedInput = document.getElementById("speedInput");
var cnv = document.getElementById("cnv");
var ctx = cnv.getContext("2d");
var layers = [];
var tools = [];
var sheet = null;
var currTool = null;
var currX = null;
var currY = null;
var currC = null;
var currM = null;
var currI = 0;
var speed = -1;
var flagStop = false;
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
    view.removeAttribute("hidden");
    toolbar.removeAttribute("hidden");
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
    startDraw();
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
        tools[toolId] = {'type': type, 'a': found[3], 'b': found[4], 'color': colors[toolId]};
        return toolId;
    }
}

function startDraw() {
    ctx.translate(2500, 0);
    ctx.strokeStyle = colors[2];
    ctx.strokeRect(-sheet.x, 0, sheet.x, sheet.y);
    nextStep();
}

function draw(i) {
    if (Object.keys(commands[i]).length === 0) {return false;}

    if (commands[i].tool >= 0) {
        var id = commands[i].tool;
        var cnv = document.createElement('canvas');
        cnv.setAttribute('id', 'cnv'+id);
        cnv.setAttribute('width', '2500');
        cnv.setAttribute('class', 'layer');
        cnv.setAttribute('height', '1250');
        view.appendChild(cnv);
        ctx = cnv.getContext("2d");
        ctx.translate(2500, 0);
        ctx.lineWidth = 1;
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        ctx.imageSmoothingEnabled = false;
        currTool = tools[id];
        ctx.strokeStyle = colors[id];
        layers[id] = cnv;
        return false;
    }

    if (commands[i].m >= 0) {
        if (checkM(commands[i].m)) {
            currM = commands[i].m;
        }
    }

    if (currTool && commands[i].h) {
        hitLine(commands[i].x, commands[i].y, commands[i].h);
        if (speed > 0) {
            return true;
        }
    }

    if (commands[i].x >= 0) {
        currX = commands[i].x;
    }

    if (commands[i].y >= 0) {
        currY = commands[i].y;
    }

    if (commands[i].c >= 0) {
        currC = correctAngle(commands[i].c);
    }

    if (currTool && !commands[i].h && (commands[i].x >= 0 || commands[i].y >= 0)) {
        hit();
        if (speed > 0) {
            setTimeout(nextStep, speed);
        } else {
            return false;
        }
        return true;
    }
    return false;
}

function setSpeed(val) {
    speed = val;
    speedInput.value = speed;
}

function setInputSpeed() {
    setSpeed(speedInput.value);
}

function nextStep() {
    if (flagStop || (currI >= commands.length-1)) {
        flagStop = true;
        if (speed === -1) {
            setSpeed(30);
        }
        return;
    }
    if (!draw(currI)) {
        currI++;
        nextStep();
        return;
    }
    currI++;
}

function startNC() {
    flagStop = false;
    if (currI >= commands.length-1) {
        clear();
    }
    nextStep();
}

function clear() {
    currI = 0;
    layers.forEach(function (cnv) {
        var ctx = cnv.getContext("2d");
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, cnv.width, cnv.height);
    });
}

function stopNC() {
    flagStop = true;
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
        point(currX, currY);
        window[currTool.type](currX, currY, currTool.a, currTool.b, currC);
    }
    // setTimeout(nextStep, 300);
}

function hitLine(x, y, hits) {
    var deltaX = (x) ? Math.round(((x - currX) / hits) * 100) / 100 : 0;
    var deltaY = (y) ? Math.round(((y - currY) / hits) * 100) / 100 : 0;
    nextHit(deltaX, deltaY, 1, hits, x, y);
    // for (var i = 1; i < h; i++) {
    //     currX = parseFloat(currX) + deltaX;
    //     currY = parseFloat(currY) + deltaY;
    //     hit();
    // }
    //
    // if (x > 0) {
    //     currX = x;
    // }
    // if (y > 0) {
    //     currY = y;
    // }
    // hit();
}

function nextHit(deltaX, deltaY, step, hits, x, y) {
    if (step < hits) {
        step++;
        currX = parseFloat(currX) + deltaX;
        currY = parseFloat(currY) + deltaY;
        hit();
        if (speed > 0) {
            setTimeout(nextHit(deltaX, deltaY, step, hits, x, y), speed);
        } else {
            nextHit(deltaX, deltaY, step, hits, x, y);
        }
    } else {
        if (x > 0) {
            currX = x;
        }
        if (y > 0) {
            currY = y;
        }
        hit();
        if (speed > 0) {
            setTimeout(nextStep, speed);
        }
    }
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
        specialTools[999](x, y, c);
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
    ctx.closePath();
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

specialTools[999] = function (x, y, c) { // default
    rotate(x, y, c);
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, 2 * Math.PI);
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 10);
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

view.addEventListener('mousemove', function(evt) {
    var mousePos = getMousePos(cnv, evt);
    var message = Math.round(mousePos.x) * (-1) + ', ' + Math.round(mousePos.y);
    writeMessage(message);
}, false);


(function() {
    var $section = $('#focal');
    var $panzoom = $section.find('#view').panzoom();
    $panzoom.parent().on('mousewheel.focal', function( e ) {
        e.preventDefault();
        var delta = e.delta || e.originalEvent.wheelDelta;
        var zoomOut = delta ? delta < 0 : e.originalEvent.deltaY > 0;
        $panzoom.panzoom('zoom', zoomOut, {
            increment: 0.1,
            animate: false,
            focal: e
        });
    });
})();