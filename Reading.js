class Reading{

    constructor(){
        this.name = null;
        this.reading = null;
    }

    static create(name, thisReading){
        var reading = new Reading();
        reading.name = name;
        reading.reading = thisReading;

        return reading;
    }
}

module.exports = Reading;