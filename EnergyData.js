class EnergyData{

    constructor(){
        this.Chiller = null;
        this.CHWP = null;
        this.CDWP = null;
        this.CT = null;
        this.BTU = null;
        this.dateTime = null;
        this.name = null;
        this.EnergyUsage = null;
        this.Saved = null;
        this.Efficiency = null;
        this.Chiller_Efficiency = null;
        this.CHWP_Efficiency = null;
        this.CDWP_Efficiency = null;
        this.CT_Efficiency = null;
        this.SEND = null;
        this.Formula = null;
    }

    static parseFromObject(variable){
        var energyData = new EnergyData();
        energyData.Chiller = variable['Chiller'] !== null ? variable['Chiller'] : null;
        energyData.CHWP = variable['CHWP'] !== null ? variable['CHWP'] : null;
        energyData.CDWP = variable['CDWP'] !== null ? variable['CDWP'] : null;
        energyData.CT = variable['CT'] !== null ? variable['CT'] : null;
        energyData.BTU = variable['BTU'] !== null ? variable['BTU'] : null;
        energyData.dateTime = variable['dateTime'] !== null ? variable['dateTime'] : null;
        energyData.name = variable['name'] !== null ? variable['name'] : null;
        energyData.EnergyUsage = variable['EnergyUsage'] !== null ? variable['EnergyUsage'] : null;
        energyData.Saved = variable['Saved'] !== null ? variable['Saved'] : null;
        energyData.Efficiency = variable['Efficiency'] !== null ? variable['Efficiency'] : null;
        energyData.Chiller_Efficiency = variable['Chiller_Efficiency'] !== null ? variable['Chiller_Efficiency'] : null;
        energyData.CHWP_Efficiency = variable['CHWP_Efficiency'] !== null ? variable['CHWP_Efficiency'] : null;
        energyData.CDWP_Efficiency = variable['CDWP_Efficiency'] !== null ? variable['CDWP_Efficiency'] : null;
        energyData.CT_Efficiency = variable['CT_Efficiency'] !== null ? variable['CT_Efficiency'] : null;
        energyData.SEND = variable['SEND'] ? variable['SEND'] !== null : 0;
        energyData.Formula = variable['Formula'] !== null ? variable['Formula'] : null;

        return energyData;
    }

    setDefaultEmpty(){
        this.Chiller = this.Chiller ? this.Chiller : 0;
        this.CHWP = this.CHWP ? this.CHWP : 0;
        this.CDWP = this.CDWP ? this.CDWP : 0;
        this.CT = this.CT ? this.CT : 0;
        this.BTU = this.BTU ? this.BTU : 0;
        this.dateTime = this.dateTime ? this.dateTime : '';
        this.name = this.name ? this.name : '';
        this.EnergyUsage = this.EnergyUsage ? this.EnergyUsage : 0;
        this.Saved = this.Saved ? this.Saved : 0;
        this.Efficiency = this.Efficiency ? this.Efficiency : 0;
        this.Chiller_Efficiency = this.Chiller_Efficiency ? this.Chiller_Efficiency : 0;
        this.CHWP_Efficiency = this.CHWP_Efficiency ? this.CHWP_Efficiency : 0;
        this.CDWP_Efficiency = this.CDWP_Efficiency ? this.CDWP_Efficiency : 0;
        this.CT_Efficiency = this.CT_Efficiency ? this.CT_Efficiency : 0;
        this.SEND = this.SEND ? this.SEND : 0;
        this.Formula = this.Formula ? this.Formula : '[]';
    }
}

module.exports = EnergyData;