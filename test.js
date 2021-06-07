//Node.js app for buy/sell between 2 leveraged tokens (ex. BTCUP/USDT <==> BTCDOWN/USDT)
//Stop-Loss Take-Profit!! Trailing Stop-Loss!!
require('dotenv').config();

const fs = require('fs');
const ccxt =  require('ccxt');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

//IMPORTANT TO-DO!! Solve unhandledPromises issue!!

let fakeBalanceUSDT = 100;     //Fake balance!! It's just a local number. NOT real money!!
let fakeBalanceBTCUP = 0;
let fakeBalanceBTCDOWN = 0;
let whereIsTheMoney = "USDT"

//Trend array and trend vector both have to be declared outside , or their value will get wiped out every time func is run..
const valueArray_BTCUP = [0,0];      //This is used for calculating Trend Vector of BTCUP itself.. Values are actual prices.

let trendVector_BTCUP = 1;

const valueArray_BTCUP_ALMA_500 = [null, null];   //ALMA_500 instatanius values

let trendVector_BTCUP_ALMA_500 = null;            //trenVector for ALMA_500


const greetingMessage = () => {
    console.log("----------------------------------------------------------------------------")
    console.log("------------------------------- WELCOME ------------------------------------")
    console.log("----------------------------------------------------------------------------")
    console.log("------------------   BINANCE API OTOMASYON YAZILIMI  -----------------------")
    console.log("--------------------         OZAN GOKCEOGLU        -------------------------")
    console.log("----------------------       COPYRIGHT 2021      ---------------------------")
    console.log("----------------------------------------------------------------------------")
    console.log("----------------------------------------------------------------------------")    
}
greetingMessage();

