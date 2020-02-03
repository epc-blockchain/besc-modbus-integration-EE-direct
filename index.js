// this file is for testing

// create an empty modbus client
var ModbusRTU = require("modbus-serial");
var client = new ModbusRTU();



var fp = require('ieee-float');
var {evaluate, round} = require("mathjs");

client.setID(1);
// open connection to a serial port
//client.connectRTU("COM1", { baudRate: 9600, parity: 'odd' }, read);

var connection;

(async()=>{
    //await client.connectTcpRTUBuffered("127.0.0.1", { port: 502 });

    var serialOptions = {
        baudRate : 9600, 
        dataBits: 8,
        stopBits: 1,
        parity: "none"
    };

    await client.connectRTUBuffered("COM3", serialOptions );

    read();
})();


// client.connectRTUBuffered("/dev/ttyUSB0", { baudRate: 9600 }, read);


function write() {

    // write the values 0, 0xffff to registers starting at address 1
    // on device number 1.
    client.writeRegisters(1, [0 , 0xffff])
        .then(read);
    
}

function read() {

    // read the 2 registers starting at address 1
    // on device number 1.

    client.setID(1);

    client.readHoldingRegisters(0, 2)
        .then((data)=>{

            console.log(data);

            //console.log(data.buffer.readUInt32BE());

            console.log(data.buffer.readUInt16BE(2));

            //console.log(data.buffer.readFloatBE());

            process.exit();

            var bufferCp = Buffer.from(data.buffer);

            var swapped16 = bufferCp.swap16();

            console.log(swapped16);
            console.log(data.buffer);
            /*
            ArrayBuffer()
            var test = new DataView( new ArrayBuffer(data.buffer), 0, 4);
            console.log(test);
            var value = new Uint32Array(data.buffer, 0, 4);
            console.log(value);
            */

            var value = new Uint32Array(swapped16);

            console.log(value);

            var value2 = new Uint32Array(data.buffer);

            console.log(value2);
            
            //fp.readFloatBE

            //var buffer = Uint8Array.from(data.buffer);

            //console.log(buffer);

            //var buffer2 = Uint16Array.from(buffer);

            //var uint32 = Uint32Array.from(swapped32);

            //console.log(uint32);

            //var bf = new Float32Array(buffer.buffer);

            //var view = new DataView(buffer.buffer);

            //console.log(test);

            //console.log(r);
            //var data1 = view.getFloat32(0, false);

            //console.log(data1);

            //fp.writeFloatBE(output, 1.5);
            // => output = [0, 0, 192, 63]

            //console.log(output);
            //console.log(swapped32);

            var val = fp.readFloatLE(value);

            val = round(val, 3);

            console.log(val);

            //var view1 = new DataView(buffer.buffer);

            //var floatReading = view1.getFloat32(0);

            //console.log(round(floatReading, 3));
            /*
            var val = fp.readFloatBE([143, 63, 119, 190]);

            console.log(val);

            var scope = { a : val};

            var cal = evaluate('a * 10 - 1', scope);

            console.log(cal);
            */
            /*
            var view1 = new DataView(buffer);
            var view2 = new DataView(buffer,12,4); //from byte 12 for the next 4 bytes
            view1.setInt8(12, 42); // put 42 in slot 12

            console.log(view2.getInt8(0));
            */
            //var view = new Int32Array(data.buffer);
            //console.log(view);
        });
}

/*
var fp = require('ieee-float');
var output = [];

fp.writeFloatLE(output, 1.5);
// => output = [0, 0, 192, 63]

var val = fp.readFloatBE(output.reverse());
// => 1.5
*/

