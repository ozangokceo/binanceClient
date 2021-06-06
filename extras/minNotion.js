async function determineMinNotion() {
    let MIN_NOTIONAL_ETHUP = await binance.market('ETHUP/USDT')['limits']['cost']['min']
    let MIN_NOTIONAL_ETHDOWN = await binance.market('ETHDOWN/USDT')['limits']['cost']['min']
    console.log(MIN_NOTIONAL_ETHUP);
    console.log(MIN_NOTIONAL_ETHDOWN);
}
determineMinNotion();