
import { message } from "./utils.js";

export default class Labels {
    node;
    labelIndex = [];
    assembler;

    constructor(rootElem, assembler){
        this.node = rootElem;
        this.assembler = assembler;
        this.assembler.labels = this;
    }

    indexLines(lines, symbols) {
        for (let i = 0; i < lines.length; i++) {
            if (!this.indexLine(lines[i], symbols)) {
                message(this.node, "**Label already defined at line " + (i + 1) + ":** " + lines[i]);
                return false;
            }
        }
        return true;
    }

    /**
     * Extract label if line contains one and calculate position in memory.
     * Return false if label already exists.
     * @param {*} input 
     * @param {*} symbols 
     * @returns
     */
    indexLine(input, symbols) {
        // Figure out how many bytes this instruction takes
        let currentPC = this.assembler.getCurrentPC();
        this.assembler.assembleLine(input, symbols); //TODO: find a better way for Labels to have access to assembler

        // Find command or label
        if (input.match(/^\w+:/)) {
            let label = input.replace(/(^\w+):.*$/, "$1");

            if (symbols.lookup(label)) {
                message(this.node, "**Label " + label + "is already used as a symbol; please rename one of them**");
                return false;
            }

            return this.push(label + "|" + currentPC);
        }
        return true;
    }

    // Push label to array. Return false if label already exists.
    push(name) {
        if (this.find(name)) {
            return false;
        }
        this.labelIndex.push(name + "|");
        return true;
    }

    // Returns true if label exists.
    find(name) {
        let nameAndAddr;
        for (let i = 0; i < this.labelIndex.length; i++) {
            nameAndAddr = this.labelIndex[i].split("|");
            if (name === nameAndAddr[0]) {
                return true;
            }
        }
        return false;
    }

    // Associates label with address
    setPC(name, addr) {
        let nameAndAddr;
        for (let i = 0; i < this.labelIndex.length; i++) {
            nameAndAddr = this.labelIndex[i].split("|");
            if (name === nameAndAddr[0]) {
                this.labelIndex[i] = name + "|" + addr;
                return true;
            }
        }
        return false;
    }

    // Get address associated with label
    getPC(name) {
        let nameAndAddr;
        for (let i = 0; i < this.labelIndex.length; i++) {
            nameAndAddr = this.labelIndex[i].split("|");
            if (name === nameAndAddr[0]) {
                return (nameAndAddr[1]);
            }
        }
        return -1;
    }

    displayMessage() {
        let str = "Found " + this.labelIndex.length + " label";
        if (this.labelIndex.length !== 1) {
            str += "s";
        }
        message(this.node, str + ".");
    }

    reset() {
        this.labelIndex = [];
    }

}