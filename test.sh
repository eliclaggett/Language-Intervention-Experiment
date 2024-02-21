#!/bin/bash

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
{ $(go env GOPATH)/bin/emp -s ":${PORT_EMPIRICA}" & }
pid1=$!

# Run NLP Server
. "${PYENV_ROOT}/versions/${VENV}/bin/activate"
{ python3 ./nlp/nlp.py & }
pid2=$!

function cleanup()
{
    # Cleanup child processes
    kill -9 $pid1 $pid2
    echo ''
    echo "Bye bye!"
}

trap cleanup SIGINT
wait