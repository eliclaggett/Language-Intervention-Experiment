/*
 * Filename: formatting.js
 * Author: Elijah Claggett
 *
 * Description:
 * This JavaScript file contains helper functions for formatting different values
 */

// Helper function to format monetary values
function formatMoney(val) {
  return Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(val);
}

// Helper function to format time values
function msToTime(duration) {
  if (duration == null) {
    return "";
  }
  if (duration < 0) {
    duration = 0;
  }

  let seconds = parseInt((duration / 1000) % 60),
    minutes = parseInt(duration / 1000 / 60);

  minutes = minutes < 10 ? "0" + minutes : minutes;
  seconds = seconds < 10 ? "0" + seconds : seconds;
  return minutes + ":" + seconds;
}

export { formatMoney, msToTime };
