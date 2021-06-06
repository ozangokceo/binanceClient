require('dotenv').config();
const ccxt =  require('ccxt');

const binance = new ccxt.binance ({
    'apiKey': process.env.API_KEY,
    'secret': process.env.API_SECRET
})

let trades = binance.fetchMyTrades('BTCUP/USDT', 86400000);

console.log(trades);