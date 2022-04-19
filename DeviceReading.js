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
        deviceReading.Chiller = variable['Chiller'] !== null ? variable['Chiller'] : null;
        deviceReading.CHWP = variable['CHWP'] !== null? variable['CHWP'] : null;
        deviceReading.CDWP = variable['CDWP'] !== null ? variable['CDWP'] : null;
        deviceReading.CT = variable['CT'] !== null ? variable['CT'] : null;
        deviceReading.BTU = variable['BTU'] !== null ? variable['BTU'] : null;
        deviceReading.dateTime = variable['dateTime'] !== null ? variable['dateTime'] : null;

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