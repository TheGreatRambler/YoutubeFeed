cd server/lib/mongocdriver
mkdir cmake-build
cd cmake-build
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -DENABLE_AUTOMATIC_INIT_AND_CLEANUP=OFF -DENABLE_BSON=ON -DENABLE_TESTS=0 -DENABLE_EXAMPLES=0 -DCMAKE_PREFIX_PATH=./cmake_build -DCMAKE_INSTALL_PREFIX=./cmake_build
make
make install
cd ../../../../

cd server/lib/mongocxxdriver
mkdir build
cd build
#cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-1.0_DIR="..\..\mongocdriver\cmake-build\cmake_build\lib\cmake\libbson-1.0"
rootFolder=$(pwd)
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-1.0_DIR="${rootFolder}\server\lib\mongocdriver\cmake-build\cmake_build\lib\cmake\libbson-1.0" -Dlibmongoc-1.0_DIR="${rootFolder}\server\lib\mongocdriver\cmake-build\cmake_build\lib\cmake\libmongoc-1.0"
make
cd ../../../../