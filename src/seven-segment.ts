import { Backpack } from './backpack';

import * as debuglib from 'debug';
var debug = debuglib('wekker:seven-segment');

export class SevenSegment {
    public display: Backpack;

    public constructor(bus: number = 0, address: number = 0x70) {
        this.display = new Backpack(bus, address);
    }

    /**
     * 
     * @param charNumber Sets a single decimal or hexademical value (0..9 and A..F)
     * @param index 
     * @param dot 
     */
    public writeDigit(charNumber: number, index: number, dot: number = 0): void {
        // Sets a single decimal or hexademical value (0..9 and A..F)
        if (charNumber > 7) {
            return;
        }
        if (index > 0xF) {
            return;
        }

        // Set the appropriate digit
        this.display.setBufferBlock(charNumber, digits[index] | (dot << 7));
    }

    public writeDigitRaw(charNumber: number, value: number): void {
        // Sets a digit using the raw 16-bit value"
        if (charNumber > 7) {
            return;
        }

        // Set the appropriate digit
        this.display.setBufferBlock(charNumber, value);
    }

    /**
     * Enables or disables the *middle* colon (on or off).
     * 
     * There are more colons available to be set on or off, however, you should be able to turn these on or off using the ascii writing mechanism.
     * WARN: Overwrites any previous states and the other colons.
     * 
     * @param state Whether the middle colon should be on or off. 
     */
    public setColon(state: boolean): void {
        if (state) {
            //this.display.setBufferBlock(2, 0xFFFF);
            this.display.setBufferBlock(2, 0x2);
        }
        else {
            this.display.setBufferBlock(2, 0);
        }
    }

    /**
     * Write the (current) time to the display.
     * 
     * @param date If you do not want the current time to be written, give your own date object.
     */
    public writeTime(date: Date = new Date): void {
        var date = new Date(),
            hour = date.getHours(),
            minute = date.getMinutes();

        debug(`wrote time: ${Math.floor(hour / 10)}${hour % 10}:${Math.floor(minute / 10)}${minute % 10}`);

        // Hours
        this.writeDigit(0, Math.floor(hour / 10));
        this.writeDigit(1, hour % 10);

        // Minutes
        this.writeDigit(3, Math.floor(minute / 10));
        this.writeDigit(4, minute % 10);

        // Colon
        this.setColon(true);
    }

    /**
     * Clears the display.
     */
    public clear(): Promise<void> {
        return this.display.clear();
    }

    /**
     * Write the current framebuffer to the display.
     */
    public flush(): Promise<void> {
        return this.display.writeDisplay();
    }
}

/**
 * Map of ascii charcters to uint8 bytes
 */
export const NumberTable: { [char: string]: number } = {
	'0': 0x3F, /* 0 */
	'1': 0x06, /* 1 */
	'2': 0x5B, /* 2 */
	'3': 0x4F, /* 3 */
	'4': 0x66, /* 4 */
	'5': 0x6D, /* 5 */
	'6': 0x7D, /* 6 */
	'7': 0x07, /* 7 */
	'8': 0x7F, /* 8 */
	'9': 0x6F, /* 9 */
	'a': 0x77, /* a */
	'b': 0x7C, /* b */
	'C': 0x39, /* C */
	'd': 0x5E, /* d */
	'E': 0x79, /* E */
	'F': 0x71, /* F */
};

//Hexadecimal character lookup table (0..9, A..F)
const digits = [ 0x3F, 0x06, 0x5B, 0x4F, 0x66, 0x6D, 0x7D, 0x07, 0x7F, 0x6F, 0x77, 0x7C, 0x39, 0x5E, 0x79, 0x71 ];
