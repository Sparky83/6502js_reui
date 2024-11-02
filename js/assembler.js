/*
 *  6502 assembler and simulator in Javascript
 *  (C)2006-2010 Stian Soreng - www.6502asm.com
 *
 *  Adapted by Nick Morgan
 *  https://github.com/skilldrick/6502js
 *
 *  Adapted by Chris Tyler 
 *  https://github.com/ctyler/6502js
 * 
 *  Adapted by Benjamin Feldberg
 *  https://github.com/Sparky83/6502js_reui
 *
 *  Released under the GNU General Public License
 *  see http://gnu.org/licenses/gpl.html
 */

import { num2hex, addr2hex, message } from "./utils.js";
import Simulator from "./simulator.js";
import Labels from "./labels.js";
import Opcodes from "../data/opcodes.json" with {type: 'json'};


export default class Assembler {

    node;
    ui;
    memory;
    simulator;
    labels;
    defaultCodePC;
    codeLen;
    codeAssembledOK = false;
    wasOutOfRangeBranch = false;
    // TODO: Create separate disassembler object?
    addressingModes = [null, 'Imm', 'ZP', 'ZPX', 'ZPY', 'ABS', 'ABSX', 'ABSY', 'IND', 'INDX', 'INDY', 'SNGL', 'BRA'];
    instructionLength = {
        "Imm": 2, "ZP": 2, "ZPX": 2, "ZPY": 2,
        "ABS": 3, "ABSX": 3, "ABSY": 3, "IND": 3,
        "INDX": 2, "INDY": 2, "SNGL": 1, "BRA": 2
    };

    constructor(rootElem, simulator, memory, ui){
        this.node = rootElem;
        this.ui = ui;
        this.memory = memory;
        this.simulator = simulator;
        this.labels = new Labels(rootElem, this);
    }

    // Assembles the code into memory
    assembleCode() {
        let BOOTSTRAP_ADDRESS = 0x600;

        this.wasOutOfRangeBranch = false;

        this.simulator.reset();
        this.labels.reset();
        this.defaultCodePC = BOOTSTRAP_ADDRESS;
        this.node.querySelector('.messages code').innerHTML = "";

        let code = this.node.querySelector('.code').value;
        code += "\n\n";
        let lines = code.split("\n");
        this.codeAssembledOK = true;

        message(this.node, "Preprocessing ...");
        let symbols = this.preprocess(lines);

        message(this.node, "Indexing labels ...");
        this.defaultCodePC = BOOTSTRAP_ADDRESS;
        if (!this.labels.indexLines(lines, symbols)) {
            return false;
        }
        this.labels.displayMessage();

        this.defaultCodePC = BOOTSTRAP_ADDRESS;
        message(this.node, "Assembling code ...");

        this.codeLen = 0;
        let i;
        for (i = 0; i < lines.length; i++) {
            if (!this.assembleLine(lines[i], symbols)) {
                this.codeAssembledOK = false;
                break;
            }
        }
        if (this.codeLen === 0) {
            this.codeAssembledOK = false;
            message(this.node, "No code to run.");
        }
        if (this.codeAssembledOK) {
            this.ui.assembleSuccess();
            this.memory.set(this.defaultCodePC, 0x00); //set a null byte at the end of the code
        } else {
            let str = lines[i].replace("<", "&lt;").replace(">", "&gt;");
            if (!this.wasOutOfRangeBranch)
                message(this.node, "**Syntax error line " + (i + 1) + ": " + str + "**");
            else
                message(this.node, '**Out of range branch on line ' + (i + 1) + ' (branches are limited to -128 to +127): ' + str + '**');

            this.ui.initialize();
            return false;
        }

        message(this.node, "Code assembled successfully, " + this.codeLen + " bytes.");
        return true;
    }

    // Sanitize input: remove comments and trim leading/trailing whitespace
    sanitize(line) {
        // remove comments
        let no_comments = line.replace(/^(.*?);.*/, "$1");

        // trim line
        return no_comments.replace(/^\s+/, "").replace(/\s+$/, "");
    }

