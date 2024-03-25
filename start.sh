#!/bin/bash

################################################################################
# Title: Start Experiment
# Author: Eli Claggett
# Date: January 24, 2024
# Description: Starts an Empirica experiment alongside a Python websocket server
#
# Usage:
#   ./start.sh
#
# Dependencies:
#   - Empirica
#   - Python 3
#   - Pyenv
#   - Pyenv Virtualenv
#
# Notes:
#   Please create a .env file in the same directory as this script with the following variables defined accordingly:
#       - DEPLOYMENT (dev or prod)
#       - PORT_EMPIRICA (e.g. 9600)
#       - PORT_PYTHON (e.g. 9601)
#       - STORE_PATH (full path for the location that tajriba.json should be stored, e.g., /home/ubuntu/{user}/data)
#       - VENV (pyenv virtualenv name)
#
################################################################################

echo $$ > RUNNING_PID

current_dir=$(pwd)
dt=$(date +%F)

# Load .env variables
set -a            
source .env
set +a

# Load pyenv and pyenv-virtualenv
export PYENV_ROOT="$HOME/.pyenv"
command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$pth"
eval "$(pyenv init -)"
if which pyenv-virtualenv-init > /dev/null; then eval "$(pyenv virtualenv-init -)"; fi

# Finished loading, start running
echo "Running Empirica and Python in '${DEPLOYMENT}' mode"

# Run Empirica
if [ "$DEPLOYMENT" == "dev" ]
then
    { empirica -s ":${PORT_EMPIRICA}" --server.proxyaddr "http://127.0.0.1:${PORT_EMPIRICA_PROXY}" -a ":${PORT_TAJRIBA}" & }
    pid1=$!
    echo "Empirica running with PID $pid1";
else
    { emp serve "${EXPERIMENT_NAME}.tar.zst" -s ":${PORT_EMPIRICA}"  --server.proxyaddr "http://127.0.0.1:${PORT_EMPIRICA_PROXY}" -a ":${PORT_TAJRIBA}" --tajriba.store.file "${STORE_PATH}/tajriba-${dt}.json" > "$current_dir/log_empirica.log" 2>&1 & }
    pid1=$!
    echo "Empirica running with PID $pid1";
fi

# Run Python
. "${PYENV_ROOT}/versions/${VENV}/bin/activate"
{ python3 "$current_dir/nlp/nlp.py" 1> "$current_dir/log_python.log" 2>&1 & }
pid2=$!
echo "Python running with PID $pid2";

# Stop all child processes when we stop this script
function cleanup()
{
    kill -9 $pid1 $pid2;
    echo "$pid1 and $pid2 stopped";
    rm log_*
    rm RUNNING_PID
    echo ''
    echo "Bye bye!"
}

# Keep script open until an interrupt is sent
trap cleanup SIGINT
wait