
import { num2hex, addr2hex, message } from "./utils.js";

export default class Simulator {
    regA = 0;
    regX = 0;
    regY = 0;
    regP = 0;
    regPC = 0x600;
    regSP = 0xff;
    codeRunning = false;
    debug = false;
    monitoring = false;
    showConsole = false;

    ORA = this.setNVflagsForRegA;
    AND = this.setNVflagsForRegA;
    EOR = this.setNVflagsForRegA;
    ASL = this.setNVflags;
    LSR = this.setNVflags;
    ROL = this.setNVflags;
    ROR = this.setNVflags;
    LDA = this.setNVflagsForRegA;
    LDX = this.setNVflagsForRegX;
    LDY = this.setNVflagsForRegY;

    node;
    ui;
    display;
    screen;
    memory;

    constructor(rootElem, uiObj, displayObj, screenObj, memoryObj) {
        this.node = rootElem;
        this.ui = uiObj;
        this.display = displayObj;
        this.screen = screenObj;
        this.memory = memoryObj;
    }

    // Set zero this.AND() negative processor flags based on result
    setNVflags(value) {
        if (value) {
            this.regP &= 0xfd;
        } else {
            this.regP |= 0x02;
        }
        if (value & 0x80) {
            this.regP |= 0x80;
        } else {
            this.regP &= 0x7f;
        }
    }

    setCarryFlagFromBit0(value) {
        this.regP = (this.regP & 0xfe) | (value & 1);
    }

    setCarryFlagFromBit7(value) {
        this.regP = (this.regP & 0xfe) | ((value >> 7) & 1);
    }

    setNVflagsForRegA() {
        this.setNVflags(this.regA);
    }

    setNVflagsForRegX() {
        this.setNVflags(this.regX);
    }

    setNVflagsForRegY() {
        this.setNVflags(this.regY);
    }

    BIT(value) {
        if (value & 0x80) {
            this.regP |= 0x80;
        } else {
            this.regP &= 0x7f;
        }
        if (value & 0x40) {
            this.regP |= 0x40;
        } else {
            this.regP &= ~0x40;
        }
        if (this.regA & value) {
            this.regP &= 0xfd;
        } else {
            this.regP |= 0x02;
        }
    }

    CLC() {
        this.regP &= 0xfe;
    }

    SEC() {
        this.regP |= 1;
    }


    CLV() {
        this.regP &= 0xbf;
    }

    setOverflow() {
        this.regP |= 0x40;
    }

    DEC(addr) {
        let value = this.memory.get(addr);
        value--;
        value &= 0xff;
        this.memory.storeByte(addr, value);
        this.setNVflags(value);
    }

    INC(addr) {
        let value = this.memory.get(addr);
        value++;
        value &= 0xff;
        this.memory.storeByte(addr, value);
        this.setNVflags(value);
    }

    jumpBranch(offset) {
        if (offset > 0x7f) {
            this.regPC = (this.regPC - (0x100 - offset));
        } else {
            this.regPC = (this.regPC + offset);
        }
    }

    overflowSet() {
        return this.regP & 0x40;
    }

    decimalMode() {
        return this.regP & 8;
    }

    carrySet() {
        return this.regP & 1;
    }

    negativeSet() {
        return this.regP & 0x80;
    }

    zeroSet() {
        return this.regP & 0x02;
    }

    doCompare(reg, val) {
        if (reg >= val) {
            SEC();
        } else {
            CLC();
        }
        val = (reg - val);
        this.setNVflags(val);
    }

