var sqlite3 = require('sqlite3').verbose();
const dbName = "Energy_Data";
var db;

class dbUtils{

    static async initTable(){
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {
            db.serialize(function() {

                let createTable = `CREATE TABLE IF NOT EXISTS energyData (
                    EnergySaving REAL,
                    TotalKWH REAL,
                    TotalEFF REAL,
                    dateTime TEXT,
                    name TEXT,
                    EnergyUsage REAL,
                    Saved REAL,
                    Efficiency REAL,
                    SEND INTERGER DEFAULT 0,
                    Formula TEXT
                );`;
        
                db.run(createTable, (result, err)=>{
                    if(err){
                        reject(err);
                    }

                    resolve(result);
                });
            });
        });
      
        db.close();

        return data;
   }

    static removeTable(){
        db = new sqlite3.Database(dbName);

        db.serialize(function() {

            let deleteTable = `DROP TABLE IF EXISTS energyData`;
    
            db.run(deleteTable);
        });
    
        db.close();
    }

    static async queryEnergyData(){
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {

            db.all("SELECT rowid, * FROM energyData ORDER BY rowid DESC limit 10", function(err, rows) {
                
                if(err)
                    reject(err);

                resolve(rows);
            });
        });
    
        db.close();

        return data;
    }

    static async queryNotSendEnergyData(){
        
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {

            db.all("SELECT rowid, * FROM energyData WHERE SEND = 0 ORDER BY rowid limit 10", function(err, rows) {
                
                if(err)
                    reject(err);

                resolve(rows);
            });
        });
    
        db.close();

        return data;
    }

    static async queryNotSendEnergyDataLatest(){
        
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {

            db.all("SELECT rowid, * FROM energyData WHERE SEND = 0 ORDER BY rowid DESC limit 10", function(err, rows) {
                
                if(err)
                    reject(err);

                resolve(rows);
            });
        });
    
        db.close();

        return data;
    }

    static async getEnergyData(id){
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {

            var stmt = db.prepare(`SELECT rowid, * FROM energyData WHERE rowid = (?)`);

            stmt.get(id, function(err, row) {
                
                if(err)
                    reject(err);

                resolve(row);
            });

            stmt.finalize();
        });
    
        db.close();

        return data;
    }

    static async getLastValidEnergyData(id){
        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {

            var stmt = db.prepare(`SELECT rowid, * FROM energyData WHERE TotalKWH <> 0 AND rowid < (?) ORDER BY rowid DESC LIMIT 1`);

            stmt.get(id, function(err, row) {
                
                if(err)
                    reject(err);

                resolve(row);
            });

            stmt.finalize();
        });
    
        db.close();

        return data;
    }

    static async updateEnergyData(id, EnergyData){

        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {
            db.serialize(function() {

                let toUpdateQuery = [];
                let toUpdateValues = [];
    
                for (const key in EnergyData) {
    
                    if (EnergyData.hasOwnProperty(key)) {
                        const element = EnergyData[key];
                        
                        toUpdateQuery.push(`${key} = (?)`);
                        toUpdateValues.push(element)
                    }
                }
    
                var stmt = db.prepare(`UPDATE energyData SET ${toUpdateQuery.join(',')} WHERE rowid = (?)`);
    
                stmt.run(...toUpdateValues, id, (result, err)=>{
                    if(err){
                        reject(err);
                    }

                    resolve(result);
                });
    
                stmt.finalize();
            });
        });
    
        db.close();

        return data;
    }

    static async insertEnergyData(EnergyData){

        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {
            db.serialize(function() {

                let cols = `
                EnergySaving,
                TotalKWH,
                TotalEFF,
                dateTime,
                name,
                EnergyUsage,
                Saved,
                Efficiency,
                SEND,
                Formula`;
    
                let toInsertValues = [];
                let inserLabel = [];
    
                for (const col of cols.split(',')) {
                    if(EnergyData[col.trim()] !== undefined){
                       toInsertValues.push(EnergyData[col.trim()]);
                    }
                    else{
                        toInsertValues.push(null);
                    }
                    
                }
    
                inserLabel = [...toInsertValues];
                inserLabel.fill('?');
    
                var query = `INSERT INTO energyData (
                    ${cols}
                ) 
                VALUES (${inserLabel.join(',')})`;

                var stmt = db.prepare(query);
    
                stmt.run(...toInsertValues, (result, err)=>{
                    if(err){
                        reject(err);
                    }

                    resolve(result);
                });
    
                stmt.finalize();
            });
        });
        
        db.close();

        return data;
    }

    static async resetEnergyData(){

        db = new sqlite3.Database(dbName);

        var data = await new Promise(async function (resolve, reject) {
            db.serialize(function() {
    
                var stmt = db.prepare(`UPDATE energyData SET name = '' WHERE SEND = 0 `);
    
                stmt.run((result, err)=>{
                    if(err){
                        reject(err);
                    }

                    resolve(result);
                });
    
                stmt.finalize();
            });
        });
    
        db.close();

        return data;
    }
}

module.exports = dbUtils;