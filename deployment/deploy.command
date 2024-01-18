#!/bin/bash
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")/../" ; pwd -P )
cd "$parent_path"

# Load dotenv
export $(cat .env | xargs)

# cd "../"
empirica bundle

# cd "../"
echo $SERVER_SSH

sftp -b - -i deployment/server.pem $SERVER_SSH <<EOF
	put -r "$parent_path/chat-cooperation.tar.zst" /home/ubuntu/eli/experiment/
	put "$parent_path/start.sh" /home/ubuntu/eli/experiment/start.sh
	put "$parent_path/.env_prod" /home/ubuntu/eli/experiment/.env
	put "$parent_path/texts.json" /home/ubuntu/eli/texts.json
	put "$parent_path/nlp/nlp.py" /home/ubuntu/eli/experiment/nlp/nlp.py
	put "/Users/eclagget/Code/update-empirica.sh" /home/ubuntu/eli/update_empirica.sh
	exit
EOF