    testSBC(value) {
        let tmp, w;
        if ((this.regA ^ value) & 0x80) {
            setOverflow();
        } else {
            CLV();
        }

        if (decimalMode()) {
            tmp = 0xf + (this.regA & 0xf) - (value & 0xf) + carrySet();
            if (tmp < 0x10) {
                w = 0;
                tmp -= 6;
            } else {
                w = 0x10;
                tmp -= 0x10;
            }
            w += 0xf0 + (this.regA & 0xf0) - (value & 0xf0);
            if (w < 0x100) {
                CLC();
                if (overflowSet() && w < 0x80) {
                    CLV();
                }
                w -= 0x60;
            } else {
                SEC();
                if (overflowSet() && w >= 0x180) {
                    CLV();
                }
            }
            w += tmp;
        } else {
            w = 0xff + this.regA - value + carrySet();
            if (w < 0x100) {
                CLC();
                if (overflowSet() && w < 0x80) {
                    CLV();
                }
            } else {
                SEC();
                if (overflowSet() && w >= 0x180) {
                    CLV();
                }
            }
        }
        this.regA = w & 0xff;
        setNVflagsForRegA();
    }

    testADC(value) {
        let tmp;
        if ((this.regA ^ value) & 0x80) {
            CLV();
        } else {
            setOverflow();
        }

        if (decimalMode()) {
            tmp = (this.regA & 0xf) + (value & 0xf) + carrySet();
            if (tmp >= 10) {
                tmp = 0x10 | ((tmp + 6) & 0xf);
            }
            tmp += (this.regA & 0xf0) + (value & 0xf0);
            if (tmp >= 160) {
                SEC();
                if (overflowSet() && tmp >= 0x180) {
                    CLV();
                }
                tmp += 0x60;
            } else {
                CLC();
                if (overflowSet() && tmp < 0x80) {
                    CLV();
                }
            }
        } else {
            tmp = this.regA + value + carrySet();
            if (tmp >= 0x100) {
                SEC();
                if (overflowSet() && tmp >= 0x180) {
                    CLV();
                }
            } else {
                CLC();
                if (overflowSet() && tmp < 0x80) {
                    CLV();
                }
            }
        }
        this.regA = tmp & 0xff;
        setNVflagsForRegA();
    }

