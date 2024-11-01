
export default class UI {

    node;
    currentState;
    speed;
    notesHtml;
    states = {
        "start": {
            assemble: true,
            run: [false, 'Run'],
            reset: false,
            hexdump: false,
            disassemble: false,
            debug: [false, false]
        },
        "assembled": {
            assemble: false,
            run: [true, 'Run'],
            reset: true,
            hexdump: true,
            disassemble: true,
            debug: [true, false]
        },
        "running": {
            assemble: false,
            run: [true, 'Stop'],
            reset: true,
            hexdump: false,
            disassemble: false,
            debug: [true, false]
        },
        "debugging": {
            assemble: false,
            reset: true,
            hexdump: true,
            disassemble: true,
            debug: [true, true]
        },
        "postDebugging": {
            assemble: false,
            reset: true,
            hexdump: true,
            disassemble: true,
            debug: [true, false]
        }
    }

    constructor(rootElem) {
        this.node = rootElem;
        this.speed = this.node.querySelector("#speed");
        this.notesHtml = this.node.querySelector('.notes').innerHTML;
    }

    setState(state) {
        let node = this.node;
        node.querySelector('.assembleButton').toggleAttribute('disabled', !state.assemble);
        if (state.run) {
            node.querySelector('.runButton').toggleAttribute('disabled', !state.run[0]);
            node.querySelector('.runButton').value = state.run[1];
        }
        node.querySelector('.resetButton').toggleAttribute('disabled', !state.reset);
        node.querySelector('.hexdumpButton').toggleAttribute('disabled', !state.hexdump);
        node.querySelector('.disassembleButton').toggleAttribute('disabled', !state.disassemble);
        node.querySelector('.debug').toggleAttribute('disabled', !state.debug[0]);
        node.querySelector('.debug').toggleAttribute('checked', state.debug[1]);
        node.querySelector('.stepButton').toggleAttribute('disabled', !state.debug[1]);
        node.querySelector('.gotoButton').toggleAttribute('disabled', !state.debug[1]);
        this.currentState = state;
    }

    initialize() {
        this.setState(this.states["start"]);
    }

    play() {
        this.setState(this.states["running"]);
    }

    stop() {
        this.setState(this.states["assembled"]);
    }

    assembleSuccess() {
        this.setState(this.states["assembled"]);
    }

    toggleMonitor() {
        this.node.querySelector('.monitor').classList.toggle("hidden");
    }

    toggleConsole() {
        this.node.querySelector('.textscreenarea').classList.toggle("hidden");
    }

    showNotes() {
        this.node.querySelector('.messages code').innerHTML = this.notesHtml;
    }

    setDebug(state) {
        state ? this.setState(this.states["debugging"]) : this.setState(this.states["postDebugging"]);
    }


    captureTabInEditor(e) {
        // Tab Key
        if (e.keyCode === 9) {

            // Prevent focus loss
            e.preventDefault();

            // Insert tab at caret position (instead of losing focus)
            let caretStart = this.selectionStart,
                caretEnd = this.selectionEnd,
                currentValue = this.value;

            this.value = currentValue.substring(0, caretStart) + "\t" + currentValue.substring(caretEnd);

            // Move cursor forwards one (after tab)
            this.selectionStart = this.selectionEnd = caretStart + 1;
        }
    }

}