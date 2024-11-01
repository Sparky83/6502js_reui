

function addr2hex(addr) {
    return num2hex((addr >> 8) & 0xff) + num2hex(addr & 0xff);
}

function num2hex(nr) {
    let str = "0123456789abcdef";
    let hi = ((nr & 0xf0) >> 4);
    let lo = (nr & 15);
    return str.substring(hi, hi + 1) + str.substring(lo, lo + 1);
}

// Prints text in the message window
function message(rootElem, text) {
    if (text.length > 1)
        text += '\n'; // allow putc operations from the simulator (WDM opcode)
    rootElem.querySelector('.messages code').textContent += text;
    rootElem.querySelector(".messages").scrollTop = 10000;
}

export {addr2hex, num2hex, message};
