class EnergyData{

    constructor(){
        this.EnergySaving = null;
        this.TotalKWH = null;
        this.TotalEFF = null;
        this.dateTime = null;
        this.name = null;
        this.EnergyUsage = null;
        this.Saved = null;
        this.Efficiency = null;
        this.SEND = null;
        this.Formula = null;
    }

    static parseFromObject(variable){
        var energyData = new EnergyData();
        energyData.EnergySaving = variable['EnergySaving'] !== null ? variable['EnergySaving'] : null;
        energyData.TotalKWH = variable['TotalKWH'] !== null ? variable['TotalKWH'] : null;
        energyData.TotalEFF = variable['TotalEFF'] !== null ? variable['TotalEFF'] : null;
        energyData.dateTime = variable['dateTime'] !== null ? variable['dateTime'] : null;
        energyData.name = variable['name'] !== null ? variable['name'] : null;
        energyData.EnergyUsage = variable['EnergyUsage'] !== null ? variable['EnergyUsage'] : null;
        energyData.Saved = variable['Saved'] !== null ? variable['Saved'] : null;
        energyData.Efficiency = variable['Efficiency'] !== null ? variable['Efficiency'] : null;
        energyData.SEND = variable['SEND'] ? variable['SEND'] !== null : 0;
        energyData.Formula = variable['Formula'] !== null ? variable['Formula'] : null;

        return energyData;
    }

    setDefaultEmpty(){
        this.EnergySaving = this.EnergySaving ? this.EnergySaving : 0;
        this.TotalKWH = this.TotalKWH ? this.TotalKWH : 0;
        this.TotalEFF = this.TotalEFF ? this.TotalEFF : 0;
        this.dateTime = this.dateTime ? this.dateTime : '';
        this.name = this.name ? this.name : '';
        this.EnergyUsage = this.EnergyUsage ? this.EnergyUsage : 0;
        this.Saved = this.Saved ? this.Saved : 0;
        this.Efficiency = this.Efficiency ? this.Efficiency : 0;
        this.SEND = this.SEND ? this.SEND : 0;
        this.Formula = this.Formula ? this.Formula : '[]';
    }
}

module.exports = EnergyData;