    preprocess(lines) {
        let table = [];
        let PREFIX = "__"; // Using a prefix avoids clobbering any predefined properties

        function lookup(key) {
            if (table.hasOwnProperty(PREFIX + key)) return table[PREFIX + key];
            else return undefined;
        }

        function add(key, value) {
            let valueAlreadyExists = table.hasOwnProperty(PREFIX + key)
            if (!valueAlreadyExists) {
                table[PREFIX + key] = value;
            }
        }

        // Build the substitution table
        for (let i = 0; i < lines.length; i++) {
            lines[i] = this.sanitize(lines[i]);
            let match_data = lines[i].match(/^define\s+(\w+)\s+(\S+)/);
            if (match_data) {
                add(match_data[1], this.sanitize(match_data[2]));
                lines[i] = ""; // We're done with this preprocessor directive, so delete it
            }
        }

        // Callers will only need the lookup function
        return {
            lookup: lookup
        }
    }

    // Assembles one line of code.
    // Returns true if it assembled successfully, false otherwise.
    assembleLine(input, symbols) {
        let label, command, param, addr;

        // Find command or label
        if (input.match(/^\w+:/)) {
            label = input.replace(/(^\w+):.*$/, "$1");
            if (input.match(/^\w+:[\s]*\w+.*$/)) {
                input = input.replace(/^\w+:[\s]*(.*)$/, "$1");
                command = input.replace(/^(\w+).*$/, "$1");
            } else {
                command = "";
            }
        } else {
            command = input.replace(/^(\w+).*$/, "$1");
        }

        // Nothing to do for blank lines
        if (command === "") {
            return true;
        }

        command = command.toUpperCase();

        if (input.match(/^\*\s*=\s*\$?[0-9a-f]*$/)) {
            // equ spotted
            param = input.replace(/^\s*\*\s*=\s*/, "");
            if (param[0] === "$") {
                param = param.replace(/^\$/, "");
                addr = parseInt(param, 16);
            } else {
                addr = parseInt(param, 10);
            }
            if ((addr < 0) || (addr > 0xffff)) {
                message(this.node, "Unable to relocate code outside 64k memory");
                return false;
            }
            this.defaultCodePC = addr;
            return true;
        }

        if (input.match(/^\w+\s+.*?$/)) {
            param = input.replace(/^\w+\s+(.*?)/, "$1");
        } else if (input.match(/^\w+$/)) {
            param = "";
        } else {
            return false;
        }

        param = param.replace(/[ ]/g, "");

        if (command === "DCB") 
            return DCB(param);
        if (command in Opcodes) {
            let relevantOpcodes = Opcodes[command];
            let checks = [{ "func": this.checkSingle, "opcodeIndex": 11 }, { "func": this.checkImmediate, "opcodeIndex": 1 },
                          { "func": this.checkZeroPage, "opcodeIndex": 2 }, { "func": this.checkZeroPageX, "opcodeIndex": 3 },
                          { "func": this.checkZeroPageY, "opcodeIndex": 4 }, { "func": this.checkAbsoluteX, "opcodeIndex": 6 },
                          { "func": this.checkAbsoluteY, "opcodeIndex": 7 }, { "func": this.checkIndirect, "opcodeIndex": 8 },
                          { "func": this.checkIndirectX, "opcodeIndex": 9 }, { "func": this.checkIndirectY, "opcodeIndex": 10 },
                          { "func": this.checkAbsolute, "opcodeIndex": 5 }, { "func": this.checkBranch, "opcodeIndex": 12 }];
            for (let i = 0; i < checks.length; i++) {
                const index = checks[i].opcodeIndex;
                let func = checks[i].func;
                if (func.bind(this)(param, relevantOpcodes[index], symbols)) 
                    return true;
            }
        }
        return false; // Unknown syntax
    }

    DCB(param) {
        let values, number, str, ch;
        values = param.split(",");
        if (values.length === 0) {
            return false;
        }
        for (let v = 0; v < values.length; v++) {
            str = values[v];
            if (str) {
                ch = str.substring(0, 1);
                if (ch === "$") {
                    number = parseInt(str.replace(/^\$/, ""), 16);
                    this.pushByte(number);
                } else if (ch >= "0" && ch <= "9") {
                    number = parseInt(str, 10);
                    this.pushByte(number);
                } else if (ch = "\"" && str.substr(2, 1) == "\"") {
                    number = str.charCodeAt(1) & 0xff;
                    this.pushByte(number);
                } else {
                    return false;
                }
            }
        }
        return true;
    }

