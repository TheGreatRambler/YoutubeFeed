cd server/lib/mongocdriver
mkdir cmake-build
cd cmake-build
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -DENABLE_AUTOMATIC_INIT_AND_CLEANUP=OFF -DENABLE_BSON=ON -DENABLE_TESTS=0 -DENABLE_EXAMPLES=0 -DCMAKE_PREFIX_PATH=./cmake_build -DCMAKE_INSTALL_PREFIX=./cmake_build
make
make install
rootFolder=$(pwd)
cd ../../../../

cd server/lib/mongocxxdriver
mkdir build
cd build
echo $rootFolder
#cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-1.0_DIR="..\..\mongocdriver\cmake-build\cmake_build\lib\cmake\libbson-1.0"
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-1.0_DIR="${rootFolder}\cmake_build\lib\cmake\libbson-1.0" -Dlibmongoc-1.0_DIR="${rootFolder}\cmake_build\lib\cmake\libmongoc-1.0" -DCMAKE_CXX_FLAGS="-I'${rootFolder}\cmake_build\include\libmongoc-1.0' -I'${rootFolder}\cmake_build\include\libbson-1.0'"
make
make install
cd ../../../../