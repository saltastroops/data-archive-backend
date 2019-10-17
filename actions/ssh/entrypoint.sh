#!/bin/sh

trap EXIT

SSH_PATH="$HOME"/.ssh
mkdir "$SSH_PATH"
touch "$SSH_PATH"/known_hosts

echo "$SSH_PRIVATE_KEY" > "$SSH_PATH"/deploy_key
chmod 700 "$SSH_PATH"
chmod 600 "$SSH_PATH"/known_hosts
chmod 600 "$SSH_PATH"/deploy_key

eval "$(ssh-agent -s)"
ssh-add "$SSH_PATH"/deploy_key

ssh-keyscan -t ecdsa "$HOST" >> "$SSH_PATH/known_hosts"

echo "$COMMAND" > "$HOME"/shell.sh
echo "---------------------Beginning of the command to execute--------------------------------"
cat "$HOME"/shell.sh
echo "---------------------------Ending of the command----------------------------------------"

ssh -o StrictHostKeyChecking=no -tt "$USER"@"$HOST" -p "$PORT" < "$HOME"/shell.sh