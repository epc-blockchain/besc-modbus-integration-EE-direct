var Reading = require('./Reading');

class DeviceReading{

    constructor(){
        this.TotalKWH = null;
        this.EnergySaving = null;
        this.totalEFF = null;
        this.dateTime = null;
    }

    static parseFromObject(variable){
        var deviceReading = new DeviceReading();
        deviceReading.TotalKWH = variable['TotalKWH'] !== null ? variable['TotalKWH'] : null;
        deviceReading.EnergySaving = variable['EnergySaving'] !== null? variable['EnergySaving'] : null;
        deviceReading.TotalEFF = variable['TotalEFF'] !== null ? variable['TotalEFF'] : null;
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