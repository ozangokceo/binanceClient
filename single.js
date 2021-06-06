//Node.js app for single coin pairs only (ex. BTCUP/USDT..)

require('dotenv').config();
const ccxt =  require('ccxt');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

//Trend array and trend vector both have to be declared outside , or their value will get wiped out every time func is run..
const valueArray_BTCUP = [0,0];  //This is used for calculating Trend Vector. Values are actual prices.

let trendVector_BTCUP = 1;

higherAssistDataArray = [];

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

//----------------...Main function...--------------------
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
            }
        }
        console.log("")
        console.log("GUNCEL COIN BAKIYELERI:")
        console.table(nonZeroBalances);
    }
    balanceCheck();
    

    //Fetches BTCUP data
    async function fetchOHLCV() {
        const OHLCV = await binance.fetchOHLCV('BTCUP/USDT', '1m')
        let count; 
        //console.table(OHLCV);

        //Derive a Moving Average value based on past readouts
        const deriveMA100 = () => {
            //Current DateTime
            const time = new Date()
            console.log("-----TARIH/SAAT---")
            console.log(time.toLocaleDateString(), time.toLocaleTimeString());
            console.log("------------------") 
            //console.log(closedValueDataSet)     

            //
            //TO-DO: "Girme" noktasından itibaren extrapolasyon yapan bir fonksiyon oluşturulup , tam düşmeden üstlerde kesmesi sağlanıp erken (yüksekte satması sağlanabilir)
            //

            //another version of closedValueDataSet , but this is used as a basis for Arnoud Legoux calculation
            const closedValueDataSet_500 = []
            for (let i = OHLCV.length - 1; i >= OHLCV.length - 500; i--) {    
                closedValueDataSet_500.push(OHLCV[i][4]);                          
            }                                                    
 
            const closedValueDataSet_50 = []
            for (let i = OHLCV.length - 1; i >= OHLCV.length - 50; i--) {    
                closedValueDataSet_50.push(OHLCV[i][4]);                          
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

            let ALMA50_Value = arnoudLegoux(closedValueDataSet_50, 50, 0.85, 6)
            let ALMA500_Value = arnoudLegoux(closedValueDataSet_500, 500, 0.85, 6)

            console.log(`Current ALMA_50 value is: ${ALMA50_Value}`)
            console.log(`Current ALMA_500 value is: ${ALMA500_Value}`)

            //Derive current trend of BTCUP
            const deriveTrend = async () => {       
                if(valueArray_BTCUP.length === 2) {
                    valueArray_BTCUP.shift()
                    valueArray_BTCUP.push(ALMA50_Value)    //by this way , valueArray keeps an equilibrium lenght of 2..
                }
 
                if(valueArray_BTCUP[0] !== 0) {               
                    trendVector_BTCUP = ( valueArray_BTCUP[1] / valueArray_BTCUP[0] );  //Trend vector is calculated as percentages now.(ex. 0.98 , 1.12 etc..)
                } else { trendVector_BTCUP = 0 }

                //console.log(valueArray_BTCUP);  //For debugging purposes
                console.log(`BTCUP Trend: ${trendVector_BTCUP}`);     
                console.log(valueArray_BTCUP);

                //Balance and totalEquity checks..
                let ethUpBalance = await balanceCheck_BTCUP();
                let ethUpPrice = await priceCheck_BTCUP();
                let usdtBalance = await balanceCheck_USDT();
                let totalEquityUSDT = ( ethUpBalance * ethUpPrice ) + usdtBalance
                console.log(`Total equity in USDT: ${totalEquityUSDT}`)

                //Trigger order logic..
                const orderTriggerControl = async () => {                   
                    if( ALMA50_Value > ( ALMA500_Value + 0.05 )) {  //USDT ==> BTCUP   
                        await buyAndSellOrder('BTCUP/USDT', 'buy')          
                    }
                    if( ALMA50_Value < ( ALMA500_Value - 0.05 )) {  //BTCUP ==> USDT 
                        await buyAndSellOrder('BTCUP/USDT', 'sell')
                    } 
                }
                orderTriggerControl();
            }
            deriveTrend();
        }
        deriveMA100();      
    }
    fetchOHLCV()
}

//Execute main() once at the beginning and leave the rest to the setInterval() process
main();
setInterval(main, 60000);


//Check prices----------------------------------------------------------
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

async function hundredPercentBuyAmount_BTCUP() {
    let hundredPercentBuyAmount_BTCUP = ( await balanceCheck_USDT() / await priceCheck_BTCUP() ) * 0.99
    console.log("-----------------------------") 
    //console.log(`Hundred percent BTCUP buy amount is: ${hundredPercentBuyAmount_BTCUP}`)  //For debugging..
    return hundredPercentBuyAmount_BTCUP
}
hundredPercentBuyAmount_BTCUP()

async function hundredPercentSellAmount_BTCUP() {
    let hundredPercentSellAmount_BTCUP =  ( await balanceCheck_BTCUP() ) * 0.99
    console.log("-----------------------------")
    //console.log(`Hundred percent BTCUP sell amount is: ${hundredPercentSellAmount_BTCUP}`)  //For debugging..
    return hundredPercentSellAmount_BTCUP
}
hundredPercentSellAmount_BTCUP()

//Market spot BUY/SELL orders!!
async function buyAndSellOrder(currency, side) {
    if(currency === 'BTCUP/USDT' && side === 'buy') {
        if(await balanceCheck_USDT() < 10 ) { return };
        binance.createMarketOrder('BTCUP/USDT', 'buy', await hundredPercentBuyAmount_BTCUP());
    }
    if(currency === 'BTCUP/USDT' && side === 'sell') {
        if((await balanceCheck_BTCUP() * await priceCheck_BTCUP()) < 10) { return }
        binance.createMarketOrder('BTCUP/USDT', 'sell', await hundredPercentSellAmount_BTCUP());
    }
}













  

