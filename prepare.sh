cd server/lib/mongocdriver
mkdir cmake-build
cd cmake-build
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -DENABLE_AUTOMATIC_INIT_AND_CLEANUP=OFF -DENABLE_BSON=ON -DENABLE_TESTS=0 -DENABLE_EXAMPLES=0 -DCMAKE_PREFIX_PATH=./cmake_build -DCMAKE_INSTALL_PREFIX=./cmake_build -DBUILD_SHARED_LIBS=OFF -DBUILD_SHARED_AND_STATIC_LIBS=OFF
make
make install
rootFolder=$(pwd)
cd ../../../../

cd server/lib/mongocxxdriver
mkdir build
cd build
echo $rootFolder
#cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-1.0_DIR="..\..\mongocdriver\cmake-build\cmake_build\lib\cmake\libbson-1.0"
cmake -G "Unix Makefiles" .. -DCMAKE_BUILD_TYPE=Release -Dlibbson-static-1.0_DIR="${rootFolder}/cmake_build/lib/cmake/libbson-static-1.0" -Dlibmongoc-static-1.0_DIR="${rootFolder}/cmake_build/lib/cmake/libmongoc-static-1.0" -DCMAKE_CXX_FLAGS="-I'${rootFolder}/cmake_build/include/libmongoc-1.0' -I'${rootFolder}/cmake_build/include/libbson-1.0'" -DBUILD_SHARED_LIBS=OFF -DBUILD_SHARED_AND_STATIC_LIBS=OFF -DBSONCXX_POLY_USE_MNMLSTC=1
make mongocxx_static
make install
cd ../../../../

if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    sudo apt-get install libssl-dev
    sudo apt-get install libfmt-dev
else
    pacman -S mingw-w64-x86_64-openssl
    pacman -S mingw-w64-x86_64-fmt
fi