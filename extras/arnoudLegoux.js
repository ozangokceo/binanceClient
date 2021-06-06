function arnoudLegoux(series, windowsize, offset, sigma) {
    let m = offset * (windowsize - 1)
    //m = floor(offset * (windowsize - 1)) // Used as m when floor=true
    let s = windowsize / sigma
    let norm = 0.0
    let sum = 0.0

    for (let index = 0; index < windowsize - 1; index++) {
        const element = array[index];
        let weight = exp(-1 * pow(i - m, 2) / (2 * pow(s, 2)))
        let norm = norm + weight
        let sum = sum + series[windowsize - i - 1] * weight   
    }
    return ( sum / norm )
}
