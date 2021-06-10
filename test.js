//Node.js app for buy/sell between 2 leveraged tokens (ex. BTCUP/USDT <==> BTCDOWN/USDT)
//Stop-Loss Take-Profit!! Trailing Stop-Loss!!
require('dotenv').config();

const fs = require('fs');
const ccxt =  require('ccxt');
const { fork } = require('child_process');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

const hysteresisSignalUp = true                            //Final signal value used for Hysteresis Control down below

const ALMA200_THRESHOLD = 1;
const CALLBACK_RATE = 1.012;

const isDealClosedArray = [];
let isDealClosed = false;        
let trailingStopPrice = null;         

//IMPORTANT TO-DO!! Solve unhandledPromises issue!!

let fakeBalanceUSDT = 100;         //Fake balance!! It's just a local number. NOT real money!!
let fakeBalanceBTCUP = 0;
let fakeBalanceBTCDOWN = 0;
let whereIsTheMoney = "USDT"

let trailingStopPriceArray = []  //This array exists only during a trade.. It will be RESET when a sell takes place!

//Trend array and trend vector both have to be declared outside , or their value will get wiped out every time func is run..
const valueArray_BTCUP = [0,0];      //This is used for calculating Trend Vector of BTCUP itself.. Values are actual prices.
let trendVector_BTCUP = 1;

let valueArray_BTCUP_ALMA200 = [null, null];   //ALMA200 instatanius values
let trendVector_BTCUP_ALMA200 = null;            //trenVector for ALMA200

