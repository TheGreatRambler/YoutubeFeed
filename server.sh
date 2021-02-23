mkdir -p mongodDB/db
mongod --dbpath ./mongodDB/db --networkMessageCompressors zstd --cpu