            //Array consisting of "close value" of 100 intervals only , backward from end of OHLCV dataset
            const closedValueDataSet = []
            for (let i = OHLCV.length - 1; i >= OHLCV.length - 20; i--) {      //Modify the OHLCV.length - 20 part to fine tune the measurement window ( ex. MA20 ==> MA10 )
                closedValueDataSet.push(OHLCV[i][4]);                          //
            }                                                                  //                                //
            //Calculate actual instantanious MA20 value                        //                                //
            let readoutSum = 0;                                                //                                //
            let value_MA100ETHUP = 0                                           //                                //
            closedValueDataSet.forEach(element => {                            //                            //  //  //
                readoutSum += element                                          //                              //////
            });                                                                //                                //
            value_MA100ETHUP = readoutSum / 20                                  //DON'T forget to modify here too!! ( ex. MA20 ==> MA10 )