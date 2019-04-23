#!/usr/bin/env bash

  data=$(cat /tmp/github.json)

  sig=$(echo -n "${data}" | openssl dgst -sha1 -hmac "%{WEBHOOK_SECRET}" | awk '{print "X-Hub-Signature: sha1="$2}')

  curl -X POST -H "Content-Type: application/json" -H "${sig}" -d "${data}" http://localhost:5000${WEBHOOK_PATH}

