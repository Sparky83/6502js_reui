
class Display {
    node;
    memory;
    displayArray = [];
    palette = [
        "#000000", "#ffffff", "#880000", "#aaffee",
        "#cc44cc", "#00cc55", "#0000aa", "#eeee77",
        "#dd8855", "#664400", "#ff7777", "#333333",
        "#777777", "#aaff66", "#0088ff", "#bbbbbb"
    ];
    ctx;
    width;
    height;
    pixelSize;
    numX = 32;
    numY = 32;

    constructor(rootElem, memory) {
        this.node = rootElem;
        this.memory = memory;
    }

    initialize() {
        let canvas = this.node.querySelector('.screen');
        this.width = canvas.width;
        this.height = canvas.height;
        this.pixelSize = this.width / this.numX;
        this.ctx = canvas.getContext('2d');
        this.reset();
    }

    reset() {
        this.ctx.fillStyle = "black";
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    updatePixel(addr) {
        this.ctx.fillStyle = this.palette[this.memory.get(addr) & 0x0f];
        let y = Math.floor((addr - 0x200) / 32);
        let x = (addr - 0x200) % 32;
        this.ctx.fillRect(x * this.pixelSize, y * this.pixelSize, this.pixelSize, this.pixelSize);
    }
}

export default Display;
