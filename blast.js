require('dotenv').config()
var fs = require("fs");
var CronJob = require('cron').CronJob;
var besc_client = require("besc-ess-nodejs-client");
var formula= {};
var jsBeautify = require('js-beautify').js;
var configFile, config;

var keypair = new besc_client.keyPair(process.env.PROJECT_ID, process.env.APIKEY);

const ProjectData = besc_client.ProjectData;
const Device = besc_client.Device;

var host_client;
if(process.env.BESC_ESS_API_PATH){
    console.log("Using custom ESS API URL");
    host_client = new besc_client.Host(process.env.BESC_ESS_API_PATH);
}
else{
    console.log("Using default ESS API URL");
    host_client = besc_client.Host.createDefault();
}


var ModbusRTU = require("modbus-serial");
var client = {};

var fp = require('ieee-float');
var { evaluate, round } = require("mathjs");

console.error = function(d){

    var datetime = new Date().toLocaleString('en-GB');

    var formatedData = jsBeautify(`${datetime}:` + d);

    const data = new Uint8Array(Buffer.from("\n"+formatedData));

    fs.appendFileSync('./error.log', data);
}

var reconCount = 0;
var currentPoll = {};

function saveLog(savingText){

    var datetime = new Date().toLocaleString('en-GB');

    var formatedData = jsBeautify(`${datetime}:` + savingText);

    const data = new Uint8Array(Buffer.from("\n"+formatedData));

    fs.appendFileSync('./logs.log', data);
}

function convertArrayToSimpleObject(array, objKey, objValue){

    var tempObj = {};

    for(var x =0; x < array.length; x++){
        tempObj[array[x][objKey]] = array[x][objValue];
    }

    return tempObj;
}

const reConnection = async(doCount = true)=>{

    if(reconCount === 3){
        throw 'Reconnection count reached.';
    }

    if(doCount){
        reconCount++;
    }

    if(client && client.isOpen){
        saveLog("Reconnecting now");
        client.close();

        await createConnection(currentPoll);
    }

    return true;
}

const getReading = async (polls) => {

    reconCount = 0;

    var readings = [];

    for (var x = 0; x < polls.length; x++) {
        try {
            var poll = polls[x];

            currentPoll = poll;
            
            if(client && client.isOpen){
                client.close();
            }

            await createConnection(poll);

            /*
            if(Object.keys(clients).length > 0 ){ // && poll.type.toLowerCase() === "serial"
                //saveLog("Closing now");
                //client.close();    
                client = clients[x];
            }
            else{
                await createConnection(poll);

                if(poll.type.toLowerCase() === "serial"){
                    clients[x] = client;
                }
            }
            */

            //saveLog(client);

            var singlePollReading = await getDevicesReading(poll.Devices);    

            Array.prototype.push.apply(readings, singlePollReading);
            

            //saveLog(client.isOpen);

            
            if(client && client.isOpen){
                saveLog("Connection closed");
                client.close();
            }
            
        }
        catch (error) {
            saveLog(`Throw at getReading: ${error}`);
        }
    }

    return readings;
}

const createConnection = async (pollConfig) => {

    //var tempClient;

    try {

        client = await new ModbusRTU();

        if (pollConfig.type.toLowerCase() === "serial") {

            saveLog("\nConnecting with Serial");

            var serialOptions = {
                baudRate: pollConfig.baudRate,
                dataBits: pollConfig.dataBits,
                stopBits: pollConfig.stopBits,
                parity: pollConfig.parity
            };

            if (pollConfig.protocol.toLowerCase() === "rtu") {
                await client.connectRTUBuffered(pollConfig.port, serialOptions);
            }
            else if (pollConfig.protocol.toLowerCase() === "ascii") {
                await client.connectAsciiSerial(pollConfig.port, serialOptions);
            }
            else {
                throw 'Invalid protocol type found';
            }
        }
        else if (pollConfig.type.toLowerCase() === "tcp") {
            saveLog("\nConnecting with TCP");
            await client.connectTcpRTUBuffered(pollConfig.host, { port: pollConfig.port });
        }
        else {
            throw 'Invalid poll type found';
        }

        client.setTimeout(5000);

        //saveLog(client);

        //return tempClient;
        return true;

    } catch (error) {
        //if(tempClient && tempClient.isOpen){
        //tempClient.close();
        //}

        if(reconCount === 3){
            saveLog(`Throw at createConnection: ${error}`);
            throw error;
        }
        else{
            reconCount++;

            if (client && client.isOpen) {
                client.close();
            }

            createConnection(pollConfig);
        }
    }
}

