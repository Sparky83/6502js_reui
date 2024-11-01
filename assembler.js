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

import UI from "./js/ui.js";
import Simulator from "./js/simulator.js";
import Display from "./js/display.js";
import {num2hex, addr2hex, message} from "./js/utils.js";

function SimulatorWidget(node) {
  let ui = new UI(node);
  let memory = Memory();
  let display = new Display(node, memory);
  let screen = Screen();
  let labels = Labels();
  let simulator = new Simulator(node, ui, display, screen, memory);
  let assembler = Assembler();

  function initialize() {
    stripText();
    ui.initialize();
    display.initialize();
    screen.initialize();
    simulator.reset();

    node.querySelector('.assembleButton').addEventListener("click", ()=>{assembler.assembleCode()});
    node.querySelector('.runButton').addEventListener("click", ()=>{simulator.runBinary()});
    node.querySelector('.runButton').addEventListener("click", ()=>{simulator.stopDebugger()});
    node.querySelector('.resetButton').addEventListener("click", ()=>{simulator.reset()});
    node.querySelector('.hexdumpButton').addEventListener("click", ()=>{assembler.hexdump()});
    node.querySelector('.disassembleButton').addEventListener("click", ()=>{assembler.disassemble()});
    node.querySelector('.downloadButton').addEventListener("click", ()=>{assembler.download()});
    node.querySelector('.uploadButton').addEventListener("click", ()=>{assembler.upload()});
    node.querySelector('.start, .length').addEventListener("blur", ()=>{simulator.handleMonitorRangeChange()});
    node.querySelector('.stepButton').addEventListener("click", ()=>{simulator.debugExec()});
    node.querySelector('.gotoButton').addEventListener("click", ()=>{simulator.gotoAddr()});
    node.querySelector('.notesButton').addEventListener("click", ()=>{ui.showNotes()});
    node.querySelector('.debug').addEventListener("change", () => { setDebugMode(node.querySelector(".debug").checked) });
    node.querySelector('.monitoring').addEventListener("change", () => {
      ui.toggleMonitor();
      simulator.toggleMonitor();
    });
    node.querySelector('.console').addEventListener("change", () => {
      ui.toggleConsole();
      simulator.toggleConsole();
    });

    let editor = node.querySelector('.code');
    editor.addEventListener('keydown', () => { simulator.stop(); ui.initialize() });
    editor.addEventListener('input', () => { simulator.stop(); ui.initialize() });

    document.addEventListener('keydown', memory.storeKeydown);
    simulator.handleMonitorRangeChange();
  }

  function setDebugMode(state) {
    ui.setDebug(state);
    simulator.setDebugger(state);
  }

  function stripText() {
    //Remove leading and trailing space in textarea
    let codeElem = node.querySelector('.code');
    let text = codeElem.value;
    text = text.replace(/^\n+/, '').replace(/\s+$/, '');
    codeElem.value = text;
  }


  // ####################################  SCREEN  #######################################################

  function Screen() {
    let numX = 80;
    let numY = 25;
    let screentable = document.getElementById("textscreen");

    function initialize() {
      for (let x = 0; x < numX; x++) {
        for (let y = 0; y < numY; y++) {
          screentable.rows[y].cells[x].style.color = "#000000";
          screentable.rows[y].cells[x].style.background = "#ffffff";
          screentable.rows[y].cells[x].innerHTML = "&nbsp;";
        }
      }
    }

    function reset() {
      initialize();
    }

    function updateChar(addr) {
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

    return {
      initialize: initialize,
      reset: reset,
      updateChar: updateChar
    };
  }

  // ####################################  MEMORY  #######################################################

  function Memory() {
    let memArray = new Array(0xfe00);
    memArray.push(0x48, 0x8a, 0x48, 0x98, 0x48, 0xa4, 0xf6, 0xb9, 0x1c, 0xfe, 0x18, 0x65, 0xf5, 0x85, 0xf7, 0xb9, 0x35, 0xfe, 0x69, 0x00, 0x85, 0xf8, 0x68, 0xa8, 0x68, 0xaa, 0x68, 0x60, 0x00, 0x50, 0xa0, 0xf0, 0x40, 0x90, 0xe0, 0x30, 0x80, 0xd0, 0x20, 0x70, 0xc0, 0x10, 0x60, 0xb0, 0x00, 0x50, 0xa0, 0xf0, 0x40, 0x90, 0xe0, 0x30, 0x80, 0xf0, 0xf0, 0xf0, 0xf0, 0xf1, 0xf1, 0xf1, 0xf2, 0xf2, 0xf2, 0xf3, 0xf3, 0xf3, 0xf4, 0xf4, 0xf4, 0xf5, 0xf5, 0xf5, 0xf5, 0xf6, 0xf6, 0xf6, 0xf7, 0xf7, 0xc9, 0x08, 0xf0, 0x27, 0xc9, 0x0a, 0xf0, 0x3d, 0xc9, 0x0d, 0xf0, 0x39, 0xc9, 0x80, 0xf0, 0x7c, 0xc9, 0x81, 0xf0, 0x3b, 0xc9, 0x82, 0xf0, 0x64, 0xc9, 0x83, 0xf0, 0x45, 0x20, 0x00, 0xfe, 0x84, 0xfd, 0xa0, 0x00, 0x91, 0xf7, 0x20, 0x9d, 0xfe, 0xa4, 0xfd, 0x60, 0x48, 0x98, 0x48, 0x8a, 0x48, 0x20, 0xaf, 0xfe, 0x20, 0x00, 0xfe, 0xa0, 0x00, 0xa9, 0x20, 0x91, 0xf7, 0xa6, 0x50, 0xca, 0x68, 0xaa, 0x68, 0xa8, 0x68, 0x60, 0x48, 0xa9, 0x00, 0x85, 0xf5, 0x20, 0xca, 0xfe, 0x68, 0x60, 0x48, 0xe6, 0xf5, 0xa9, 0x50, 0xc5, 0xf5, 0xd0, 0x07, 0xa9, 0x00, 0x85, 0xf5, 0x20, 0xca, 0xfe, 0x68, 0x60, 0x48, 0xc6, 0xf5, 0x10, 0x14, 0xa5, 0xf6, 0xf0, 0x0a, 0xa9, 0x50, 0x85, 0xf5, 0x20, 0xda, 0xfe, 0x18, 0x90, 0x06, 0xa9, 0x00, 0x85, 0xf5, 0x85, 0xf6, 0x68, 0x60, 0x48, 0xe6, 0xf6, 0xa9, 0x19, 0xc5, 0xf6, 0xd0, 0x05, 0x20, 0x2f, 0xff, 0xc6, 0xf6, 0x68, 0x60, 0xc6, 0xf6, 0x10, 0x02, 0xe6, 0xf6, 0x60, 0x48, 0x98, 0x48, 0xa9, 0x00, 0x85, 0xf5, 0x85, 0xf6, 0x20, 0x00, 0xfe, 0xa0, 0x00, 0xa9, 0x20, 0x91, 0xf7, 0xc8, 0xd0, 0xfb, 0xe6, 0xf8, 0xa5, 0xf8, 0xc9, 0xf8, 0xd0, 0xf1, 0x20, 0x00, 0xfe, 0x68, 0x98, 0x68, 0x60, 0xa5, 0xff, 0xf0, 0x06, 0x48, 0xa9, 0x00, 0x85, 0xff, 0x68, 0x60, 0xa0, 0x19, 0xa2, 0x50, 0x60, 0xb0, 0x0c, 0x86, 0xf5, 0x84, 0xf6, 0x20, 0x00, 0xfe, 0xa4, 0xf8, 0xa5, 0xf7, 0x60, 0x20, 0x00, 0xfe, 0xa0, 0x00, 0xb1, 0xf7, 0xa6, 0xf5, 0xa4, 0xf6, 0x60, 0x48, 0x98, 0x48, 0xa9, 0x00, 0x85, 0xfb, 0xa9, 0x50, 0x85, 0xf9, 0xa9, 0xf0, 0x85, 0xfa, 0x85, 0xfc, 0xa0, 0x00, 0xb1, 0xf9, 0x91, 0xfb, 0xc8, 0xd0, 0xf9, 0xe6, 0xfa, 0xe6, 0xfc, 0xa9, 0xf7, 0xc5, 0xfa, 0xd0, 0xef, 0xb1, 0xf9, 0x91, 0xfb, 0xc8, 0xc0, 0x80, 0xd0, 0xf7, 0xa0, 0x00, 0xa9, 0x20, 0x99, 0x80, 0xf7, 0xc8, 0xc0, 0x50, 0xd0, 0xf8, 0x68, 0xa8, 0x68, 0x60, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4c, 0xe1, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4c, 0x05, 0xff, 0x4c, 0x4e, 0xfe, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x4c, 0x10, 0xff, 0x4c, 0x15, 0xff, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00);

    function set(addr, val) {
      // write data if not in the ROM range
      if ((addr >= 0x0000) && (addr < 0xfe00)) {
        return memArray[addr] = val;
      } else {
        return False;
      }
    }

    function get(addr) {
      if (addr == 0xfe) {
        memArray[addr] = Math.floor(Math.random() * 256);
      }
      return memArray[addr];
    }

    function getWord(addr) {
      return get(addr) + (get(addr + 1) << 8);
    }

    // Poke a byte, don't touch any registers
    function storeByte(addr, value) {
      set(addr, value & 0xff);
      if ((addr >= 0x200) && (addr <= 0x5ff)) {
        display.updatePixel(addr);
      }
      if ((addr >= 0xf000) && (addr < 0xf000 + 80 * 25)) {
        screen.updateChar(addr);
      }
    }

    // Store keycode in ZP $ff
    function storeKeydown(e) {
      let value = e.key;
      let code = 0;
      if (value.length == 1) {
        code = value.charCodeAt(0);
      } else if (value == "ArrowUp") {
        code = 0x80;
      } else if (value == "ArrowRight") {
        code = 0x81;
      } else if (value == "ArrowDown") {
        code = 0x82;
      } else if (value == "ArrowLeft") {
        code = 0x83;
      } else if (value == "Enter") {
        code = 0x0d;
      } else if (value == "Backspace") {
        code = 0x08;
      }
      if (code) {
        memory.storeByte(0xff, code);
      }
      /*      e.stopPropagation(); */
      /*       e.preventDefault(); */
    }

    function format(start, length) {
      let html = '';
      let n;

      for (let x = 0; x < length; x++) {
        if ((x & 15) === 0) {
          if (x > 0) {
            html += "\n";
          }
          n = (start + x);
          html += num2hex(((n >> 8) & 0xff));
          html += num2hex((n & 0xff));
          html += ": ";
        }
        html += num2hex(memory.get(start + x));
        html += " ";
      }
      return html;
    }

    return {
      set: set,
      get: get,
      getWord: getWord,
      storeByte: storeByte,
      storeKeydown: storeKeydown,
      format: format
    };
  }

  // ####################################  SIMULATOR  #######################################################

  

  // ####################################  LABELS  #######################################################

  function Labels() {
    let labelIndex = [];

    function indexLines(lines, symbols) {
      for (let i = 0; i < lines.length; i++) {
        if (!indexLine(lines[i], symbols)) {
          message(node, "**Label already defined at line " + (i + 1) + ":** " + lines[i]);
          return false;
        }
      }
      return true;
    }

    // Extract label if line contains one and calculate position in memory.
    // Return false if label already exists.
    function indexLine(input, symbols) {

      // Figure out how many bytes this instruction takes
      let currentPC = assembler.getCurrentPC();
      assembler.assembleLine(input, 0, symbols); //TODO: find a better way for Labels to have access to assembler

      // Find command or label
      if (input.match(/^\w+:/)) {
        let label = input.replace(/(^\w+):.*$/, "$1");

        if (symbols.lookup(label)) {
          message(node, "**Label " + label + "is already used as a symbol; please rename one of them**");
          return false;
        }

        return push(label + "|" + currentPC);
      }
      return true;
    }

    // Push label to array. Return false if label already exists.
    function push(name) {
      if (find(name)) {
        return false;
      }
      labelIndex.push(name + "|");
      return true;
    }

    // Returns true if label exists.
    function find(name) {
      let nameAndAddr;
      for (let i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          return true;
        }
      }
      return false;
    }

    // Associates label with address
    function setPC(name, addr) {
      let nameAndAddr;
      for (let i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          labelIndex[i] = name + "|" + addr;
          return true;
        }
      }
      return false;
    }

    // Get address associated with label
    function getPC(name) {
      let nameAndAddr;
      for (let i = 0; i < labelIndex.length; i++) {
        nameAndAddr = labelIndex[i].split("|");
        if (name === nameAndAddr[0]) {
          return (nameAndAddr[1]);
        }
      }
      return -1;
    }

    function displayMessage() {
      let str = "Found " + labelIndex.length + " label";
      if (labelIndex.length !== 1) {
        str += "s";
      }
      message(node, str + ".");
    }

    function reset() {
      labelIndex = [];
    }

    return {
      indexLines: indexLines,
      find: find,
      getPC: getPC,
      displayMessage: displayMessage,
      reset: reset
    };
  }

  // ####################################  ASSEMBLER  #######################################################

  function Assembler() {
    let defaultCodePC;
    let codeLen;
    let codeAssembledOK = false;
    let wasOutOfRangeBranch = false;

    let Opcodes = [
      /* Name, Imm,  ZP,   ZPX,  ZPY,  ABS, ABSX, ABSY,  IND, INDX, INDY, SNGL, BRA */
      ["ADC", 0x69, 0x65, 0x75, null, 0x6d, 0x7d, 0x79, null, 0x61, 0x71, null, null],
      ["AND", 0x29, 0x25, 0x35, null, 0x2d, 0x3d, 0x39, null, 0x21, 0x31, null, null],
      ["ASL", null, 0x06, 0x16, null, 0x0e, 0x1e, null, null, null, null, 0x0a, null],
      ["BIT", null, 0x24, null, null, 0x2c, null, null, null, null, null, null, null],
      ["BPL", null, null, null, null, null, null, null, null, null, null, null, 0x10],
      ["BMI", null, null, null, null, null, null, null, null, null, null, null, 0x30],
      ["BVC", null, null, null, null, null, null, null, null, null, null, null, 0x50],
      ["BVS", null, null, null, null, null, null, null, null, null, null, null, 0x70],
      ["BCC", null, null, null, null, null, null, null, null, null, null, null, 0x90],
      ["BCS", null, null, null, null, null, null, null, null, null, null, null, 0xb0],
      ["BNE", null, null, null, null, null, null, null, null, null, null, null, 0xd0],
      ["BEQ", null, null, null, null, null, null, null, null, null, null, null, 0xf0],
      ["BRK", null, null, null, null, null, null, null, null, null, null, 0x00, null],
      ["CMP", 0xc9, 0xc5, 0xd5, null, 0xcd, 0xdd, 0xd9, null, 0xc1, 0xd1, null, null],
      ["CPX", 0xe0, 0xe4, null, null, 0xec, null, null, null, null, null, null, null],
      ["CPY", 0xc0, 0xc4, null, null, 0xcc, null, null, null, null, null, null, null],
      ["DEC", null, 0xc6, 0xd6, null, 0xce, 0xde, null, null, null, null, null, null],
      ["EOR", 0x49, 0x45, 0x55, null, 0x4d, 0x5d, 0x59, null, 0x41, 0x51, null, null],
      ["CLC", null, null, null, null, null, null, null, null, null, null, 0x18, null],
      ["SEC", null, null, null, null, null, null, null, null, null, null, 0x38, null],
      ["CLI", null, null, null, null, null, null, null, null, null, null, 0x58, null],
      ["SEI", null, null, null, null, null, null, null, null, null, null, 0x78, null],
      ["CLV", null, null, null, null, null, null, null, null, null, null, 0xb8, null],
      ["CLD", null, null, null, null, null, null, null, null, null, null, 0xd8, null],
      ["SED", null, null, null, null, null, null, null, null, null, null, 0xf8, null],
      ["INC", null, 0xe6, 0xf6, null, 0xee, 0xfe, null, null, null, null, null, null],
      ["JMP", null, null, null, null, 0x4c, null, null, 0x6c, null, null, null, null],
      ["JSR", null, null, null, null, 0x20, null, null, null, null, null, null, null],
      ["LDA", 0xa9, 0xa5, 0xb5, null, 0xad, 0xbd, 0xb9, null, 0xa1, 0xb1, null, null],
      ["LDX", 0xa2, 0xa6, null, 0xb6, 0xae, null, 0xbe, null, null, null, null, null],
      ["LDY", 0xa0, 0xa4, 0xb4, null, 0xac, 0xbc, null, null, null, null, null, null],
      ["LSR", null, 0x46, 0x56, null, 0x4e, 0x5e, null, null, null, null, 0x4a, null],
      ["NOP", null, null, null, null, null, null, null, null, null, null, 0xea, null],
      ["ORA", 0x09, 0x05, 0x15, null, 0x0d, 0x1d, 0x19, null, 0x01, 0x11, null, null],
      ["TAX", null, null, null, null, null, null, null, null, null, null, 0xaa, null],
      ["TXA", null, null, null, null, null, null, null, null, null, null, 0x8a, null],
      ["DEX", null, null, null, null, null, null, null, null, null, null, 0xca, null],
      ["INX", null, null, null, null, null, null, null, null, null, null, 0xe8, null],
      ["TAY", null, null, null, null, null, null, null, null, null, null, 0xa8, null],
      ["TYA", null, null, null, null, null, null, null, null, null, null, 0x98, null],
      ["DEY", null, null, null, null, null, null, null, null, null, null, 0x88, null],
      ["INY", null, null, null, null, null, null, null, null, null, null, 0xc8, null],
      ["ROR", null, 0x66, 0x76, null, 0x6e, 0x7e, null, null, null, null, 0x6a, null],
      ["ROL", null, 0x26, 0x36, null, 0x2e, 0x3e, null, null, null, null, 0x2a, null],
      ["RTI", null, null, null, null, null, null, null, null, null, null, 0x40, null],
      ["RTS", null, null, null, null, null, null, null, null, null, null, 0x60, null],
      ["SBC", 0xe9, 0xe5, 0xf5, null, 0xed, 0xfd, 0xf9, null, 0xe1, 0xf1, null, null],
      ["STA", null, 0x85, 0x95, null, 0x8d, 0x9d, 0x99, null, 0x81, 0x91, null, null],
      ["TXS", null, null, null, null, null, null, null, null, null, null, 0x9a, null],
      ["TSX", null, null, null, null, null, null, null, null, null, null, 0xba, null],
      ["PHA", null, null, null, null, null, null, null, null, null, null, 0x48, null],
      ["PLA", null, null, null, null, null, null, null, null, null, null, 0x68, null],
      ["PHP", null, null, null, null, null, null, null, null, null, null, 0x08, null],
      ["PLP", null, null, null, null, null, null, null, null, null, null, 0x28, null],
      ["STX", null, 0x86, null, 0x96, 0x8e, null, null, null, null, null, null, null],
      ["STY", null, 0x84, 0x94, null, 0x8c, null, null, null, null, null, null, null],
      ["WDM", 0x42, 0x42, null, null, null, null, null, null, null, null, null, null],
      ["---", null, null, null, null, null, null, null, null, null, null, null, null]
    ];

    // Assembles the code into memory
    function assembleCode() {
      let BOOTSTRAP_ADDRESS = 0x600;

      wasOutOfRangeBranch = false;

      simulator.reset();
      labels.reset();
      defaultCodePC = BOOTSTRAP_ADDRESS;
      node.querySelector('.messages code').innerHTML = "";

      let code = node.querySelector('.code').value;
      code += "\n\n";
      let lines = code.split("\n");
      codeAssembledOK = true;

      message(node, "Preprocessing ...");
      let symbols = preprocess(lines);

      message(node, "Indexing labels ...");
      defaultCodePC = BOOTSTRAP_ADDRESS;
      if (!labels.indexLines(lines, symbols)) {
        return false;
      }
      labels.displayMessage();

      defaultCodePC = BOOTSTRAP_ADDRESS;
      message(node, "Assembling code ...");

      codeLen = 0;
      for (let i = 0; i < lines.length; i++) {
        if (!assembleLine(lines[i], i, symbols)) {
          codeAssembledOK = false;
          break;
        }
      }

      if (codeLen === 0) {
        codeAssembledOK = false;
        message(node, "No code to run.");
      }

      if (codeAssembledOK) {
        ui.assembleSuccess();
        memory.set(defaultCodePC, 0x00); //set a null byte at the end of the code
      } else {

        let str = lines[i].replace("<", "&lt;").replace(">", "&gt;");

        if (!wasOutOfRangeBranch) {
          message(node, "**Syntax error line " + (i + 1) + ": " + str + "**");
        } else {
          message(node, '**Out of range branch on line ' + (i + 1) + ' (branches are limited to -128 to +127): ' + str + '**');
        }

        ui.initialize();
        return false;
      }

      message(node, "Code assembled successfully, " + codeLen + " bytes.");
      return true;
    }

    // Sanitize input: remove comments and trim leading/trailing whitespace
    function sanitize(line) {
      // remove comments
      let no_comments = line.replace(/^(.*?);.*/, "$1");

      // trim line
      return no_comments.replace(/^\s+/, "").replace(/\s+$/, "");
    }

    function preprocess(lines) {
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
        lines[i] = sanitize(lines[i]);
        let match_data = lines[i].match(/^define\s+(\w+)\s+(\S+)/);
        if (match_data) {
          add(match_data[1], sanitize(match_data[2]));
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
    function assembleLine(input, lineno, symbols) {
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
          message(node, "Unable to relocate code outside 64k memory");
          return false;
        }
        defaultCodePC = addr;
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

      if (command === "DCB") {
        return DCB(param);
      }
      for (let o = 0; o < Opcodes.length; o++) {
        if (Opcodes[o][0] === command) {
          if (checkSingle(param, Opcodes[o][11])) {
            return true;
          }
          if (checkImmediate(param, Opcodes[o][1], symbols)) {
            return true;
          }
          if (checkZeroPage(param, Opcodes[o][2], symbols)) {
            return true;
          }
          if (checkZeroPageX(param, Opcodes[o][3], symbols)) {
            return true;
          }
          if (checkZeroPageY(param, Opcodes[o][4], symbols)) {
            return true;
          }
          if (checkAbsoluteX(param, Opcodes[o][6], symbols)) {
            return true;
          }
          if (checkAbsoluteY(param, Opcodes[o][7], symbols)) {
            return true;
          }
          if (checkIndirect(param, Opcodes[o][8], symbols)) {
            return true;
          }
          if (checkIndirectX(param, Opcodes[o][9], symbols)) {
            return true;
          }
          if (checkIndirectY(param, Opcodes[o][10], symbols)) {
            return true;
          }
          if (checkAbsolute(param, Opcodes[o][5], symbols)) {
            return true;
          }
          if (checkBranch(param, Opcodes[o][12])) {
            return true;
          }
        }
      }

      return false; // Unknown syntax
    }

    function DCB(param) {
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
            pushByte(number);
          } else if (ch >= "0" && ch <= "9") {
            number = parseInt(str, 10);
            pushByte(number);
          } else if (ch = "\"" && str.substr(2, 1) == "\"") {
            number = str.charCodeAt(1) & 0xff;
            pushByte(number);
          } else {
            return false;
          }
        }
      }
      return true;
    }

    // Try to parse the given parameter as a byte operand.
    // Returns the (positive) value if successful, otherwise -1
    function tryParseByteOperand(param, symbols) {
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
    function tryParseWordOperand(param, symbols) {
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
    function checkBranch(param, opcode) {
      let addr;
      if (opcode === null) {
        return false;
      }

      addr = -1;
      if (param.match(/\w+/)) {
        addr = labels.getPC(param);
      }
      if (addr === -1) {
        pushWord(0x00);
        return false;
      }
      pushByte(opcode);

      let distance = addr - defaultCodePC - 1;

      if (distance < -128 || distance > 127) {
        wasOutOfRangeBranch = true;
        return false;
      }

      pushByte(distance);
      return true;
    }

    // Check if param is immediate and push value
    function checkImmediate(param, opcode, symbols) {
      let value, label, hilo, addr;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^#([\w\$]+)$/i);
      if (match_data) {
        let operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }

      // Label lo/hi
      if (param.match(/^#[<>]\w+$/)) {
        label = param.replace(/^#[<>](\w+)$/, "$1");
        hilo = param.replace(/^#([<>]).*$/, "$1");
        pushByte(opcode);
        if (labels.find(label)) {
          addr = labels.getPC(label);
          switch (hilo) {
            case ">":
              pushByte((addr >> 8) & 0xff);
              return true;
            case "<":
              pushByte(addr & 0xff);
              return true;
            default:
              return false;
          }
        } else {
          pushByte(0x00);
          return true;
        }
      }

      return false;
    }

    // Check if param is indirect and push value
    function checkIndirect(param, opcode, symbols) {
      let value;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^\(([\w\$]+)\)$/i);
      if (match_data) {
        let operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }
      return false;
    }

    // Check if param is indirect X and push value
    function checkIndirectX(param, opcode, symbols) {
      let value;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^\(([\w\$]+),X\)$/i);
      if (match_data) {
        let operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      return false;
    }

    // Check if param is indirect Y and push value
    function checkIndirectY(param, opcode, symbols) {
      let value;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^\(([\w\$]+)\),Y$/i);
      if (match_data) {
        let operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }
      return false;
    }

    // Check single-byte opcodes
    function checkSingle(param, opcode) {
      if (opcode === null) {
        return false;
      }
      // Accumulator instructions are counted as single-byte opcodes
      if (param !== "" && param !== "A") {
        return false;
      }
      pushByte(opcode);
      return true;
    }

    // Check if param is ZP and push value
    function checkZeroPage(param, opcode, symbols) {
      let value;
      if (opcode === null) {
        return false;
      }

      let operand = tryParseByteOperand(param, symbols);
      if (operand >= 0) {
        pushByte(opcode);
        pushByte(operand);
        return true;
      }

      return false;
    }

    // Check if param is ABSX and push value
    function checkAbsoluteX(param, opcode, symbols) {
      let number, value, addr;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^([\w\$]+),X$/i);
      if (match_data) {
        let operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+,X$/i)) {
        param = param.replace(/,X$/i, "");
        pushByte(opcode);
        if (labels.find(param)) {
          addr = labels.getPC(param);
          if (addr < 0 || addr > 0xffff) {
            return false;
          }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }

      return false;
    }

    // Check if param is ABSY and push value
    function checkAbsoluteY(param, opcode, symbols) {
      let number, value, addr;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^([\w\$]+),Y$/i);
      if (match_data) {
        let operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+,Y$/i)) {
        param = param.replace(/,Y$/i, "");
        pushByte(opcode);
        if (labels.find(param)) {
          addr = labels.getPC(param);
          if (addr < 0 || addr > 0xffff) {
            return false;
          }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }
      return false;
    }

    // Check if param is ZPX and push value
    function checkZeroPageX(param, opcode, symbols) {
      let number, value;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^([\w\$]+),X$/i);
      if (match_data) {
        let operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }

      return false;
    }

    // Check if param is ZPY and push value
    function checkZeroPageY(param, opcode, symbols) {
      let number, value;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^([\w\$]+),Y$/i);
      if (match_data) {
        let operand = tryParseByteOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushByte(operand);
          return true;
        }
      }

      return false;
    }

    // Check if param is ABS and push value
    function checkAbsolute(param, opcode, symbols) {
      let value, number, addr;
      if (opcode === null) {
        return false;
      }

      let match_data = param.match(/^([\w\$]+)$/i);
      if (match_data) {
        let operand = tryParseWordOperand(match_data[1], symbols);
        if (operand >= 0) {
          pushByte(opcode);
          pushWord(operand);
          return true;
        }
      }

      // it could be a label too..
      if (param.match(/^\w+$/)) {
        pushByte(opcode);
        if (labels.find(param)) {
          addr = (labels.getPC(param));
          if (addr < 0 || addr > 0xffff) {
            return false;
          }
          pushWord(addr);
          return true;
        } else {
          pushWord(0xffff); // filler, only used while indexing labels
          return true;
        }
      }
      return false;
    }

    // Push a byte to memory
    function pushByte(value) {
      memory.set(defaultCodePC, value & 0xff);
      defaultCodePC++;
      codeLen++;
    }

    // Push a word to memory in little-endian order
    function pushWord(value) {
      pushByte(value & 0xff);
      pushByte((value >> 8) & 0xff);
    }

    function openPopup(content, title) {
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
    function hexdump() {
      openPopup(memory.format(0x600, codeLen), 'Hexdump');
    }

    // TODO: Create separate disassembler object?
    let addressingModes = [
      null,
      'Imm',
      'ZP',
      'ZPX',
      'ZPY',
      'ABS',
      'ABSX',
      'ABSY',
      'IND',
      'INDX',
      'INDY',
      'SNGL',
      'BRA'
    ];

    let instructionLength = {
      Imm: 2,
      ZP: 2,
      ZPX: 2,
      ZPY: 2,
      ABS: 3,
      ABSX: 3,
      ABSY: 3,
      IND: 3,
      INDX: 2,
      INDY: 2,
      SNGL: 1,
      BRA: 2
    };

    function getModeAndCode(byte) {
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

    function createInstruction(address) {
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

    function upload() {
      let file = document.getElementById("uploadFilename").files[0];
      let fileReader = new FileReader();
      fileReader.onload = function (fileLoadedEvent) {
        let textFromFileLoaded = fileLoadedEvent.target.result;
        document.getElementById("code").value = textFromFileLoaded;
        simulator.stop();
        ui.initialize();
      };
      fileReader.readAsText(file, "UTF-8");
    }

    function sendDownload(filename, text) {
      let element = document.createElement('a');
      element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
      element.setAttribute('download', filename);

      element.style.display = 'none';
      document.body.appendChild(element);

      element.click();

      document.body.removeChild(element);
    }

    function download() {
      let text = document.getElementById("code").value;
      let filename = "6502-assembler-source.txt";

      sendDownload(filename, text);
    }

    function disassemble() {
      let startAddress = 0x600;
      let currentAddress = startAddress;
      let endAddress = startAddress + codeLen;
      let instructions = [];
      let length;
      let inst;
      let byte;
      let modeAndCode;

      while (currentAddress < endAddress) {
        inst = createInstruction(currentAddress);
        byte = memory.get(currentAddress);
        inst.addByte(byte);

        modeAndCode = getModeAndCode(byte);
        length = instructionLength[modeAndCode.mode];
        inst.setModeAndCode(modeAndCode);

        for (let i = 1; i < length; i++) {
          currentAddress++;
          byte = memory.get(currentAddress);
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

    return {
      assembleLine: assembleLine,
      assembleCode: assembleCode,
      getCurrentPC: function () {
        return defaultCodePC;
      },
      hexdump: hexdump,
      disassemble: disassemble,
      download: download,
      upload: upload
    };
  }

  initialize();
}

document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    document.querySelectorAll('.widget').forEach((elem)=>{
      SimulatorWidget(elem);
    });
  }
};
