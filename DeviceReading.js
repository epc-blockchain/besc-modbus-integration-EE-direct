var Reading = require('./Reading');

class DeviceReading{

    constructor(){
        this.Chiller = null;
        this.CHWP = null;
        this.CDWP = null;
        this.CT = null;
        this.BTU = null;
        this.dateTime = null;
    }

    static parseFromObject(variable){
        var deviceReading = new DeviceReading();
        deviceReading.Chiller = variable['Chiller'] ? variable['Chiller'] : null;
        deviceReading.CHWP = variable['CHWP'] ? variable['CHWP'] : null;
        deviceReading.CDWP = variable['CDWP'] ? variable['CDWP'] : null;
        deviceReading.CT = variable['CT'] ? variable['CT'] : null;
        deviceReading.BTU = variable['BTU'] ? variable['BTU'] : null;
        deviceReading.dateTime = variable['dateTime'] ? variable['dateTime'] : null;

        return deviceReading;
    }

    convertToReadingArray(){

        var array = [];

        for (const key in this) {
            if (this.hasOwnProperty(key)) {

                if(key !== "dateTime"){
                    const element = this[key];

                    const reading = Reading.create(key, element);
                    array.push(reading);
                }
            }
        }

        return array;
    }
}

module.exports = DeviceReading;