const getDevicesReading = async (devices) => {

    var singlePollReading = [];

    for (var x = 0; x < devices.length; x++) {

        try {

            /*
            if(x > 0 && currentPoll.type.toLowerCase() === "serial"){
                await reConnection(false);
            }
            */

            var device = devices[x];

            var totalReadingBit = device.registerLength * device.registerBit;

            if (totalReadingBit > 64) {
                throw 'Total Register Bit cannot be more than 64 bit ';
            }

            //saveLog(client);

            var fetchedReading = await getMeterValue(device.deviceNum, device.registerLength, device.address, device.registerType);

            var meterValue;
            if (device.dataType.toLowerCase() === "int") {

                switch (totalReadingBit) {
                    case 16:
                        if (device.endian.toLowerCase() === "le") {
                            meterValue = fetchedReading.buffer.readIntLE(0, 2);
                        }
                        else if (device.endian.toLowerCase() === "be") {
                            meterValue = fetchedReading.buffer.readIntBE(0, 2);
                        }

                        break;
                    case 32:
                        if (device.endian.toLowerCase() === "le") {
                            meterValue = fetchedReading.buffer.readIntLE(0, 4);
                        }
                        else if (device.endian.toLowerCase() === "be") {
                            meterValue = fetchedReading.buffer.readIntBE(0, 4);
                        }

                        break;
                    case 64:
                        throw '64bit reading currently not supported';
                        break;

                    default:
                        throw 'Invalid bit reading found.' + totalReadingBit;
                        break;
                }
            }
            else if (device.dataType.toLowerCase() === "floating_point") {
                var bufferCp = Buffer.from(fetchedReading.buffer);

                var swapped16 = bufferCp.swap16();

                var value = new Uint32Array(swapped16);

                var val;

                if (device.endian.toLowerCase() === "be") {
                    val = fp.readFloatLE(value);
                }
                else if (device.endian.toLowerCase() === "le") {
                    val = fp.readFloatBE(value);
                }
                else {
                    throw 'Invalid endian found';
                }

                meterValue = round(val, 3);
            }
            else if (device.dataType.toLowerCase() === "float") {

                var floatValue;

                if (device.endian.toLowerCase() === "be") {
                    floatValue = fetchedReading.buffer.readFloatBE(0);
                }
                else if (device.endian.toLowerCase() === "le") {
                    floatValue = fetchedReading.buffer.readFloatLE(0);
                }

                meterValue = round(floatValue, 3);
            }
            else {
                throw {name:"INVALID TYPE", error:'Invalid dataType found'};
            }

            if (device.mod) {

                var obj = { reading: meterValue };

                meterValue = evaluate(device.mod, obj);
            }

            var meterReading = { name: device.name, energy: meterValue};

            singlePollReading.push(meterReading);

            await sleep(100);

        } catch (error) {
            saveLog(`Throw at getDevicesReading: ` + JSON.stringify(error));
            saveLog(error);
            
            if(error.name === "TransactionTimedOutError"){
                try {
                    await reConnection();
                    return getDevicesReading(devices);  
                } catch (error) {
                    throw error;
                }
            }
            else if(error.name === "PortNotOpenError"){
                throw error;
            }
        }
    }
    return singlePollReading;
}

const getMeterValue = async (id, length, registerAddress, registerType) => {
    try {
        await client.setID(id);

        var val;

        if (registerType == 3) {
            val = await client.readHoldingRegisters(registerAddress, length);
        }
        else if (registerType == 4) {
            val = await client.readInputRegisters(registerAddress, length);
        }
        else {
            throw 'Invalid registerType'
        }

        // val.data[0]

        return val;
    } catch (e) {
        throw e;
    }
}