//------------------------------------------------------------------------------------------------------------------------
//----------------...Main function...--------------------
const main = async() => {
    console.log("")
    console.log("")
    console.log("----------BEGINNING OF MESSAGE----------")
    console.log("<fake>")
    console.log("testMain.js")
    console.log("</fake>")
    console.log("")
    console.log("")

    //Prints FAKE balances..
    console.log("-------------------------------------")
    console.log(`FAKE USDT Balance: ${fakeBalanceUSDT}`)
    console.log(`FAKE BTCUP Balance: ${fakeBalanceBTCUP}`)
    console.log(`FAKE BTCDOWN Balance: ${fakeBalanceBTCDOWN}`)
    console.log("-------------------------------------")

    //check where is the local monies :)
    console.log(`Where is the FAKE money: ${whereIsTheMoney}`)

    //total equity
    let totalEquityUSDT = fakeBalanceUSDT + fakeBalanceBTCUP + fakeBalanceBTCDOWN

    //Fetches OHLCV data
    const OHLCV = await binance.fetchOHLCV('BTCUP/USDT', '1m')
    //console.table(OHLCV);

    //Derive a Moving Average value based on past readouts..
        //Current DateTime
        const time = new Date()
        console.log("-----TARIH/SAAT---")
        console.log(time.toLocaleDateString(), time.toLocaleTimeString());
        console.log("------------------")   
        //console.log(closedValueDataSet)     

        //another version of closedValueDataSet , but this is used as a basis for Arnoud Legoux calculation
        const closedValueDataSet_500 = []
        for (let i = OHLCV.length - 1; i >= OHLCV.length - 500; i--) {    
            closedValueDataSet_500.push(OHLCV[i][4]);                          
        }                                                    

        //Arnoud Legoux function!!
        function arnoudLegoux(series, windowsize, offset, sigma) {     
            let m = offset * (windowsize - 1)
            //m = floor(offset * (windowsize - 1)) // Used as m when floor=true
            let s = windowsize / sigma
            let norm = 0.0
            let sum = 0.0
            
            for (let i = 0; i < windowsize - 1; i++) {
                let weight = Math.exp(-1 * Math.pow(i - m, 2) / (2 * Math.pow(s, 2)))
                norm = norm + weight
                sum = sum + series[windowsize - i - 1] * weight   
            }
            return ( sum / norm )
        }

        let ALMA500_Value = arnoudLegoux(closedValueDataSet_500, 500, 0.85, 6)
            

        //Derive current trend of BTCUP
        const deriveTrend = async () => {      
            if(valueArray_BTCUP_ALMA_500.length === 2) {    //BTCUP_ALMA_500 value array
                valueArray_BTCUP_ALMA_500.shift()
                valueArray_BTCUP_ALMA_500.push(ALMA500_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
            }

            if(valueArray_BTCUP_ALMA_500[0] !== null) {        //BTCUP_ALMA_500 trend vector  
                trendVector_BTCUP_ALMA_500 = ( valueArray_BTCUP_ALMA_500[1] / valueArray_BTCUP_ALMA_500[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
            } else { trendVector_BTCUP_ALMA_500 = null }
            //--------------------------------------------------------------------------------------------------
            if(valueArray_BTCUP.length === 2) {    //BTCUP price value array
                valueArray_BTCUP.shift()
                valueArray_BTCUP.push(OHLCV[OHLCV.length - 1][4])    //by this way , valueArray keeps an equilibrium lenght of 2..
            }
 
            if(valueArray_BTCUP[0] !== 0) {        //BTCUP trend vector  
                trendVector_BTCUP = ( valueArray_BTCUP[1] / valueArray_BTCUP[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
            } else { trendVector_BTCUP = 1 }
 
            console.log(`BTCUP value array: [${valueArray_BTCUP[0]}, ${valueArray_BTCUP[1]}]`);
            console.log(`Current ALMA_500 value is: ${ALMA500_Value}`)
            console.log(`Current ALMA_500 trendVector is: ${trendVector_BTCUP_ALMA_500}`)


            //---------------------------------------------------------------------------------------
            //Write to JSON file for keeping track of assets at a given time and mony more parameters..
            // Read the file
            fs.readFile('./testData.json', 'utf8', (err, data) => {
                let databases = []
                if (err) {
                    console.log(`Error reading file from disk: ${err}`);
                } else {
                    databases = JSON.parse(data)   // parse JSON string to JSON object
                }
                // Add a new record
                    databases.push({
                        price: totalEquityUSDT,
                        whereIsTheMoney: whereIsTheMoney,
                        date: time.toLocaleDateString(), 
                        time: time.toLocaleTimeString(),
                        value: ALMA500_Value,
                        trend: trendVector_BTCUP_ALMA_500,
                        mode: 'testMain'

                });
                // Write new data back to the file
                fs.writeFile('./testData.json', JSON.stringify(databases, null, 4), (err) => {
                    if (err) {
                        console.log(`Error writing file: ${err}`);
                    }
                });
            }) 

            const stopLossControl = async() => {
                let stopLossCeiling;
                let stopLossFloor;

            }

            //Trigger order logic..
            const orderTriggerControl = async () => {   
                if( trendVector_BTCUP_ALMA_500 === null) { return }          

                if( trendVector_BTCUP_ALMA_500 > 1) {  //BTCDOWN ==> BTCUP      //Hysteresis control!! Manipulate numbers in the 1.00xx or 0.99xx vicinity..
                    fakeBalanceBTCUP += fakeBalanceUSDT + fakeBalanceBTCDOWN
                    fakeBalanceUSDT = 0
                    fakeBalanceBTCDOWN = 0
                    whereIsTheMoney = "BTCUP"                     
                }

                if( trendVector_BTCUP_ALMA_500 < 1 ) {  //BTCUP ==> BTCDOWN
                    fakeBalanceBTCDOWN += fakeBalanceBTCUP + fakeBalanceUSDT
                    fakeBalanceUSDT = 0
                    fakeBalanceBTCUP = 0
                    whereIsTheMoney = "BTCDOWN"
                } 
            }
            orderTriggerControl();

            //balance update mechanism.. It will act as if money is in Binance account!..
            function balanceUpdate() {
                if(whereIsTheMoney === "USDT") { return }
                if(whereIsTheMoney === "BTCUP") {
                    fakeBalanceBTCUP = fakeBalanceBTCUP * trendVector_BTCUP; 
                }
                if(whereIsTheMoney === "BTCDOWN") {
                    fakeBalanceBTCDOWN = fakeBalanceBTCDOWN / trendVector_BTCUP; 
                }
            }
            balanceUpdate();
        }
        deriveTrend(); 
}
//Execute main() once at the beginning and leave the rest to the setInterval() process
main();
setInterval(main, 60000);















  

