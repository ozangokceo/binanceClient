//Node.js app for buy/sell BTCDOWN , ONLY one-way..
require('dotenv').config();

const fs = require('fs');
const ccxt =  require('ccxt');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

const hysteresisSignalUp = true    

const ALMA20_THRESHOLD = 1.0000
const ALMA200_THRESHOLD = 1.0000
const CALLBACK_RATE = 1.011;                    //Dynamic Stop-Loss Take-Profit window.

const isDealClosedArray = [];                   //Not used for now.
let isDealClosed = false;          
let trailingStopPrice = null;         

//IMPORTANT TO-DO!! Solve unhandledPromises issue!!

let trailingStopPriceArray = []                 //This array exists only during a trade.. It will be RESET when a sell takes place!

//Trend array and trend vector both have to be declared outside , or their value will get wiped out every time func is run..
const valueArray_BTCDOWN = [0,0];      //This is used for calculating Trend Vector. Values are actual prices.
let trendVector_BTCDOWN = 1;

let valueArray_BTCDOWN_ALMA200 = [null, null];    //ALMA200 instatanius values
let trendVector_BTCDOWN_ALMA200 = null;            //trenVector for ALMA200

let valueArray_BTCDOWN_ALMA20 = [null, null];     //ALMA200 instatanius values
let trendVector_BTCDOWN_ALMA20 = null;            //trenVector for ALMA200


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
    //checks and prints balances  
    console.log("")
    console.log("")
    console.log("----------BEGINNING OF MESSAGE----------")
    console.log("Main.js..")
    async function balanceCheck() {
        const balance = await binance.fetchBalance();
        const nonZeroBalances = {}
        for (const key in balance.total) {
            if (balance.total[key] !== 0) {                 //TO-DO: Make it greater that some threshold value. Not solely greater than zero
                nonZeroBalances[key] = balance.total[key]   //TO-DO: Add USDT equivalent to side row of each coin
            }
        }
        console.log("")
        console.log("GUNCEL COIN BAKIYELERI:")
        console.table(nonZeroBalances);
    }
    balanceCheck();

    //Fetches OHLCV data
    const OHLCV = await binance.fetchOHLCV('BTCDOWN/USDT', '1m')
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

    let ALMA200_Value = arnoudLegoux(closedValueDataSet_500, 200, 0.85, 6)
    let ALMA20_Value = arnoudLegoux(closedValueDataSet_500, 20, 0.85, 6)
            
    const deriveTrend = async() => {
        //Derive current trend of BTCDOWN     
        if(valueArray_BTCDOWN_ALMA200.length === 2) {    //BTCDOWN_ALMA200 value array
            valueArray_BTCDOWN_ALMA200.shift()
            valueArray_BTCDOWN_ALMA200.push(ALMA200_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
        }
        
        if(valueArray_BTCDOWN_ALMA200[0] !== null) {        //BTCDOWN_ALMA200 trend vector  
            trendVector_BTCDOWN_ALMA200 = ( valueArray_BTCDOWN_ALMA200[1] / valueArray_BTCDOWN_ALMA200[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
        } else { trendVector_BTCDOWN_ALMA200 = null }
        
        //BTCDOWN Real-Time-------------------------------------------------------------------------------------------
        if(valueArray_BTCDOWN.length === 2) {    //BTCDOWN_ALMA200 value array
            valueArray_BTCDOWN.shift()
            valueArray_BTCDOWN.push(OHLCV[OHLCV.length - 1][4])    //by this way , valueArray keeps an equilibrium lenght of 2..
        }
        
        if(valueArray_BTCDOWN[0] !== 0) {        //BTCDOWN trend vector  
            trendVector_BTCDOWN = ( valueArray_BTCDOWN[1] / valueArray_BTCDOWN[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
        } else { trendVector_BTCDOWN = 1 }
        
        //BTCDOWN_ALMA20--------------------------------------------------------------------------------------------
        if(valueArray_BTCDOWN_ALMA20.length === 2) {    //BTCDOWN_ALMA200 value array
            valueArray_BTCDOWN_ALMA20.shift()
            valueArray_BTCDOWN_ALMA20.push(ALMA20_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
        }
        
        if(valueArray_BTCDOWN_ALMA20[0] !== null) {        //BTCDOWN_ALMA200 trend vector  
            trendVector_BTCDOWN_ALMA20 = ( valueArray_BTCDOWN_ALMA20[1] / valueArray_BTCDOWN_ALMA20[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
        } else { trendVector_BTCDOWN_ALMA20 = null }
        //---------------------------------------------------------------------------------------
    }
    deriveTrend();

        //Balance and totalEquity checks..
        let btcUpBalance = await balanceCheck_BTCUP();
        let btcUpPrice = await priceCheck_BTCUP();
        let btcDownBalance = await balanceCheck_BTCDOWN();
        let btcDownPrice = await priceCheck_BTCDOWN();
        let usdtBalance = await balanceCheck_USDT();
        let totalEquityUSDT = ( btcUpBalance * btcUpPrice ) + ( btcDownBalance * btcDownPrice ) + usdtBalance

        //Where is the money indicator..
        let whereIsTheMoney = "I don't know yet"

        if( (( btcUpBalance * btcUpPrice ) > ( btcDownBalance * btcDownPrice )) && (( btcUpBalance * btcUpPrice ) > usdtBalance) ) {
            whereIsTheMoney = "BTCUP";
        }
        if( (( btcDownBalance * btcDownPrice ) > ( btcUpBalance * btcUpPrice )) && (( btcDownBalance * btcDownPrice ) > usdtBalance)) {
            whereIsTheMoney = "BTCDOWN";
        } 
        if( ( usdtBalance > ( btcUpBalance * btcUpPrice )) && ( usdtBalance  > ( btcDownBalance * btcDownPrice )) ) {
            whereIsTheMoney = "USDT";
        } 

        //---------------------------------------------------------------------------------------
        //Write to JSON file for keeping track of assets at a given time
        // read the file
        fs.readFile('./database.json', 'utf8', (err, data) => {
            let databases = []
            if (err) {
                console.log(`Error reading file from disk: ${err}`);
            } else {
                databases = JSON.parse(data)   // parse JSON string to JSON object
            }
            // add a new record
            databases.push({
                price: totalEquityUSDT,
                whereIsTheMoney: whereIsTheMoney,
                date: time.toLocaleDateString(), 
                time: time.toLocaleTimeString(),
                ALMA200_trend: trendVector_BTCDOWN_ALMA200,
                ALMA20_trend: trendVector_BTCDOWN_ALMA20,
                btcUpRealtimePrice: valueArray_BTCDOWN,
                trailingStopPrice: trailingStopPrice,
                callBackRate: CALLBACK_RATE,
                isDealClosed: isDealClosed,
                mode: 'mainTrailingStop',
            });
            // write new data back to the file
            fs.writeFile('./database.json', JSON.stringify(databases, null, 4), (err) => {
                if (err) {
                    console.log(`Error writing file: ${err}`);
                }
            });
        }) 

        //Trailing-Stop Control!!----------------------------------------------------------------------------------
        const trailingStopControl = async() => {                          //This is the new "orderTriggerControl"
            if( trendVector_BTCDOWN_ALMA200 === null) { return }           //Don't do anything..

            if( trendVector_BTCDOWN_ALMA200 > ALMA200_THRESHOLD && trendVector_BTCDOWN_ALMA20 > ALMA20_THRESHOLD && isDealClosed ) {
                isDealClosed = false
            }

            if( trendVector_BTCDOWN_ALMA200 > ALMA200_THRESHOLD && !isDealClosed) {      //UpTrend signifies an up-trend in ALMA200 Moving Average
                trailingStopPriceArray.push(valueArray_BTCDOWN[1])                       //Creates and maintains price array. It gets RESET when trade is over..
                await buyAndSellOrder('BTCDOWN/USDT', 'buy')                             //Real monies are transferred into BTCDOWN..
   
            }
            
            if( trendVector_BTCDOWN_ALMA200 < ALMA200_THRESHOLD) {
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
            if (valueArray_BTCDOWN[1] < trailingStopPrice) {
                isDealClosed = true
                trailingStopPriceArray = []                         //Wipes out the array when trade is over
                await buyAndSellOrder('BTCDOWN/USDT', 'sell')
            }
        }
        trailingStopControl();

        console.table(trailingStopPriceArray);
        //Prints FAKE balances..
        console.log("-------------------------------------")
        console.log(`Where is the money: ${whereIsTheMoney}`)
        console.log(`Total equity in USDT: ${totalEquityUSDT}`)
        console.log(`MODE: mainTrailingStopDOWN`)
        console.log("-------------------------------------")

        //check where is the local monies :)
        console.log(`Current ALMA20_DOWN trendVector is: ${trendVector_BTCDOWN_ALMA20}`)
        console.log(`Current ALMA200_DOWN trendVector is: ${trendVector_BTCDOWN_ALMA200}`)
        console.log(`BTCUP value array: [${valueArray_BTCDOWN[0]}, ${valueArray_BTCDOWN[1]}]`);
        console.log(`Trailing-Stop price: ${trailingStopPrice}`);
        console.log(`Callback rate: ${CALLBACK_RATE}`);
        console.log(`Is deal closed?: ${isDealClosed}`);

}
//Execute main() once at the beginning and leave the rest to the setInterval() process
main();
setInterval(main, 60000);


//Check prices----------------------------------------------------------
//Price check BTCDOWN

async function priceCheck_BTCDOWN() {
    let priceBTCDOWN;
    const OHLCV = await binance.fetchOHLCV('BTCDOWN/USDT', '1m')
    priceBTCDOWN = OHLCV[OHLCV.length - 1][4]
    //console.log(`BTCDOWN price is: ${priceBTCDOWN}`); //For debugging..
    return priceBTCDOWN
}

//Price check BTCUP
async function priceCheck_BTCUP() {
    let priceBTCUP;
    const OHLCV = await binance.fetchOHLCV('BTCUP/USDT', '1m')
    priceBTCUP = OHLCV[OHLCV.length - 1][4]
    //console.log(`BTCUP price is: ${priceBTCUP}`);
    return priceBTCUP
}


//Check balances----------------------------------------------------------
//Balance check USDT
async function balanceCheck_USDT() {
    const balance = await binance.fetchBalance();
    let balance_USDT = balance.total.USDT;
    //console.log(`USDT balance is: ${balance_USDT}`);   //For debugging..
    return balance_USDT
}
balanceCheck_USDT()


//Balance check BTCDOWN
async function balanceCheck_BTCDOWN() {
    const balance = await binance.fetchBalance();
    let balance_BTCDOWN = balance.total.BTCDOWN;
    //console.log(`BTCDOWN balance is: ${balance_BTCDOWN}`);   //For debugging..
    return balance_BTCDOWN
}
balanceCheck_BTCDOWN()

//Balance check BTCUP
async function balanceCheck_BTCUP() {
    const balance = await binance.fetchBalance();
    let balance_BTCUP = balance.total.BTCUP;
    //console.log(`BTCUP balance is: ${balance_BTCUP}`);
    return balance_BTCUP
}
balanceCheck_BTCUP()

//-----------------------------------------------------------------------------------------------------------------
//Exact 100% percent buy and sell amounts are calculated... With a 5% safety margin against wild price fluctuations.
//This is needed , because Binance does not provide any percent function for buy and sell operations over API. User has to calculate an exact amount.
//Whereas on the web site , user can choose a percentage (say , 100% percent) and exact figures are calculated on the background and buy/sell is executed.

async function hundredPercentBuyAmount_BTCDOWN() {
    let hundredPercentBuyAmount_BTCDOWN = ( await balanceCheck_USDT() / await priceCheck_BTCDOWN() ) * 0.98
    //console.log(`Hundred percent BTCDOWN buy amount is: ${hundredPercentBuyAmount_BTCDOWN}`)  //For debugging..
    return hundredPercentBuyAmount_BTCDOWN
}
hundredPercentBuyAmount_BTCDOWN()

async function hundredPercentSellAmount_BTCDOWN() {
    let hundredPercentSellAmount_BTCDOWN =  ( await balanceCheck_BTCDOWN() ) * 0.98
    //console.log(`Hundred percent BTCDOWN sell amount is: ${hundredPercentSellAmount_BTCDOWN}`) //For debugging..
    return hundredPercentSellAmount_BTCDOWN
}
hundredPercentSellAmount_BTCDOWN()

async function hundredPercentBuyAmount_BTCUP() {
    let hundredPercentBuyAmount_BTCUP = ( await balanceCheck_USDT() / await priceCheck_BTCUP() ) * 0.98
    //console.log(`Hundred percent BTCUP buy amount is: ${hundredPercentBuyAmount_BTCUP}`)  //For debugging..
    return hundredPercentBuyAmount_BTCUP
}
hundredPercentBuyAmount_BTCUP()

async function hundredPercentSellAmount_BTCUP() {
    let hundredPercentSellAmount_BTCUP =  ( await balanceCheck_BTCUP() ) * 0.98
    //console.log(`Hundred percent BTCUP sell amount is: ${hundredPercentSellAmount_BTCUP}`)  //For debugging..
    return hundredPercentSellAmount_BTCUP
}
hundredPercentSellAmount_BTCUP()

//Market spot BUY/SELL orders!!
async function buyAndSellOrder(currency, side) {
    if(currency === 'BTCDOWN/USDT' && side === 'buy') {
        if(await balanceCheck_USDT() < 10 ) { return };
        binance.createMarketOrder('BTCDOWN/USDT', 'buy', await hundredPercentBuyAmount_BTCDOWN());
    }
    if(currency === 'BTCDOWN/USDT' && side === 'sell') {
        if((await balanceCheck_BTCDOWN() * await priceCheck_BTCDOWN()) < 10) { return }
        binance.createMarketOrder('BTCDOWN/USDT', 'sell', await hundredPercentSellAmount_BTCDOWN());
    }
    if(currency === 'BTCUP/USDT' && side === 'buy') {
        if(await balanceCheck_USDT() < 10 ) { return };
        binance.createMarketOrder('BTCUP/USDT', 'buy', await hundredPercentBuyAmount_BTCUP());
    }
    if(currency === 'BTCUP/USDT' && side === 'sell') {
        if((await balanceCheck_BTCUP() * await priceCheck_BTCUP()) < 10) { return }
        binance.createMarketOrder('BTCUP/USDT', 'sell', await hundredPercentSellAmount_BTCUP());
    }
}













  