const calculateEnergy = async (devicesReading) => {
    var newReading = [];
    var oldReading = [];
    var finalReading = {
        name: "Chiller", 
        EnergyUsage : 0, 
        Saved : 0, 
        Efficiency: 0,
        Formula: []
    };

    var result1 = 0, result2 = 0;

    var Chiller_Efficiency = 0, CHWP_Efficiency = 0, CDWP_Efficiency = 0, CT_Efficiency = 0;
    var TotalEfficiency= 0;

    var devicesReadingObj = convertArrayToSimpleObject(devicesReading, "name", "energy");

    //Get baseline reading from contract
    //const baseline = await besc_client.helper.getBaseline(host_client, keypair);
    const baseline = 1.17;

    //Get formula from contract
    var formula = await besc_client.helper.getAllFormulas(host_client, keypair);

    var BTU_Reading = 0;
    var previousBTU_Reading = 0;

    BTU_Reading = devicesReadingObj["BTU"];       

    for (var x = 0; x < devicesReading.length; x++) {
        var tempDeviceReading = devicesReading[x];

        try{
            if(tempDeviceReading.name != "BTU"){
                
                formula["Efficiency"].applyFieldsValues({"DeviceInput": tempDeviceReading.energy, "BTU": BTU_Reading});
                devicesReading[x].Efficiency = formula["Efficiency"].calculate();

                switch (tempDeviceReading.name) {
                    case "Chiller":
                        Chiller_Efficiency = devicesReading[x].Efficiency;
                        break;
                    case "CHWP":
                        CHWP_Efficiency = devicesReading[x].Efficiency;
                        break;

                    case "CDWP":
                        CDWP_Efficiency = devicesReading[x].Efficiency;
                        break;

                    case "CT":
                        CT_Efficiency = devicesReading[x].Efficiency;
                        break;
                
                    default:
                        break;
                }
            }
        }
        catch(error){
            console.log(error);
        }
    }
    saveLog("\n\nCalculated Efficiency");
    saveLog(JSON.stringify(devicesReading));

    formula["Total_Efficiency"].applyFieldsValues({
        "Chiller_Efficiency": Chiller_Efficiency, 
        "CHWP_Efficiency": CHWP_Efficiency,
        "CDWP_Efficiency" : CDWP_Efficiency,
        "CT_Efficiency" : CT_Efficiency
    });

    TotalEfficiency = formula["Total_Efficiency"].calculate();

    finalReading.Efficiency = TotalEfficiency;

    if (fs.existsSync("./deviceData.json")) {

        try {
            
            var previousDeviceData = fs.readFileSync("./deviceData.json");
            var previousReading = JSON.parse(previousDeviceData);

            if(previousReading.Devices){

                var previousDevicesReadingObj = convertArrayToSimpleObject(previousReading.Devices, "name", "energy");

                saveLog("\n\nPrevious Chiller Reading:" + previousDevicesReadingObj["Chiller"]);

                finalReading.EnergyUsage = devicesReadingObj["Chiller"] - previousDevicesReadingObj["Chiller"];

                previousBTU_Reading = previousDevicesReadingObj["BTU"];

                saveLog("\n\nPrevious BTU Reading:" + previousBTU_Reading);

                formula["Hourly_1"].applyFieldsValues({
                    "Baseline": baseline, 
                    "Total_Efficiency": TotalEfficiency
                });
            
                result1 = formula["Hourly_1"].calculate();
            
                formula["Hourly_2"].applyFieldsValues({
                    "BTU_old": previousBTU_Reading, 
                    "BTU_new": BTU_Reading
                });
            
                result2 = formula["Hourly_2"].calculate();

                formula["Hourly_Saving"].applyFieldsValues({
                    "result1": result1, 
                    "result2": result2
                });

                finalReading.Saved = formula["Hourly_Saving"].calculate();

                finalReading.Formula = [
                    formula["Total_Efficiency"],
                    formula["Hourly_1"],
                    formula["Hourly_2"],
                    formula["Hourly_Saving"]
                ];
            }            

        } catch (error) {
            saveLog(JSON.stringify(error));
        }
    }

    newReading = devicesReading;

    //Write data into deviceData.json
    var formatedData = jsBeautify(JSON.stringify({ "Devices": newReading }));

    const data = new Uint8Array(Buffer.from(formatedData));

    fs.writeFileSync('./deviceData.json', data);

    return finalReading;
}

const sendData = async (deviceReading) => {

    var reading = [];

    reading.push(new Device(deviceReading.name, deviceReading.EnergyUsage, deviceReading.Saved, deviceReading.Efficiency, deviceReading.Formula));
   
    var projectData = ProjectData.createWithCurrentTime(
        config.ProjectName,
        reading,
        config.AverageRT,
        config.Location
    );

    try {
        var response = await besc_client.API.sendProjectData(host_client, keypair, projectData);

        return response;
    }
    catch (apiError) {
        saveLog(`Throw at sendData: ${apiError}`);
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if(process.env.REPEAT_EVERY_MINUTES != parseInt(process.env.REPEAT_EVERY_MINUTES)){
    console.log("Trigger minutes must be integer");
    process.exit();
}

var job = new CronJob(`*/${process.env.REPEAT_EVERY_MINUTES} * * * *`, async function () {
    try {

        saveLog("Trying to pull and send data");

        try {
            configFile = fs.readFileSync("./config.json");

            config = JSON.parse(configFile);

        } catch (error) {
            console.error(error);
            process.exit();
        }

        var devicesReading = await getReading(config.Polls);

        saveLog("\n\nDevices Reading:");
        saveLog(JSON.stringify(devicesReading));

        var energyReading = await calculateEnergy(devicesReading);

        saveLog("\n\nCalculated Reading:");
        saveLog(JSON.stringify(energyReading));

        var response = await sendData(energyReading);

        saveLog("\n\nESS API Response:");
        saveLog(JSON.stringify(response));
        
    } catch (error) {
        saveLog(`Throw at cronjob: ${error}`);
    }

    //job.stop();

}, null, false, 'UTC', null, false);


job.start();

console.log("Task started");