    // Try to parse the given parameter as a byte operand.
    // Returns the (positive) value if successful, otherwise -1
    tryParseByteOperand(param, symbols) {
        if (param.match(/^\w+$/)) {
            let lookupVal = symbols.lookup(param); // Substitute symbol by actual value, then proceed
            if (lookupVal) {
                param = lookupVal;
            }
        }

        let value;

        // Is it a hexadecimal operand?
        let match_data = param.match(/^\$([0-9a-f]{1,2})$/i);
        if (match_data) {
            value = parseInt(match_data[1], 16);
        } else {
            // Is it a decimal operand?
            match_data = param.match(/^([0-9]{1,3})$/i);
            if (match_data) {
                value = parseInt(match_data[1], 10);
            } else {
                // Is it a character operand?
                match_data = param.match(/^"(.)"$/i);
                if (match_data) {
                    value = match_data.charCodeAt(0) & 0xff;
                }
            }
        }

        // Validate range
        if (value >= 0 && value <= 0xff) {
            return value;
        } else {
            return -1;
        }
    }

    // Try to parse the given parameter as a word operand.
    // Returns the (positive) value if successful, otherwise -1
    tryParseWordOperand(param, symbols) {
        if (param.match(/^\w+$/)) {
            let lookupVal = symbols.lookup(param); // Substitute symbol by actual value, then proceed
            if (lookupVal) {
                param = lookupVal;
            }
        }

        let value;

        // Is it a hexadecimal operand?
        let match_data = param.match(/^\$([0-9a-f]{3,4})$/i);
        if (match_data) {
            value = parseInt(match_data[1], 16);
        } else {
            // Is it a decimal operand?
            match_data = param.match(/^([0-9]{1,5})$/i);
            if (match_data) {
                value = parseInt(match_data[1], 10);
            }
        }

        // Validate range
        if (value >= 0 && value <= 0xffff) {
            return value;
        } else {
            return -1;
        }
    }

    // Common branch function for all branches (BCC, BCS, BEQ, BNE..)
    checkBranch(param, opcode) {
        let addr;
        if (opcode === null) {
            return false;
        }

        addr = -1;
        if (param.match(/\w+/)) {
            addr = this.labels.getPC(param);
        }
        if (addr === -1) {
            this.pushWord(0x00);
            return false;
        }
        this.pushByte(opcode);

        let distance = addr - this.defaultCodePC - 1;

        if (distance < -128 || distance > 127) {
            this.wasOutOfRangeBranch = true;
            return false;
        }

        this.pushByte(distance);
        return true;
    }

    // Check if param is immediate and push value
    checkImmediate(param, opcode, symbols) {
        let value, label, hilo, addr;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^#([\w\$]+)$/i);
        if (match_data) {
            let operand = this.tryParseByteOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushByte(operand);
                return true;
            }
        }

        // Label lo/hi
        if (param.match(/^#[<>]\w+$/)) {
            label = param.replace(/^#[<>](\w+)$/, "$1");
            hilo = param.replace(/^#([<>]).*$/, "$1");
            this.pushByte(opcode);
            if (this.labels.find(label)) {
                addr = this.labels.getPC(label);
                switch (hilo) {
                    case ">":
                        this.pushByte((addr >> 8) & 0xff);
                        return true;
                    case "<":
                        this.pushByte(addr & 0xff);
                        return true;
                    default:
                        return false;
                }
            } else {
                this.pushByte(0x00);
                return true;
            }
        }

        return false;
    }

















    // Check if param is indirect and push value
    checkIndirect(param, opcode, symbols) {
        let value;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^\(([\w\$]+)\)$/i);
        if (match_data) {
            let operand = this.tryParseWordOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushWord(operand);
                return true;
            }
        }
        return false;
    }

