function formatMoney(val) {
    return Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}
function msToTime(duration) {
    if (duration == null) { return ''; }
    if (duration < 0) { duration = 0; }

    let seconds = parseInt((duration/1000)%60)
        , minutes = parseInt(duration/1000/60)

    minutes = (minutes < 10) ? "0" + minutes : minutes;
    seconds = (seconds < 10) ? "0" + seconds : seconds;
    return minutes + ":" + seconds;
}
export { formatMoney, msToTime };