    instructions = {
        i00: () => {
            this.codeRunning = false;
            //BRK
        },

        i01: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr);
            this.regA |= value;
            this.ORA();
        },

        i05: () => {
            let zp = this.popByte();
            this.regA |= this.memory.get(zp);
            this.ORA();
        },

        i06: () => {
            let zp = this.popByte();
            let value = this.memory.get(zp);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            this.memory.storeByte(zp, value);
            this.ASL(value);
        },

        i08: () => {
            stackPush(this.regP | 0x30);
            //PHP
        },

        i09: () => {
            this.regA |= this.popByte();
            this.ORA();
        },

        i0a: () => {
            setCarryFlagFromBit7(this.regA);
            this.regA = (this.regA << 1) & 0xff;
            this.ASL(this.regA);
        },

        i0d: () => {
            this.regA |= this.memory.get(this.popWord());
            this.ORA();
        },

        i0e: () => {
            let addr = popWord();
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            this.memory.storeByte(addr, value);
            this.ASL(value);
        },

        i10: () => {
            let offset = this.popByte();
            if (!negativeSet()) {
                jumpBranch(offset);
            }
            //BPL
        },

        i11: () => {
            let zp = this.popByte();
            let value = this.memory.getWord(zp) + this.regY;
            this.regA |= this.memory.get(value);
            this.ORA();
        },

        i15: () => {
            let addr = (popByte() + this.regX) & 0xff;
            this.regA |= this.memory.get(addr);
            this.ORA();
        },

        i16: () => {
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            this.memory.storeByte(addr, value);
            this.ASL(value);
        },

        i18: () => {
            CLC();
        },

        i19: () => {
            let addr = popWord() + this.regY;
            this.regA |= this.memory.get(addr);
            this.ORA();
        },

        i1d: () => {
            let addr = popWord() + this.regX;
            this.regA |= this.memory.get(addr);
            this.ORA();
        },

        i1e: () => {
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            this.memory.storeByte(addr, value);
            this.ASL(value);
        },

        i20: () => {
            let addr = popWord();
            let currAddr = this.regPC - 1;
            stackPush(((currAddr >> 8) & 0xff));
            stackPush((currAddr & 0xff));
            this.regPC = addr;
            //JSR
        },

        i21: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr);
            this.regA &= value;
            this.AND()();
        },

        i24: () => {
            let zp = this.popByte();
            let value = this.memory.get(zp);
            BIT(value);
        },

        i25: () => {
            let zp = this.popByte();
            this.regA &= this.memory.get(zp);
            this.AND()();
        },

        i26: () => {
            let sf = carrySet();
            let addr = this.popByte();
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            value |= sf;
            this.memory.storeByte(addr, value);
            this.ROL(value);
        },

        i28: () => {
            this.regP = stackPop() | 0x30; // There is no B bit!
            //PLP
        },

        i29: () => {
            this.regA &= this.popByte();
            this.AND()();
        },

        i2a: () => {
            let sf = carrySet();
            setCarryFlagFromBit7(this.regA);
            this.regA = (this.regA << 1) & 0xff;
            this.regA |= sf;
            this.ROL(this.regA);
        },

        i2c: () => {
            let value = this.memory.get(this.popWord());
            BIT(value);
        },

        i2d: () => {
            let value = this.memory.get(this.popWord());
            this.regA &= value;
            this.AND()();
        },

        i2e: () => {
            let sf = carrySet();
            let addr = popWord();
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            value |= sf;
            this.memory.storeByte(addr, value);
            this.ROL(value);
        },

        i30: () => {
            let offset = this.popByte();
            if (negativeSet()) {
                jumpBranch(offset);
            }
            //BMI
        },

        i31: () => {
            let zp = this.popByte();
            let value = this.memory.getWord(zp) + this.regY;
            this.regA &= this.memory.get(value);
            this.AND()();
        },

        i35: () => {
            let addr = (popByte() + this.regX) & 0xff;
            this.regA &= this.memory.get(addr);
            this.AND()();
        },

        i36: () => {
            let sf = carrySet();
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            value |= sf;
            this.memory.storeByte(addr, value);
            this.ROL(value);
        },

        i38: () => {
            SEC();
        },

        i39: () => {
            let addr = popWord() + this.regY;
            let value = this.memory.get(addr);
            this.regA &= value;
            this.AND()();
        },

        i3d: () => {
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            this.regA &= value;
            this.AND()();
        },

        i3e: () => {
            let sf = carrySet();
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            setCarryFlagFromBit7(value);
            value = (value << 1) & 0xff;
            value |= sf;
            this.memory.storeByte(addr, value);
            this.ROL(value);
        },

        i40: () => {
            this.regP = stackPop() | 0x30; // There is no B bit!
            this.regPC = stackPop() | (stackPop() << 8);
            //RTI
        },

        i41: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let value = this.memory.getWord(zp);
            this.regA ^= this.memory.get(value);
            this.EOR();
        },

        i45: () => {
            let addr = this.popByte() & 0xff;
            let value = this.memory.get(addr);
            this.regA ^= value;
            this.EOR();
        },

        i46: () => {
            let addr = this.popByte() & 0xff;
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            this.memory.storeByte(addr, value);
            this.LSR(value);
        },

        i48: () => {
            stackPush(this.regA);
            //PHA
        },

        i49: () => {
            this.regA ^= this.popByte();
            this.EOR();
        },

        i4a: () => {
            setCarryFlagFromBit0(this.regA);
            this.regA = this.regA >> 1;
            this.LSR(this.regA);
        },

        i4c: () => {
            this.regPC = popWord();
            //JMP
        },

        i4d: () => {
            let addr = popWord();
            let value = this.memory.get(addr);
            this.regA ^= value;
            this.EOR();
        },

        i4e: () => {
            let addr = popWord();
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            this.memory.storeByte(addr, value);
            this.LSR(value);
        },

        i50: () => {
            let offset = this.popByte();
            if (!overflowSet()) {
                jumpBranch(offset);
            }
            //BVC
        },

        i51: () => {
            let zp = this.popByte();
            let value = this.memory.getWord(zp) + this.regY;
            this.regA ^= this.memory.get(value);
            this.EOR();
        },

        i55: () => {
            let addr = (popByte() + this.regX) & 0xff;
            this.regA ^= this.memory.get(addr);
            this.EOR();
        },

        i56: () => {
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            this.memory.storeByte(addr, value);
            this.LSR(value);
        },

        i58: () => {
            this.regP &= ~0x04;
            throw new Erthis.ROR("Interrupts not implemented");
            //CLI
        },

        i59: () => {
            let addr = popWord() + this.regY;
            let value = this.memory.get(addr);
            this.regA ^= value;
            this.EOR();
        },

        i5d: () => {
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            this.regA ^= value;
            this.EOR();
        },

        i5e: () => {
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            this.memory.storeByte(addr, value);
            this.LSR(value);
        },

        i60: () => {
            this.regPC = (stackPop() | (stackPop() << 8)) + 1;
            //RTS
        },

        i61: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr);
            testADC(value);
            //ADC
        },

        i65: () => {
            let addr = this.popByte();
            let value = this.memory.get(addr);
            testADC(value);
            //ADC
        },

        i66: () => {
            let sf = carrySet();
            let addr = this.popByte();
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            if (sf) {
                value |= 0x80;
            }
            this.memory.storeByte(addr, value);
            this.ROR(value);
        },

        i68: () => {
            this.regA = stackPop();
            setNVflagsForRegA();
            //PLA
        },

        i69: () => {
            let value = this.popByte();
            testADC(value);
            //ADC
        },

        i6a: () => {
            let sf = carrySet();
            setCarryFlagFromBit0(this.regA);
            this.regA = this.regA >> 1;
            if (sf) {
                this.regA |= 0x80;
            }
            this.ROR(this.regA);
        },

        i6c: () => {
            this.regPC = this.memory.getWord(this.popWord());
            //JMP
        },

        i6d: () => {
            let addr = popWord();
            let value = this.memory.get(addr);
            testADC(value);
            //ADC
        },

        i6e: () => {
            let sf = carrySet();
            let addr = popWord();
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            if (sf) {
                value |= 0x80;
            }
            this.memory.storeByte(addr, value);
            this.ROR(value);
        },

        i70: () => {
            let offset = this.popByte();
            if (overflowSet()) {
                jumpBranch(offset);
            }
            //BVS
        },

        i71: () => {
            let zp = this.popByte();
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr + this.regY);
            testADC(value);
            //ADC
        },

        i75: () => {
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            testADC(value);
            //ADC
        },

        i76: () => {
            let sf = carrySet();
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            if (sf) {
                value |= 0x80;
            }
            this.memory.storeByte(addr, value);
            this.ROR(value);
        },

        i78: () => {
            this.regP |= 0x04;
            throw new Erthis.ROR("Interrupts not implemented");
            //SEI
        },

        i79: () => {
            let addr = popWord();
            let value = this.memory.get(addr + this.regY);
            testADC(value);
            //ADC
        },

        i7d: () => {
            let addr = popWord();
            let value = this.memory.get(addr + this.regX);
            testADC(value);
            //ADC
        },

        i7e: () => {
            let sf = carrySet();
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            setCarryFlagFromBit0(value);
            value = value >> 1;
            if (sf) {
                value |= 0x80;
            }
            this.memory.storeByte(addr, value);
            this.ROR(value);
        },

        i81: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            this.memory.storeByte(addr, this.regA);
            //STA
        },

        i84: () => {
            this.memory.storeByte(popByte(), this.regY);
            //STY
        },

        i85: () => {
            this.memory.storeByte(popByte(), this.regA);
            //STA
        },

        i86: () => {
            this.memory.storeByte(popByte(), this.regX);
            //STX
        },

        i88: () => {
            this.regY = (this.regY - 1) & 0xff;
            setNVflagsForRegY();
            //DEY
        },

        i8a: () => {
            this.regA = this.regX & 0xff;
            setNVflagsForRegA();
            //TXA
        },

        i8c: () => {
            this.memory.storeByte(this.popWord(), this.regY);
            //STY
        },

        i8d: () => {
            this.memory.storeByte(this.popWord(), this.regA);
            //STA
        },

        i8e: () => {
            this.memory.storeByte(this.popWord(), this.regX);
            //STX
        },

        i90: () => {
            let offset = this.popByte();
            if (!carrySet()) {
                jumpBranch(offset);
            }
            //BCC
        },

        i91: () => {
            let zp = this.popByte();
            let addr = this.memory.getWord(zp) + this.regY;
            this.memory.storeByte(addr, this.regA);
            //STA
        },

        i94: () => {
            this.memory.storeByte((popByte() + this.regX) & 0xff, this.regY);
            //STY
        },

        i95: () => {
            this.memory.storeByte((popByte() + this.regX) & 0xff, this.regA);
            //STA
        },

        i96: () => {
            this.memory.storeByte((popByte() + this.regY) & 0xff, this.regX);
            //STX
        },

        i98: () => {
            this.regA = this.regY & 0xff;
            setNVflagsForRegA();
            //TYA
        },

        i99: () => {
            this.memory.storeByte(this.popWord() + this.regY, this.regA);
            //STA
        },

        i9a: () => {
            this.regSP = this.regX & 0xff;
            //TXS
        },

        i9d: () => {
            let addr = popWord();
            this.memory.storeByte(addr + this.regX, this.regA);
            //STA
        },

        ia0: () => {
            this.regY = this.popByte();
            this.LDY();
        },

        ia1: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            this.regA = this.memory.get(addr);
            this.LDA();
        },

        ia2: () => {
            this.regX = this.popByte();
            this.LDX();
        },

        ia4: () => {
            this.regY = this.memory.get(popByte());
            this.LDY();
        },

        ia5: () => {
            this.regA = this.memory.get(popByte());
            this.LDA();
        },

        ia6: () => {
            this.regX = this.memory.get(popByte());
            this.LDX();
        },

        ia8: () => {
            this.regY = this.regA & 0xff;
            setNVflagsForRegY();
            //TAY
        },

        ia9: () => {
            this.regA = this.popByte();
            this.LDA();
        },

        iaa: () => {
            this.regX = this.regA & 0xff;
            setNVflagsForRegX();
            //TAX
        },

        iac: () => {
            this.regY = this.memory.get(this.popWord());
            this.LDY();
        },

        iad: () => {
            this.regA = this.memory.get(this.popWord());
            this.LDA();
        },

        iae: () => {
            this.regX = this.memory.get(this.popWord());
            this.LDX();
        },

        ib0: () => {
            let offset = this.popByte();
            if (carrySet()) {
                jumpBranch(offset);
            }
            //BCS
        },

        ib1: () => {
            let zp = this.popByte();
            let addr = this.memory.getWord(zp) + this.regY;
            this.regA = this.memory.get(addr);
            this.LDA();
        },

        ib4: () => {
            this.regY = this.memory.get((popByte() + this.regX) & 0xff);
            this.LDY();
        },

        ib5: () => {
            this.regA = this.memory.get((popByte() + this.regX) & 0xff);
            this.LDA();
        },

        ib6: () => {
            this.regX = this.memory.get((popByte() + this.regY) & 0xff);
            this.LDX();
        },

        ib8: () => {
            CLV();
        },

        ib9: () => {
            let addr = popWord() + this.regY;
            this.regA = this.memory.get(addr);
            this.LDA();
        },

        iba: () => {
            this.regX = this.regSP & 0xff;
            this.LDX();
            //TSX
        },

        ibc: () => {
            let addr = popWord() + this.regX;
            this.regY = this.memory.get(addr);
            this.LDY();
        },

        ibd: () => {
            let addr = popWord() + this.regX;
            this.regA = this.memory.get(addr);
            this.LDA();
        },

        ibe: () => {
            let addr = popWord() + this.regY;
            this.regX = this.memory.get(addr);
            this.LDX();
        },

        ic0: () => {
            let value = this.popByte();
            doCompare(this.regY, value);
            //CPY
        },

        ic1: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr);
            doCompare(this.regA, value);
            //CPA
        },

        ic4: () => {
            let value = this.memory.get(popByte());
            doCompare(this.regY, value);
            //CPY
        },

        ic5: () => {
            let value = this.memory.get(popByte());
            doCompare(this.regA, value);
            //CPA
        },

        ic6: () => {
            let zp = this.popByte();
            DEC(zp);
        },

        ic8: () => {
            this.regY = (this.regY + 1) & 0xff;
            setNVflagsForRegY();
            //INY
        },

        ic9: () => {
            let value = this.popByte();
            doCompare(this.regA, value);
            //CMP
        },

        ica: () => {
            this.regX = (this.regX - 1) & 0xff;
            setNVflagsForRegX();
            //DEX
        },

        icc: () => {
            let value = this.memory.get(this.popWord());
            doCompare(this.regY, value);
            //CPY
        },

        icd: () => {
            let value = this.memory.get(this.popWord());
            doCompare(this.regA, value);
            //CPA
        },

        ice: () => {
            let addr = popWord();
            DEC(addr);
        },

        id0: () => {
            let offset = this.popByte();
            if (!zeroSet()) {
                jumpBranch(offset);
            }
            //BNE
        },

        id1: () => {
            let zp = this.popByte();
            let addr = this.memory.getWord(zp) + this.regY;
            let value = this.memory.get(addr);
            doCompare(this.regA, value);
            //CMP
        },

        id5: () => {
            let value = this.memory.get((popByte() + this.regX) & 0xff);
            doCompare(this.regA, value);
            //CMP
        },

        id6: () => {
            let addr = (popByte() + this.regX) & 0xff;
            DEC(addr);
        },

        id8: () => {
            this.regP &= 0xf7;
            //CLD
        },

        id9: () => {
            let addr = popWord() + this.regY;
            let value = this.memory.get(addr);
            doCompare(this.regA, value);
            //CMP
        },

        idd: () => {
            let addr = popWord() + this.regX;
            let value = this.memory.get(addr);
            doCompare(this.regA, value);
            //CMP
        },

        ide: () => {
            let addr = popWord() + this.regX;
            DEC(addr);
        },

        ie0: () => {
            let value = this.popByte();
            doCompare(this.regX, value);
            //CPX
        },

        ie1: () => {
            let zp = (popByte() + this.regX) & 0xff;
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr);
            testSBC(value);
            //SBC
        },

        ie4: () => {
            let value = this.memory.get(popByte());
            doCompare(this.regX, value);
            //CPX
        },

        ie5: () => {
            let addr = this.popByte();
            let value = this.memory.get(addr);
            testSBC(value);
            //SBC
        },

        ie6: () => {
            let zp = this.popByte();
            INC(zp);
        },

        ie8: () => {
            this.regX = (this.regX + 1) & 0xff;
            setNVflagsForRegX();
            //INX
        },

        ie9: () => {
            let value = this.popByte();
            testSBC(value);
            //SBC
        },

        iea: () => {
            //NOP
        },

        i42: () => {
            //WDM  -- pseudo op for emulator: arg 0 to output A to message box
            let value = this.popByte();
            if (value == 0)
                message(this.node, String.fromCharCode(this.regA));
        },

        iec: () => {
            let value = this.memory.get(this.popWord());
            doCompare(this.regX, value);
            //CPX
        },

        ied: () => {
            let addr = popWord();
            let value = this.memory.get(addr);
            testSBC(value);
            //SBC
        },

        iee: () => {
            let addr = popWord();
            INC(addr);
        },

        if0: () => {
            let offset = this.popByte();
            if (zeroSet()) {
                jumpBranch(offset);
            }
            //BEQ
        },

        if1: () => {
            let zp = this.popByte();
            let addr = this.memory.getWord(zp);
            let value = this.memory.get(addr + this.regY);
            testSBC(value);
            //SBC
        },

        if5: () => {
            let addr = (popByte() + this.regX) & 0xff;
            let value = this.memory.get(addr);
            testSBC(value);
            //SBC
        },

        if6: () => {
            let addr = (popByte() + this.regX) & 0xff;
            INC(addr);
        },

        if8: () => {
            this.regP |= 8;
            //SED
        },

        if9: () => {
            let addr = popWord();
            let value = this.memory.get(addr + this.regY);
            testSBC(value);
            //SBC
        },

        ifd: () => {
            let addr = popWord();
            let value = this.memory.get(addr + this.regX);
            testSBC(value);
            //SBC
        },

        ife: () => {
            let addr = popWord() + this.regX;
            INC(addr);
        },

        ierr: () => {
            message(this.node, "Address $" + addr2hex(this.regPC) + " - unknown opcode");
            this.codeRunning = false;
        }
    }

    stackPush(value) {
        this.memory.set((this.regSP & 0xff) + 0x100, value & 0xff);
        this.regSP--;
        if (this.regSP < 0) {
            this.regSP &= 0xff;
            message(this.node, "6502 Stack filled! Wrapping...");
        }
    }

    stackPop() {
        let value;
        this.regSP++;
        if (this.regSP >= 0x100) {
            this.regSP &= 0xff;
            message(this.node, "6502 Stack emptied! Wrapping...");
        }
        value = this.memory.get(this.regSP + 0x100);
        return value;
    }

    // Pops a byte
    popByte() {
        return (this.memory.get(this.regPC++) & 0xff);
    }

    // Pops a little-endian word
    popWord() {
        return this.popByte() + (this.popByte() << 8);
    }

    // Executes the assembled code
    runBinary() {
        if (this.codeRunning) {
            // Switch OFF everything
            stop();
            this.ui.stop();
        } else {
            this.ui.play();
            this.codeRunning = true;
            window.requestAnimationFrame(()=>{this.multiExecute()});
        }
    }

    multiExecute() {
        if (!this.debug) {
            // use a prime number of iterations to avoid aliasing effects
            let s = speed.value;
            for (let w = 0; w < s; w++) {
                this.execute();
            }
        }
        this.updateDebugInfo();

        if (this.codeRunning) {
            window.requestAnimationFrame(()=>{this.multiExecute()});
        }
    }


    executeNextInstruction() {
        let instructionName = this.popByte().toString(16).toLowerCase();
        if (instructionName.length === 1) {
            instructionName = '0' + instructionName;
        }
        let instruction = this.instructions['i' + instructionName];

        if (instruction) {
            instruction();
        } else {
            this.instructions.ierr();
        }
    }

    // Executes one instruction. This is the main part of the CPU simulator.
    execute(debugging) {
        if (!this.codeRunning && !debugging) {
            return;
        }

        this.executeNextInstruction();

        if ((this.regPC === 0) || (!this.codeRunning && !debugging)) {
            stop();
            message(this.node, "Program end at PC=$" + addr2hex(this.regPC - 1));
            this.ui.stop();
        }
    }

    updateMonitor() {
        if (this.monitoring) {
            let start = parseInt(this.node.querySelector('.start').value, 16);
            let length = parseInt(this.node.querySelector('.length').value, 16);
            let end = start + length - 1;
            let monitorNode = this.node.querySelector('.monitor code');

            if (!isNaN(start) && !isNaN(length) && start >= 0 && length > 0 && end <= 0xffff) {
                monitorNode.innerHTML = "       0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f\n" + this.memory.format(start, length);
            } else {
                monitorNode.innerHTML = 'Cannot monitor this range. Valid ranges are between $0000 this.AND() $ffff, inclusive.';
            }
        }
    }

    handleMonitorRangeChange() {
        let startElem = this.node.querySelector('.start');
        let lengthElem = this.node.querySelector('.length');
        let start = parseInt(startElem.value, 16);
        let length = parseInt(lengthElem.value, 16);
        let end = start + length - 1;

        startElem.classList.remove('monitor-invalid');
        lengthElem.classList.remove('monitor-invalid');

        if (isNaN(start) || start < 0 || start > 0xffff)
            startElem.classList.add('monitor-invalid');
        else if (isNaN(length) || end > 0xffff)
            lengthElem.classList.add('monitor-invalid');
    }

    // Execute one instruction this.AND() print values
    debugExec() {
        //if (this.codeRunning) {
        this.execute(true);
        //}
        this.updateDebugInfo();
    }

    updateDebugInfo() {
        let html = "A=$" + num2hex(this.regA) + " X=$" + num2hex(this.regX) + " Y=$" + num2hex(this.regY) + "<br />";
        html += "SP=$" + num2hex(this.regSP) + " PC=$" + addr2hex(this.regPC);
        html += "<br />";
        html += "NV-BDIZC<br />";
        for (let i = 7; i >= 0; i--) {
            html += this.regP >> i & 1;
        }
        this.node.querySelector('.minidebugger').innerHTML = html;

        this.updateMonitor();
    }

    // gotoAddr() - Set PC to address (or address of label)
    gotoAddr() {
        let inp = prompt("Enter address or label", "");
        let addr = 0;
        if (labels.find(inp)) {
            addr = labels.getPC(inp);
        } else {
            if (inp.match(/^0x[0-9a-f]{1,4}$/i)) {
                inp = inp.replace(/^0x/, "");
                addr = parseInt(inp, 16);
            } else if (inp.match(/^\$[0-9a-f]{1,4}$/i)) {
                inp = inp.replace(/^\$/, "");
                addr = parseInt(inp, 16);
            }
        }
        if (addr === 0) {
            message(this.node, "Unable to find/parse given address/label");
        } else {
            this.regPC = addr;
        }
        this.updateDebugInfo();
    }


    stopDebugger() {
        this.debug = false;
    }

    enableDebugger() {
        this.debug = true;
        if (this.codeRunning) {
            this.updateDebugInfo();
        }
    }

    // reset() - Reset CPU this.AND() this.memory.
    reset() {
        this.display.reset();
        this.screen.reset();
        for (let i = 0; i < 0x600; i++) { // clear ZP, stack this.AND() screen
            this.memory.set(i, 0x00);
        }
        for (let i = 0xf000; i < 0xf000 + 80 * 25; i++) { // clear text screen
            this.memory.set(i, 0x00);
        }
        this.regA = this.regX = this.regY = 0;
        this.regPC = 0x600;
        this.regSP = 0xff;
        this.regP = 0x30;
        this.updateDebugInfo();
    }

    stop() {
        this.codeRunning = false;
        message(this.node, "\nStopped\n");
    }

    toggleMonitor() {
        this.monitoring = !this.monitoring;
    }

    toggleConsole() {
        this.showConsole = !this.showConsole;
    }

    setDebugger(state) {
        state ? this.enableDebugger() : this.stopDebugger();
    }

    /*return {
      runBinary: runBinary,
      enableDebugger: enableDebugger,
      stopDebugger: stopDebugger,
      setDebugger: (state) => { state ? enableDebugger() : stopDebugger() },
      debugExec: debugExec,
      gotoAddr: gotoAddr,
      reset: reset,
      stop: stop,
      toggleMonitor: toggleMonitor,
      toggleConsole: toggleConsole,
      handleMonitorRangeChange: handleMonitorRangeChange
    };*/
}