import { open, I2cBus } from 'i2c-bus';
import { EventEmitter } from 'eventemitter3';
import { Buffer } from 'buffer';
import * as debuglib from 'debug';
var debug = debuglib('wekker:backpack');

const REGISTER_DISPLAY_SETUP        = 0x80;
const REGISTER_SYSTEM_SETUP         = 0x20;
const REGISTER_DIMMING              = 0xE0;

const ADDRESS_KEY_DATA              = 0x40;

const HT16K33_CMD_OSCILATOR     = 0x20;
const HT16K33_CMD_OSCILATOR_ON  = 0x01;
const HT16K33_CMD_OSCILATOR_OFF = 0x00;

const HT16K33_CMD_DISPLAY       = 0x80;
const HT16K33_CMD_DISPLAY_ON    = 0x01;
const HT16K33_CMD_DISPLAY_OFF   = 0x00;

const HT16K33_CMD_BRIGHTNESS    = 0xE0;

export enum Blinkrate {
    Off,
    Double,
    Normal,
    Half
}

const UINT16_BUFFER_SIZE = 8;

/**
 * Represents the backpack.
 */
export class Backpack extends EventEmitter {


    private wire: I2cBus;

    private buffer: Uint16Array = new Uint16Array(UINT16_BUFFER_SIZE);

    /**
     * Whether or not the screen is on or off.
     */
    private state: number = HT16K33_CMD_DISPLAY_ON;

    public constructor(bus: number, private address: number) {
        super();

        debug('initializing backpack...');

        this.wire = open(bus, err => {
            if (err == null) {
                debug(`succesfully opened the bus ${bus}`);
                debug(`initializing the segmented display...`);

                // Turn the oscillator on
                this.executeCommand(HT16K33_CMD_OSCILATOR | HT16K33_CMD_OSCILATOR_ON, 'HT16K33_CMD_OSCILATOR_ON')
                    // Turn blink off
                    .then(() => this.setBlinkrate(Blinkrate.Off))
                    .then(() => this.setBrightness(10))
                    .then(() => this.clear())
                    .then(() => {
                        debug(`successfully initialized the segmented display.`);
                        this.emit('ready');
                    })
                    .catch((err: any) => {
                        debug(`unable to complete system startup!!:`, err);
                        this.emit('error', err);
                    });
            }
            else {
                this.emit('error', err);
            }
        });
    }

    public setBlinkrate(rate: Blinkrate): Promise<void> {
        if (rate > Blinkrate.Half) {
            rate = Blinkrate.Off;
        }

        debug(`changing blinkrate to "${Blinkrate[rate]}"...`);
        return this.executeCommand(HT16K33_CMD_DISPLAY | this.state | (rate << 1), 'HT16K33_CMD_DISPLAY');
    }

    /**
     * Set the brightness of the display.
     * 
     * @param brightness A number from 0-15.
     */
    public setBrightness(brightness: number): Promise<void> {
        // brightness 0-15
        if (brightness > 15) {
            brightness = 15;
        }
        if (brightness < 0) {
            brightness = 0;
        }

        debug(`changing brightness to level ${brightness}...`);
        return this.executeCommand(HT16K33_CMD_BRIGHTNESS | brightness, 'HT16K33_CMD_BRIGHTNESS');
    }

    public setBufferBlock(block: number, value: number): void {
        // Updates a single 16-bit entry in the 8*16-bit buffer
        if (block < 0 || block >= UINT16_BUFFER_SIZE) {
            // Prevent buffer overflow
            throw new Error(`Buffer over- or underflow, tried to write block ${block}, which is out of range of 0-${UINT16_BUFFER_SIZE}.`);
        }

        this.buffer[block] = value;
    }

    public writeDisplay(): Promise<void> {
        debug(`writing buffer to display...`);

        var bytes = new Buffer(UINT16_BUFFER_SIZE * 2), // Create a UINT8 buffer for writing to the display
            i = 0;
        this.buffer.forEach(item => {
            // bytes[i++] = (item & 0xFF);
            // bytes[i++] = ((item >> 8) & 0xFF);
            bytes.writeUInt8(item & 0xFF, i++);
            bytes.writeUInt8(item >> 8, i++);
        });

        return new Promise<void>((resolve, reject) => {
            this.wire.writeI2cBlock(this.address, 0x00, bytes.byteLength, bytes, (err, writtenBytes) => {
                if (err != null) {
                    debug(`[err] unable to write buffer!`, err);
                    reject(err);
                }
                debug(`succesfully wrote buffer with size ${writtenBytes}`);
                resolve();
            });
        });
    }

    public clear(): Promise<void> {
        for (let i = 0; i < UINT16_BUFFER_SIZE; i++) {
            this.buffer[i] = 0;
        }
        return this.writeDisplay();
    }

    /**
     * Execute an command via I2C on the backpack and return the async promise.
     * 
     * @param cmd Command to execute.
     * @param arg Optionally an argument for it.
     */
    private executeCommand(cmd: number, debugName: string = 'command', arg: number = 0x00): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.wire.writeByte(this.address, cmd, arg, err => {
                if (err != null) {
                    debug(`[err] unable to execute command "${debugName}"!`, err);
                    reject(err);
                }
                debug(`succesfully executed command "${debugName}"`);
                resolve();
            });
        });
    }
}
