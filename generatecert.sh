cd server/ssl
openssl genrsa -out server.key 2048
openssl req -sha256 -new -key server.key -days 3650 -config db.cfg -out server.csr
openssl x509 -req -in server.csr -sha256 -signkey server.key -out server.crt -days 365
openssl x509 -in server.crt -out server.pem -outform PEM
openssl dhparam -out dh.pem 2048