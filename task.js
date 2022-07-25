require('dotenv').config()
var fs = require("fs");
var CronJob = require('cron').CronJob;
var besc_client = require("besc-ess-nodejs-client");
var formula= {};
var dbUtils = require('./dbUtils');
var jsBeautify = require('js-beautify').js;
var configFile, config;
var EnergyData = require('./EnergyData');
var DeviceReading = require('./DeviceReading');

var keypair = new besc_client.keyPair(process.env.PROJECT_ID, process.env.APIKEY);

const inputBaseline = parseFloat(process.env.BASELINE);

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

    var dateFileName = new Date().toISOString().substring(0, 10) + ".log";

    fs.appendFileSync('./logs/' + dateFileName, data);
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


const calculateEnergy = async (energyData, previousData, inputBaseline = null, inputFormula = null) => {

    var energyDataObj = EnergyData.parseFromObject(energyData);
    var deviceReading = DeviceReading.parseFromObject(energyData);

    var finalReading = {
        name: "Chiller", 
        EnergyUsage : 0, 
        Saved : 0, 
        Efficiency: 0,
        Chiller_Efficiency: 0, 
        CHWP_Efficiency: 0, 
        CDWP_Efficiency: 0, 
        CT_Efficiency: 0,
        Formula: []
    };

    var result1 = 0, result2 = 0;

    var Chiller_Efficiency = 0, CHWP_Efficiency = 0, CDWP_Efficiency = 0, CT_Efficiency = 0;
    var TotalEfficiency= 0;

    //Get baseline reading from contract
    const baseline = inputBaseline ? inputBaseline : await besc_client.helper.getBaseline(host_client, keypair);
    
    //Get formula from contract
    var formula = inputFormula ? inputFormula : await besc_client.helper.getAllFormulas(host_client, keypair);

    var BTU_Reading = 0;
    var previousBTU_Reading = 0;

    BTU_Reading = energyDataObj.BTU;  
    
    let devicesReading = deviceReading.convertToReadingArray();

    for (var x = 0; x < devicesReading.length; x++) {
        var tempDeviceReading = devicesReading[x];

        try{
            if(tempDeviceReading.name != "BTU"){
                
                formula["Efficiency"].applyFieldsValues({"DeviceInput": tempDeviceReading.reading, "BTU": BTU_Reading});
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

    finalReading.Chiller_Efficiency = Chiller_Efficiency;
    finalReading.CHWP_Efficiency = CHWP_Efficiency;
    finalReading.CDWP_Efficiency = CDWP_Efficiency;
    finalReading.CT_Efficiency = CT_Efficiency;

    TotalEfficiency = formula["Total_Efficiency"].calculate();

    finalReading.Efficiency = TotalEfficiency;

    if (previousData) {

        try {
            var previousReading = EnergyData.parseFromObject(previousData);

            saveLog("\n\nPrevious Chiller Reading:" + previousReading.Chiller);

            
            finalReading.EnergyUsage = energyDataObj.Chiller - previousReading.Chiller;

            previousBTU_Reading = previousReading.BTU;

            saveLog("\n\nPrevious BTU Reading:" + previousBTU_Reading);

            formula["Hourly_1"].applyFieldsValues({
                "Baseline": baseline, 
                "Total_Efficiency": TotalEfficiency
            });
        
            result1 = formula["Hourly_1"].calculate();
        
            formula["Hourly_2"].applyFieldsValues({
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

        } catch (error) {
            saveLog(JSON.stringify(error));
        }
    }

    return finalReading;
}

const sendBatchData = async () => {

    var energyReadings = await dbUtils.queryNotSendEnergyData();

    var sendingData = [];

    for (const energyReading of energyReadings) {
        var energyData = EnergyData.parseFromObject(energyReading);

        var reading = [];

        var formulas = [];

        if(energyData.BTU === null || energyData.BTU === 0 || energyData.Formula === null || energyData.Formula === '' || energyData.Formula === '[]'){
            reading.push(new Device(config.DeviceName, energyData.EnergyUsage, energyData.Saved, energyData.Efficiency, []));
   
            var projectData = new ProjectData(
                energyData.dateTime,
                config.ProjectName,
                reading,
                config.AverageRT,
                config.Location
            );

            sendingData.push(projectData);
            continue;
        }

        var formulaArray = JSON.parse(energyData.Formula);

        for (const declaredFormula of formulaArray) {
            var formula = new besc_client.Formula(declaredFormula.name, declaredFormula.keys, declaredFormula.formula);
            formula.applyFieldsValues(declaredFormula.fieldNames);
            formulas.push(formula);
        }

        reading.push(new Device(config.DeviceName, energyData.EnergyUsage, energyData.Saved, energyData.Efficiency, formulas));
   
        var projectData = new ProjectData(
            energyData.dateTime,
            config.ProjectName,
            reading,
            config.AverageRT,
            config.Location
        );

        sendingData.push(projectData);
    }

    try {
        if(sendingData.length){
            var response = await besc_client.API.sendBatchProjectData(host_client, keypair, sendingData);

            for(const energyReading of energyReadings){
                var energyData = EnergyData.parseFromObject(energyReading);
                energyData.SEND = 1;
                await dbUtils.updateEnergyData(energyReading.rowid, energyData);
            }

            return response;
        }
        else{
            return "No data to push";
        }
    }
    catch (apiError) {
        saveLog(`Throw at sendBatchData: ${apiError}`);
    }
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

if(process.env.REPEAT_EVERY_MINUTES != parseInt(process.env.REPEAT_EVERY_MINUTES)){
    console.log("Trigger minutes must be integer");
    process.exit();
}

var job = new CronJob(`*/${process.env.REPEAT_EVERY_MINUTES} * * * *`, async function () {

    await dbUtils.initTable();
    
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

        var energyData = new EnergyData();

        var devicesReadingObj = convertArrayToSimpleObject(devicesReading, "name", "energy");

        energyData.BTU = devicesReadingObj['BTU'];
        energyData.Chiller = devicesReadingObj['Chiller'];
        energyData.CDWP = devicesReadingObj['CDWP'];
        energyData.CHWP = devicesReadingObj['CHWP'];
        energyData.CT = devicesReadingObj['CDWP'];
        energyData.dateTime = new Date().toISOString();
        energyData.SEND = 0;

        await dbUtils.insertEnergyData(energyData);

        var records = await dbUtils.queryNotSendEnergyDataLatest();

        //Get baseline reading from contract
        const baseline = inputBaseline ? inputBaseline : await besc_client.helper.getBaseline(host_client, keypair);

        //Get formula from contract
        var formula = await besc_client.helper.getAllFormulas(host_client, keypair);

        for(record of records){
            
            var tempEnergyData = EnergyData.parseFromObject(record);

            if(tempEnergyData.name){
                continue;
            }

            if(record.rowid === 1){
                tempEnergyData.setDefaultEmpty();
                tempEnergyData.SEND = 1;
                await dbUtils.updateEnergyData(1, tempEnergyData);
                console.log("First data recorded as base, please wait for next data read.");
                continue;
            }

            if(record.BTU === null || record.BTU === 0){
                tempEnergyData.setDefaultEmpty();
                await dbUtils.updateEnergyData(record.rowid, tempEnergyData);
                continue;
            }

            var previousData = records.find(x => x.rowid < record.rowid && x.BTU !== 0);

            if(!previousData){
                previousData = await dbUtils.getLastValidEnergyData(record.rowid);
            }

            saveLog("Calculate Energy");
            var energyReading = await calculateEnergy(tempEnergyData, previousData, baseline, formula);

            var formulaFormatted = [];

            for(var tempFormula of energyReading.Formula){
                var f1 = tempFormula.duplicate();
                delete f1.nodeFormula;
                delete f1.code;
                formulaFormatted.push(f1);
            }

            energyReading.Formula = formulaFormatted;

            saveLog("Calculated Reading:");
            saveLog(JSON.stringify(energyReading));

            tempEnergyData.CDWP_Efficiency = energyReading.CDWP_Efficiency;
            tempEnergyData.CHWP_Efficiency = energyReading.CHWP_Efficiency;
            tempEnergyData.CT_Efficiency = energyReading.CT_Efficiency;
            tempEnergyData.Chiller_Efficiency = energyReading.Chiller_Efficiency;
            tempEnergyData.Efficiency = energyReading.Efficiency;
            tempEnergyData.EnergyUsage = energyReading.EnergyUsage;
            tempEnergyData.Saved = energyReading.Saved;
            tempEnergyData.name = energyReading.name;
            tempEnergyData.Formula = JSON.stringify(formulaFormatted);

            await dbUtils.updateEnergyData(record.rowid, tempEnergyData);
        }

        var response = await sendBatchData();

        if(response){
            saveLog("\n\nESS API Response:");
            saveLog(JSON.stringify(response));
        }
        else{
            saveLog("Data Sending Failed");
        }
   
    } catch (error) {
        saveLog(`Throw at cronjob: ${error}`);
        console.error(error);
    }

    //job.stop();

}, null, false, 'UTC', null, false);


job.start();

console.log("Task started");