let valueArray_BTCUP_ALMA20 = [null, null];   //ALMA200 instatanius values
let trendVector_BTCUP_ALMA20 = null;            //trenVector for ALMA200




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

    //total equity
    let totalEquityUSDT = fakeBalanceUSDT + fakeBalanceBTCUP + fakeBalanceBTCDOWN;

    //Fetches OHLCV data
    const OHLCV = await binance.fetchOHLCV('BTCUP/USDT', '1m')
    //console.table(OHLCV);

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

        let ALMA500_Value = arnoudLegoux(closedValueDataSet_500, 200, 0.85, 6)
        let ALMA20_Value = arnoudLegoux(closedValueDataSet_500, 20, 0.85, 6)

            

        //Derive current trend of BTCUP
        const deriveTrend = async () => {      
            //BTCUP_ALMA200--------------------------------------------------------------------------------------------
            if(valueArray_BTCUP_ALMA200.length === 2) {    //BTCUP_ALMA200 value array
                valueArray_BTCUP_ALMA200.shift()
                valueArray_BTCUP_ALMA200.push(ALMA500_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
            }

            if(valueArray_BTCUP_ALMA200[0] !== null) {        //BTCUP_ALMA200 trend vector  
                trendVector_BTCUP_ALMA200 = ( valueArray_BTCUP_ALMA200[1] / valueArray_BTCUP_ALMA200[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
            } else { trendVector_BTCUP_ALMA200 = null }

            //BTCUP Real-Time-------------------------------------------------------------------------------------------
            if(valueArray_BTCUP.length === 2) {    //BTCUP price value array
                valueArray_BTCUP.shift()
                valueArray_BTCUP.push(OHLCV[OHLCV.length - 1][4])    //by this way , valueArray keeps an equilibrium lenght of 2..
            }
 
            if(valueArray_BTCUP[0] !== 0) {        //BTCUP trend vector  
                trendVector_BTCUP = ( valueArray_BTCUP[1] / valueArray_BTCUP[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
            } else { trendVector_BTCUP = 1 }

            //BTCUP_ALMA20--------------------------------------------------------------------------------------------
            if(valueArray_BTCUP_ALMA20.length === 2) {    //BTCUP_ALMA200 value array
                valueArray_BTCUP_ALMA20.shift()
                valueArray_BTCUP_ALMA20.push(ALMA500_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
            }

            if(valueArray_BTCUP_ALMA20[0] !== null) {        //BTCUP_ALMA200 trend vector  
                trendVector_BTCUP_ALMA20 = ( valueArray_BTCUP_ALMA20[1] / valueArray_BTCUP_ALMA20[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
            } else { trendVector_BTCUP_ALMA20 = null }

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
                        totalEquitiy: totalEquityUSDT,
                        whereIsTheMoney: whereIsTheMoney,
                        date: time.toLocaleDateString(), 
                        time: time.toLocaleTimeString(),
                        ALMA200_trend: trendVector_BTCUP_ALMA200,
                        btcUpRealtimePrice: valueArray_BTCUP,
                        trailingStopPrice: trailingStopPrice,
                        callBackRate: CALLBACK_RATE,
                        isDealClosed: isDealClosed,
                        mode: 'testMainTrailingStop'

                });
                // Write new data back to the file
                fs.writeFile('./testData.json', JSON.stringify(databases, null, 4), (err) => {
                    if (err) {
                        console.log(`Error writing file: ${err}`);
                    }
                });
            })

            //----------------------------------------------------------------------------------------------
            //Keeps trade records only when a trade is closed! (NOT on minute basis)
            // Read the file
            fs.readFile('./testTradeData.json', 'utf8', (err, data) => {
                let databases = []
                if (err) {
                    console.log(`Error reading file from disk: ${err}`);
                } else {
                    databases = JSON.parse(data)   // parse JSON string to JSON object
                }
                // Add a new record
                    databases.push({
  

                });
                // Write new data back to the file
                fs.writeFile('./testTradeData.json', JSON.stringify(databases, null, 4), (err) => {
                    if (err) {
                        console.log(`Error writing file: ${err}`);
                    }
                });
            }) 

            //TO-DO -- REAL HYSTERESIS CONTROL!!
            //Hysteresis control will take ALMA trend vector and convert it to either UP or DOWN , since program is not concerned with how high the vector is.. 
            //It's only UP or DOWN. For example , activation will be at 1.000 BUT sell will be at 0.99995..
            const hysteresisControl = () => {
                if (trendVector_BTCUP_ALMA200 > 1.0000) {
                    hysteresisSignalUp = true
                }
                if (trendVector_BTCUP_ALMA200 < 0.9999 && hysteresisSignalUp) {
                    //CODE GOES HERE..
                }
            }

            //TO-DO -- CONTROL SELECTOR
            //Control selector gives control to either trailingStopControlUP or trilingStopControlDOWN (this distinguishing is not implemented yet but it will..)
            //CONDITIONS: For any given moment ; if (trailingStopLossUP) exploded AND ( trendVector_BTCUP_ALMA200 < 1 ) at the same time , then hand control to DOWN..
            //OTHER WAY IS WISE'N VERSA => For any given moment ; if (trailingStopLossDOWN) exploded AND ( trendVector_BTCUP_ALMA200 > 1 ) at the same time , then hand control to UP..
            const controlSelector = () => {
                //CODE GOES HERE..
            }


            //Trailing-Stop Control!!----------------------------------------------------------------------------------
            const trailingStopControl = async() => {                          //This is the new "orderTriggerControl"
                if( trendVector_BTCUP_ALMA200 === null) { return }           //Don't do anything..

                if( trendVector_BTCUP_ALMA200 > ALMA200_THRESHOLD && trendVector_BTCUP_ALMA20 > 1 && isDealClosed ) {
                    isDealClosed = false
                }

                if( trendVector_BTCUP_ALMA200 > ALMA200_THRESHOLD && !isDealClosed) {      //UpTrend signifies an up-trend in ALMA200 Moving Average
                    trailingStopPriceArray.push(valueArray_BTCUP[1])                       //Creates and maintains price array. It gets RESET when trade is over..
                    fakeBalanceBTCUP += fakeBalanceUSDT                                    //Local monies are transferred into BTCUP..
                    fakeBalanceUSDT = 0
                    whereIsTheMoney = "BTCUP"      
                }
                
                if( trendVector_BTCUP_ALMA200 < ALMA200_THRESHOLD) {
                    isDealClosed = false;
                }

                const findHighestPrice = () => {  //Finds the highest price in the trailingStopPriceArray[]. That value is used for determining Trailing Stop price..
                    let highest = 0;
                    for (const element of trailingStopPriceArray) {
                        if (element > highest) {
                            highest = element;
                        }         
                    }
                    return highest;
                }

                let highestPrice = findHighestPrice();
                trailingStopPrice = highestPrice / CALLBACK_RATE;

                //Real-Time Trailing Stop-Loss control!! If price is down below Trailing-Stop price , coin gets liquidated!!
                if (valueArray_BTCUP[1] < trailingStopPrice) {
                    isDealClosed = true
                    trailingStopPriceArray = []             //Wipes out the array when trade is over
                    fakeBalanceUSDT += fakeBalanceBTCUP;
                    fakeBalanceBTCUP = 0
                    whereIsTheMoney = "USDT"
                }

            }
            trailingStopControl();

            console.table(trailingStopPriceArray);
            //Prints FAKE balances..
            console.log(`Where is the FAKE money: ${whereIsTheMoney}`)
            console.log("-------------------------------------")
            console.log(`FAKE USDT Balance: ${fakeBalanceUSDT}`)
            console.log(`FAKE BTCUP Balance: ${fakeBalanceBTCUP}`)
            console.log(`FAKE BTCDOWN Balance: ${fakeBalanceBTCDOWN}`)
            console.log(`MODE: TrailingStopTest`)

            console.log("-------------------------------------")

            //check where is the local monies :)
            console.log(`Current ALMA200 value is: ${ALMA500_Value}`)
            console.log(`Current ALMA200 trendVector is: ${trendVector_BTCUP_ALMA200}`)
            console.log(`BTCUP value array: [${valueArray_BTCUP[0]}, ${valueArray_BTCUP[1]}]`);
            console.log(`Trailing-Stop price: ${trailingStopPrice}`);
            console.log(`Callback rate: ${CALLBACK_RATE}`);
            console.log(`Is deal closed?: ${isDealClosed}`);

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















  

