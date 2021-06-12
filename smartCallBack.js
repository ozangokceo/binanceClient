require('dotenv').config();

const fs = require('fs');
const ccxt =  require('ccxt');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

let smartCallBackRate = 0; 

const main = async() => {
    const OHLCV = await binance.fetchOHLCV('BTCUP/USDT', '1m')
    
    ///SMART CALLBACK WINDOW!!
    const smartCallBack = () => {
        let smartCallbackDataset = []
        let ratioArray = []; 
        let sum = 0;
        let average = 0;
        for (let i = OHLCV.length - 1; i >= OHLCV.length - 10; i--) {    
            smartCallbackDataset.push(OHLCV[i][4]);                          
        }             
        for (let i = 0; i < smartCallbackDataset.length ; i++) {   
            if( !smartCallbackDataset[i + 1] ) break;
            if( smartCallbackDataset[i + 1] > smartCallbackDataset[ i ] ) {
                ratioArray.push(smartCallbackDataset[i + 1] / smartCallbackDataset[i])                         
            }
            if( smartCallbackDataset[i + 1] < smartCallbackDataset[ i ] ) {
                ratioArray.push(smartCallbackDataset[i] / smartCallbackDataset[i + 1])                         
            }
        }          
        for (const iterator of ratioArray) {
            sum += iterator
        }
        average = sum / ratioArray.length
        console.log(`SmartCallBackDataset: ${smartCallbackDataset}`);
        console.log(`RatioArray: ${ratioArray}`);
        console.log(`Sum: ${sum}`);
        console.log(`Average deviation: ${average}`);
    
        if(average < 1.0030 && average > 1.0025) {
            smartCallBackRate = 1.015

        } else if( average < 1.0025 && average > 1.002 ) {
            smartCallBackRate = 1.0125

        } else if( average < 1.002 && average > 1.0015 ) {
            smartCallBackRate = 1.01

        } else if( average < 1.0015 && average > 1.0010 ) {
            smartCallBackRate = 1.0075

        } else if( average < 1.0010 && average > 1.0005 ) {
            smartCallBackRate = 1.005

        } else if( average < 1.0005 ) {
            smartCallBackRate = 1.0025
        }
        console.log(`Smart callback rate: ${smartCallBackRate}`)
    }
    smartCallBack();
}
main();