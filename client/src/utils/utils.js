function wsSend(data, retry=false) {
    if (retry && window.nlpServer.readyState !== 1) { 
        setTimeout(() => {wsSend(data, true)}, 1000);
    } else if (window.nlpServer.readyState === 1) {
        window.nlpServer.send(data);
    }
}
export { wsSend };