    // Check if param is indirect X and push value
    checkIndirectX(param, opcode, symbols) {
        let value;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^\(([\w\$]+),X\)$/i);
        if (match_data) {
            let operand = this.tryParseByteOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushByte(operand);
                return true;
            }
        }
        return false;
    }

    // Check if param is indirect Y and push value
    checkIndirectY(param, opcode, symbols) {
        let value;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^\(([\w\$]+)\),Y$/i);
        if (match_data) {
            let operand = this.tryParseByteOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushByte(operand);
                return true;
            }
        }
        return false;
    }

    // Check single-byte opcodes
    checkSingle(param, opcode) {
        if (opcode === null) {
            return false;
        }
        // Accumulator instructions are counted as single-byte opcodes
        if (param !== "" && param !== "A") {
            return false;
        }
        this.pushByte(opcode);
        return true;
    }

    // Check if param is ZP and push value
    checkZeroPage(param, opcode, symbols) {
        let value;
        if (opcode === null) {
            return false;
        }

        let operand = this.tryParseByteOperand(param, symbols);
        if (operand >= 0) {
            this.pushByte(opcode);
            this.pushByte(operand);
            return true;
        }

        return false;
    }

    // Check if param is ABSX and push value
    checkAbsoluteX(param, opcode, symbols) {
        let number, value, addr;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^([\w\$]+),X$/i);
        if (match_data) {
            let operand = this.tryParseWordOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushWord(operand);
                return true;
            }
        }

        // it could be a label too..
        if (param.match(/^\w+,X$/i)) {
            param = param.replace(/,X$/i, "");
            this.pushByte(opcode);
            if (this.labels.find(param)) {
                addr = this.labels.getPC(param);
                if (addr < 0 || addr > 0xffff) {
                    return false;
                }
                this.pushWord(addr);
                return true;
            } else {
                this.pushWord(0xffff); // filler, only used while indexing labels
                return true;
            }
        }

        return false;
    }

    // Check if param is ABSY and push value
    checkAbsoluteY(param, opcode, symbols) {
        let number, value, addr;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^([\w\$]+),Y$/i);
        if (match_data) {
            let operand = this.tryParseWordOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushWord(operand);
                return true;
            }
        }

        // it could be a label too..
        if (param.match(/^\w+,Y$/i)) {
            param = param.replace(/,Y$/i, "");
            this.pushByte(opcode);
            if (this.labels.find(param)) {
                addr = this.labels.getPC(param);
                if (addr < 0 || addr > 0xffff) {
                    return false;
                }
                this.pushWord(addr);
                return true;
            } else {
                this.pushWord(0xffff); // filler, only used while indexing labels
                return true;
            }
        }
        return false;
    }

    // Check if param is ZPX and push value
    checkZeroPageX(param, opcode, symbols) {
        let number, value;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^([\w\$]+),X$/i);
        if (match_data) {
            let operand = this.tryParseByteOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushByte(operand);
                return true;
            }
        }

        return false;
    }

    // Check if param is ZPY and push value
    checkZeroPageY(param, opcode, symbols) {
        let number, value;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^([\w\$]+),Y$/i);
        if (match_data) {
            let operand = this.tryParseByteOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushByte(operand);
                return true;
            }
        }

        return false;
    }

    // Check if param is ABS and push value
    checkAbsolute(param, opcode, symbols) {
        let value, number, addr;
        if (opcode === null) {
            return false;
        }

        let match_data = param.match(/^([\w\$]+)$/i);
        if (match_data) {
            let operand = this.tryParseWordOperand(match_data[1], symbols);
            if (operand >= 0) {
                this.pushByte(opcode);
                this.pushWord(operand);
                return true;
            }
        }

        // it could be a label too..
        if (param.match(/^\w+$/)) {
            this.pushByte(opcode);
            if (this.labels.find(param)) {
                addr = (this.labels.getPC(param));
                if (addr < 0 || addr > 0xffff) {
                    return false;
                }
                this.pushWord(addr);
                return true;
            } else {
                this.pushWord(0xffff); // filler, only used while indexing labels
                return true;
            }
        }
        return false;
    }




















    // Push a byte to memory
    pushByte(value) {
        this.memory.set(this.defaultCodePC, value & 0xff);
        this.defaultCodePC++;
        this.codeLen++;
    }

    // Push a word to memory in little-endian order
    pushWord(value) {
        this.pushByte(value & 0xff);
        this.pushByte((value >> 8) & 0xff);
    }

    openPopup(content, title) {
        let w = window.open('about:blank', title, 'width=500,height=300,resizable=yes,scrollbars=yes,toolbar=no,location=no,menubar=no,status=no');

        let html = "<html><head>";
        html += "<link href='style.css' rel='stylesheet' type='text/css' />";
        html += "<title>" + title + "</title></head><body>";
        html += "<pre><div class='popup'>";

        html += content;

        html += "</code></pre></body></html>";
        w.document.write(html);
        w.document.close();
    }

    // Dump binary as hex to new window
    hexdump() {
        openPopup(this.memory.format(0x600, this.codeLen), 'Hexdump');
    }

    getModeAndCode(byte) {
        let index;
        let line = Opcodes.filter(function (line) {
            let possibleIndex = line.indexOf(byte);
            if (possibleIndex > -1) {
                index = possibleIndex;
                return true;
            }
        })[0];

        if (!line) { //instruction not found
            return {
                opCode: '???',
                mode: 'SNGL'
            };
        } else {
            return {
                opCode: line[0],
                mode: addressingModes[index]
            };
        }
    }

    createInstruction(address) {
        let bytes = [];
        let opCode;
        let args = [];
        let mode;

        function isAccumulatorInstruction() {
            let accumulatorBytes = [0x0a, 0x4a, 0x2a, 0x6a];
            if (accumulatorBytes.indexOf(bytes[0]) > -1) {
                return true;
            }
        }

        function isBranchInstruction() {
            return opCode.match(/^B/) && !(opCode == 'BIT' || opCode == 'BRK');
        }

        //This is gnarly, but unavoidably so?
        function formatArguments() {
            let argsString = args.map(num2hex).reverse().join('');

            if (isBranchInstruction()) {
                let destination = address + 2;
                if (args[0] > 0x7f) {
                    destination -= 0x100 - args[0];
                } else {
                    destination += args[0];
                }
                argsString = addr2hex(destination);
            }

            if (argsString) {
                argsString = '$' + argsString;
            }
            if (mode == 'Imm') {
                argsString = '#' + argsString;
            }
            if (mode.match(/X$/)) {
                argsString += ',X';
            }
            if (mode.match(/^IND/)) {
                argsString = '(' + argsString + ')';
            }
            if (mode.match(/Y$/)) {
                argsString += ',Y';
            }

            if (isAccumulatorInstruction()) {
                argsString = 'A';
            }

            return argsString;
        }

        return {
            addByte: function (byte) {
                bytes.push(byte);
            },
            setModeAndCode: function (modeAndCode) {
                opCode = modeAndCode.opCode;
                mode = modeAndCode.mode;
            },
            addArg: function (arg) {
                args.push(arg);
            },
            toString: function () {
                let bytesString = bytes.map(num2hex).join(' ');
                let padding = Array(11 - bytesString.length).join(' ');
                return '$' + addr2hex(address) + '    ' + bytesString + padding + opCode +
                    ' ' + formatArguments(args);
            }
        };
    }

    upload() {
        let file = document.getElementById("uploadFilename").files[0];
        let fileReader = new FileReader();
        fileReader.onload = function (fileLoadedEvent) {
            let textFromFileLoaded = fileLoadedEvent.target.result;
            document.getElementById("code").value = textFromFileLoaded;
            simulator.stop();
            this.ui.initialize();
        };
        fileReader.readAsText(file, "UTF-8");
    }

    sendDownload(filename, text) {
        let element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', filename);

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();

        document.body.removeChild(element);
    }

    download() {
        let text = document.getElementById("code").value;
        let filename = "6502-assembler-source.txt";

        sendDownload(filename, text);
    }

    disassemble() {
        let startAddress = 0x600;
        let currentAddress = startAddress;
        let endAddress = startAddress + this.codeLen;
        let instructions = [];
        let length;
        let inst;
        let byte;
        let modeAndCode;

        while (currentAddress < endAddress) {
            inst = createInstruction(currentAddress);
            byte = this.memory.get(currentAddress);
            inst.addByte(byte);

            modeAndCode = getModeAndCode(byte);
            length = instructionLength[modeAndCode.mode];
            inst.setModeAndCode(modeAndCode);

            for (let i = 1; i < length; i++) {
                currentAddress++;
                byte = this.memory.get(currentAddress);
                inst.addByte(byte);
                inst.addArg(byte);
            }
            instructions.push(inst);
            currentAddress++;
        }

        let html = 'Address  Hexdump   Dissassembly\n';
        html += '-------------------------------\n';
        html += instructions.join('\n');
        openPopup(html, 'Disassembly');
    }

    getCurrentPC() {
        return this.defaultCodePC;
    }
}
