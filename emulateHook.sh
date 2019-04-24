#!/usr/bin/env bash
  FILE=/tmp/github.json
  WEBHOOK_PATH=$(grep route config.json |cut -f4 -d'"')
  data=$(cat $FILE)

  sig=$(echo -n "${data}" | openssl dgst -sha1 -hmac "%{WEBHOOK_SECRET}" | awk '{print "X-Hub-Signature: sha1="$2}')
   echo calling http://localhost:5000${WEBHOOK_PATH} with $FILE github hook simulate content
  curl -X POST -H "Content-Type: application/json" -H "${sig}" -d "${data}" http://localhost:5000${WEBHOOK_PATH}

