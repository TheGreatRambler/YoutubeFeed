mkdir -p server/ssl
cd server/ssl
certbot certonly -n --standalone -d www.tgrcode.com -d tgrcode.com
cp /etc/letsencrypt/live/www.tgrcode.com/fullchain.pem ./server.pem
cp /etc/letsencrypt/live/www.tgrcode.com/privkey.pem ./server.key
openssl dhparam -out ./dh.pem 2048