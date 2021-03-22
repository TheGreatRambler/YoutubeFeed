cd server
make BUILD=release
cd ../
cp server/ssl/server.pem server/bin
cp server/ssl/server.key server/bin
cp server/ssl/dh.pem server/bin