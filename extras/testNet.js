const ccxt = require ('ccxt')

const binance = new ccxt.binance ({
    'apiKey': 'ScLVhIUINYQw7qdxANp8s39UtCcOh9A44QKdcOclHfHTsT5UjcQltU33d4YAxM08',
    'secret': 'sV217Kz1ZJmQliLXKOSd581Xb7ScqG5UxIKnWY6nXACuKwAkTc18dX56SJTZZYXp',
})
binance.set_sandbox_mode(true);

//Trend array and trend vector both have to be declared outside , or their value will get wiped out every time func is run..
const trendArray_BNB = [];
let trendVector_BNB = 0;
const trendVectorHistoryArray_BNB = [0, 0];
const assetHistoryUSDT = []  //New Feature!! Records an array of total asset(s) in USDT (Translation: How well are we doing?..)


const main = () => {
    //checks and prints balances  
    console.log("")
    console.log("")
    console.log("----------BEGINNING OF MESSAGE----------")
    async function balanceCheck() {
        const balance = await binance.fetchBalance();
        const nonZeroBalances = {}
        for (const key in balance.total) {                                            
            if (balance.total[key] !== 0) {
                nonZeroBalances[key] = balance.total[key]
                //nonZeroBalancesUSDT_EQUIV[key] = balance.total[key] * ()....//TO BE FINISHED
            }
        }
        console.log("")
        console.log("GUNCEL COIN BAKIYELERI:")
        console.table(nonZeroBalances);
    }
    balanceCheck();

    //Fetches BNB data
    async function fetchOHLCV_BNB() {
        const OHLCV = await binance.fetchOHLCV('BNB/USDT', '1m')
        //console.table(OHLCV);
        let count; 
        //console.table(OHLCV);

        //Derive a Moving Average value based on past 20 readouts(MA20 graph!!)
        //-------------------
        //Note that you DON'T have to "draw" anything or derive a polynomal function that spans a certain time window.
        //Only the instantanious single value MA20 is needed
        //-------------------
        const deriveMA20_BNB = () => {
            //Array consisting of "close value" of 20 intervals only , backward from end of OHLCV dataset
            const closedValueDataSet = []
            for (let i = OHLCV.length - 1; i >= OHLCV.length - 100; i--) {      //Modify the OHLCV.length - 20 part to fine tune the measurement window ( ex. MA20 ==> MA10 )
                closedValueDataSet.push(OHLCV[i][4]);                          //
            }                                                                  //                                //
            //Calculate actual instantanious MA20 value                        //                                //
            let readoutSum = 0;                                                //                                //
            let value_MA20BNB = 0                                              //                                //
            closedValueDataSet.forEach(element => {                            //                            //  //  //
                readoutSum += element                                          //                              //////
            });                                                                //                                //
            value_MA20BNB = readoutSum / 100                                  //DON'T forget to modify here too!! ( ex. MA20 ==> MA10 )
            const time = new Date()
            console.log("-----TARIH/SAAT---")
            console.log(time.toLocaleDateString(), time.toLocaleTimeString());
            console.log("------------------")
            console.log(`Current BNB MA20 value is ${value_MA20BNB}$`);   
            console.log(`Şu anki BNB/USDT fiyatı: ${closedValueDataSet[0]}$`);   
            //console.log(closedValueDataSet)     

            //Derive current trend of MA20_BNBUP
            const deriveTrend_BNB = () => {       
                if(trendArray_BNB.length === 0) {           
                    trendArray_BNB.push(value_MA20BNB)
                    trendArray_BNB.push(value_MA20BNB)
                }
                if(trendArray_BNB.length === 1) {
                    trendArray_BNB.push(value_MA20BNB)    //unnecessary for now. Array always carries 2 values.
                }
                if(trendArray_BNB.length === 2) {
                    trendArray_BNB.shift()
                    trendArray_BNB.push(value_MA20BNB)
                }

                if(trendArray_BNB[1] > trendArray_BNB[0]) {
                    trendVector_BNB = 1;
                } else if(trendArray_BNB[1] === trendArray_BNB[0]) { //extremely unlikely but.. maybe needed
                    trendVector_BNB = 0
                } else {
                    trendVector_BNB = -1
                }
                    //console.log(trendArray_BNBUP);  //For debugging purposes
                    console.log(`BNB Trend: ${trendVector_BNB}`);   
                    balanceAndPriceMessages() //Print prices and balances  
            }
            deriveTrend_BNB();
        }
        deriveMA20_BNB();      
    }
    fetchOHLCV_BNB()

    //Trigger order logic..
    const orderTriggerControl = async () => {
        //trend vector history array look up and check if its empty or has insufficient data..
        if(trendVectorHistoryArray_BNB.length === 0) {
            trendVectorHistoryArray_BNB.push(trendVector_BNB);
        }
        if(trendVectorHistoryArray_BNB.length === 1) {
            trendVectorHistoryArray_BNB.push(trendVector_BNB);
        }
        if(trendVectorHistoryArray_BNB.length === 2) {
            trendVectorHistoryArray_BNB.shift();
            trendVectorHistoryArray_BNB.push(trendVector_BNB)
        } //by this way , trendVectorHistoryArray keeps an equilibrium lenght of 2..
        console.table(`Trend vector history array is: ${trendVectorHistoryArray_BNB}`);
    
        if((trendVectorHistoryArray_BNB[0] === -1 && trendVectorHistoryArray_BNB[1] === 1 ) ||
            (trendVectorHistoryArray_BNB[0] === 0 && trendVectorHistoryArray_BNB[1] === 1 )) {  //USDT ==> BNB 
            await buyAndSellOrder('BNB/USDT', 'buy');
        }
        if((trendVectorHistoryArray_BNB[0] === 1 && trendVectorHistoryArray_BNB[1] === -1 ) ||
            (trendVectorHistoryArray_BNB[0] === 0 && trendVectorHistoryArray_BNB[1] === -1 )) {  //BNB ==> USDT
            await buyAndSellOrder('BNB/USDT', 'sell')
        } 
    }
    orderTriggerControl();
}

