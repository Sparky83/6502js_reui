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
        simulator.handleMonitorRangeChange();
        addEventListeners();
    }

    function addEventListeners() {
        let addClick = (selector, func)=>{ node.querySelector(selector).addEventListener("click", func) };
        addClick('.assembleButton', ()=>{ assembler.assembleCode() });
        addClick('.runButton', ()=>{ simulator.runBinary() });
        addClick('.runButton', ()=>{ simulator.stopDebugger() });
        addClick('.resetButton', ()=>{ simulator.reset() });
        addClick('.hexdumpButton', ()=>{ assembler.hexdump() });
        addClick('.disassembleButton', ()=>{ assembler.disassemble() });
        addClick('.downloadButton', ()=>{ assembler.download() });
        addClick('.uploadButton', ()=>{ assembler.upload() });
        addClick('.stepButton', ()=>{ simulator.debugExec() });
        addClick('.gotoButton', ()=>{ simulator.gotoAddr() });
        addClick('.notesButton', ()=>{ ui.showNotes() });
        node.querySelector('.start, .length').addEventListener("blur", ()=>{ simulator.handleMonitorRangeChange() });
        node.querySelector('.debug').addEventListener("change", ()=>{ setDebugMode(node.querySelector(".debug").checked) });
        node.querySelector('.code').addEventListener('keydown', ()=>{ simulator.stop(); ui.initialize() });
        node.querySelector('.code').addEventListener('input', ()=>{ simulator.stop(); ui.initialize() });
        node.querySelector('.monitoring').addEventListener("change", ()=>{
            ui.toggleMonitor();
            simulator.toggleMonitor();
        });
        node.querySelector('.console').addEventListener("change", ()=>{
            ui.toggleConsole();
            simulator.toggleConsole();
        });
        document.addEventListener('keydown', (e)=>{ memory.storeKeydown(e) });
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

document.onreadystatechange = ()=>{
    if (document.readyState === "complete") {
        document.querySelectorAll('.widget').forEach((elem) => {
            SimulatorWidget(elem);
        });
    }
};
