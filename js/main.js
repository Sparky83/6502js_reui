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

import UI from "./ui.js";
import Simulator from "./simulator.js";
import Display from "./display.js";
import Screen from "./screen.js";
import Memory from "./memory.js";
import Assembler from "./assembler.js";
import {num2hex, addr2hex, message} from "./utils.js";

function SimulatorWidget(node) {
  let ui = new UI(node);
  let memory = new Memory();
  let display = new Display(node, memory);
  let screen = new Screen(node);
  let simulator = new Simulator(node, ui, display, screen, memory);
  let assembler = new Assembler(node, simulator, memory, ui);

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

    document.addEventListener('keydown', ()=>{memory.storeKeydown});
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

  initialize();
}

document.onreadystatechange = () => {
  if (document.readyState === "complete") {
    document.querySelectorAll('.widget').forEach((elem)=>{
      SimulatorWidget(elem);
    });
  }
};