//Execute main() once at the beginning and leave the rest to the setInterval() process
main();
setInterval(main, 60000);

//------------------------------ORDER ZONE------------------------------
//Price checks----------------------------------------------------------
//Price check BNB
async function priceCheck_BNB() {
    let price_BNB;
    const OHLCV = await binance.fetchOHLCV('BNB/USDT', '1m');
    price_BNB = OHLCV[OHLCV.length - 1][4];
    return price_BNB;
}

//Check balances----------------------------------------------------------
//Balance check USDT
async function balanceCheck_USDT() {
    const balance = await binance.fetchBalance();
    let balance_USDT = balance.total.USDT;
    return balance_USDT;
}

//Balance check BNB
async function balanceCheck_BNB() {
    const balance = await binance.fetchBalance();
    let balance_BNB = balance.total.BNB;
    return balance_BNB
}

//Displays price and balance info...
async function balanceAndPriceMessages() {
    console.log(`BNB price is: ${await priceCheck_BNB()}`);
    console.log(`USDT balance is: ${await balanceCheck_USDT()}`);   
    console.log(`BNB balance is: ${await balanceCheck_BNB() - 994}`);   
    console.log(`TOTAL USD balance is: ${(( await balanceCheck_BNB() - 994 ) * await priceCheck_BNB()) + await balanceCheck_USDT()}`); 
    console.log("----------END OF MESSAGE----------")
}


//-----------------------------------------------------------------------------------------------------------------
//Exact 100% percent buy and sell amounts are calculated... With a 5% safety margin against wild price fluctuations.
//This is needed , because Binance does not provide any percent function for buy and sell operations over API. User has to calculate an exact amount.
//Whereas on the web site , user can choose a percentage (say , 100% percent) and exact figures are calculated on the background and buy/sell is executed.


async function hundredPercentBuyAmount_BNB() {
    let hundredPercentBuyAmount_BNB = ( await balanceCheck_USDT() / await priceCheck_BNB() ) * 0.98
    return hundredPercentBuyAmount_BNB
}
hundredPercentBuyAmount_BNB()

async function hundredPercentSellAmount_BNB() {
    let hundredPercentSellAmount_BNB =  ( await balanceCheck_BNB() - 994 ) * 0.98
    return hundredPercentSellAmount_BNB
}
hundredPercentSellAmount_BNB()


//Market spot BUY/SELL orders!!
async function buyAndSellOrder(currency, side) {
    if(currency === 'BNB/USDT' && side === 'buy') {
        binance.createMarketOrder('BNB/USDT', 'buy', await hundredPercentBuyAmount_BNB());
    }
    if(currency === 'BNB/USDT' && side === 'sell') {
        binance.createMarketOrder('BNB/USDT', 'sell', await hundredPercentSellAmount_BNB());
    }   
}


//binance.createMarketOrder('BNB/USDT', 'buy', 3000)
//binance.createMarketOrder('BNB/USDT', 'sell', 3000)
