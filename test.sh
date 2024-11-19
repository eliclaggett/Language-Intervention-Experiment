#!/bin/bash

################################################################################
# Filename: test.sh
# Author: Elijah Claggett
# Date: January 24, 2024
# Description: Tests an Empirica experiment alongside a Python websocket server
#
# Usage:
#   ./test.sh
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

# Load .env variables
set -a            
source .env
set +a

# Activate python virtual environment
export PYENV_ROOT="$HOME/.pyenv"
command -v pyenv >/dev/null || export PATH="$PYENV_ROOT/bin:$pth"
eval "$(pyenv init -)"
if which pyenv-virtualenv-init > /dev/null; then eval "$(pyenv virtualenv-init -)"; fi

# Remove Empirica cache
rm .empirica/local/tajriba.json

# Run Empirica
{ emp -s ":${PORT_EMPIRICA}" --server.proxyaddr "http://127.0.0.1:${PORT_EMPIRICA_PROXY}" -a ":${PORT_TAJRIBA}" --log.level trace & }
pid1=$!
echo $pid1 >> RUNNING_PID

# Run NLP Server
{ ./deployment/run_nlp.command > log_nlp.log 2>&1 & }
pid2=$!

function cleanup()
{
    # Cleanup child processes
    kill -SIGINT $pid1 $pid2
    rm log*

    ssh -o LogLevel=error -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu << EOF &> /dev/null
        kill -\$(cat ~/RUNNING_PID)
        rm ~/RUNNING_PID
EOF

    echo ''
    echo "Bye bye!"
}

trap cleanup SIGINT
wait