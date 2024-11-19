/*
 * Filename: utils.js
 * Author: Elijah Claggett
 *
 * Description:
 * This JavaScript file contains miscellaneous helper functions
 */

// Helper function to send messages to our Python server
function wsSend(data, retry = false) {
  if (retry && window.nlpServer.readyState !== 1) {
    setTimeout(() => {
      wsSend(data, true);
    }, 1000);
  } else if (window.nlpServer.readyState === 1) {
    window.nlpServer.send(data);
  }
}
export { wsSend };
