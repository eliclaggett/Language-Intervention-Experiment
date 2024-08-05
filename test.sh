#!/bin/bash
tput sc

set -a            
source .env
set +a

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

# # Run NLP Server
{ ./deployment/run_nlp.command > log_nlp.log 2>&1 & }
pid2=$!

function cleanup()
{
    # Cleanup child processes
    kill -SIGINT $pid1 $pid2
    # kill -SIGINT $pid1
    rm log*

    ssh -o LogLevel=error -i ~/.ssh/eli-xps eli@eli-xps.lan.local.cmu.edu << EOF &> /dev/null
        kill \$(cat ~/RUNNING_PID)
        rm ~/RUNNING_PID
EOF

    # tput rc
    # tput el
    echo ''
    echo "Bye bye!"
}

trap cleanup SIGINT
wait