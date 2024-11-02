

export default class Screen {

    numX = 80;
    numY = 25;
    screentable;

    constructor(rootElem) {
        this.screentable = rootElem.querySelector("#textscreen");
    }

    initialize() {
        for (let x = 0; x < this.numX; x++) {
            for (let y = 0; y < this.numY; y++) {
                this.screentable.rows[y].cells[x].style.color = "#000000";
                this.screentable.rows[y].cells[x].style.background = "#ffffff";
                this.screentable.rows[y].cells[x].innerHTML = "&nbsp;";
            }
        }
    }

    reset() {
        this.initialize();
    }

    updateChar(addr) {
        let numX = this.numX;
        let y = Math.floor((addr - 0xf000) / numX);
        let x = (addr - 0xf000) % numX;
        let c = memory.get(addr);
        if ((c & 0x7f) < 33 || (c & 0x7f) > 126) {
            let s = "&nbsp;"; // unprintable is blank
        } else {
            let s = String.fromCharCode(c & 0x7f);
        }
        if (c & 0x80) {
            screentable.rows[y].cells[x].style.color = "#ffffff";
            screentable.rows[y].cells[x].style.background = "#000000";
        } else {
            screentable.rows[y].cells[x].style.color = "#000000";
            screentable.rows[y].cells[x].style.background = "#ffffff";
        }
        screentable.rows[y].cells[x].innerHTML = s;
    }

}
