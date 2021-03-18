UNAME := $(shell uname -o)

ifeq ($(UNAME),Msys)
	TARGET_EXEC ?= youtubefeedserver.exe
else
	TARGET_EXEC ?= youtubefeedserver
endif

BUILD_DIR ?= ./bin

SRC_DIRS ?= ./src

ifeq ($(UNAME),Msys)
# Set compilers to MinGW64 compilers
CC := x86_64-w64-mingw32-gcc
CXX := x86_64-w64-mingw32-g++
else
CC := gcc
CXX := g++
endif

# C flags
CFLAGS := -std=c11

# C++ flags
CXXFLAGS := -std=gnu++17

# C/C++ flags
CPPFLAGS := -Wall -Wno-maybe-uninitialized -Wno-sign-compare -Wno-switch-enum -Wno-switch -Wno-deprecated-declarations -DASIO_STANDALONE -I./include -I./src/third_party -fdata-sections -ffunction-sections $(shell pkg-config --cflags openssl fmt) -I./lib/asio/asio/include -I./lib/websocketpp -I./lib/mongocxxdriver/build/install/include/bsoncxx/v_noabi -I./lib/mongocxxdriver/build/install/include/mongocxx/v_noabi -I./lib/mongocxxdriver/src

# Linker flags
# $(eval PKG_CONFIG_PATH=./lib/mongocdriver/cmake-build/cmake_build/lib/pkgconfig:./lib/mongocxxdriver/build/install/lib/pkgconfig pkg-config libmongocxx-static libbsoncxx-static --libs)
LDFLAGS := -Wl,--gc-sections $(shell pkg-config --libs openssl fmt) -L./lib/mongocdriver/cmake-build/cmake_build/lib -L./lib/mongocdriver/cmake-build/cmake_build/lib -L./lib/mongocxxdriver/build/install/lib -lmongocxx-static -lmongoc-static-1.0 -lz -lzstd -licuuc -lbsoncxx-static -lbson-static-1.0

ifeq ($(UNAME),Msys)
	# Needed for sockets on windows
	LDFLAGS += -lws2_32 -lwsock32 -lDnsapi -lsecur32 -lcrypt32 -lShlwapi -lsecur32 -lcrypt32 -lBcrypt -licuucd
else
	LDFLAGS += -lpthread -lssl -lcrypto -lrt -lresolv
endif

ifeq ($(BUILD),release)
	# "Release" build - optimization, and no debug symbols
	CPPFLAGS += -O3 -s -DNDEBUG
else
	# "Debug" build - no optimization, and debugging symbols
	CPPFLAGS += -Og -g -ggdb -DDEBUG
endif

ifeq ($(ARCH),32)
	CPPFLAGS += -m32
	LDFLAGS += -m32
else
	#CXXFLAGS += 
endif

ifeq ($(UNAME),Msys)
SRCS := $(shell find $(SRC_DIRS) -name *.cpp -or -name *.c -or -name *.s -or -name *.rc)
else
SRCS := $(shell find $(SRC_DIRS) -name *.cpp -or -name *.c -or -name *.s)
endif

OBJS := $(SRCS:%=$(BUILD_DIR)/%.o)
DEPS := $(OBJS:.o=.d)

INC_DIRS := $(shell find $(SRC_DIRS) -type d)
INC_FLAGS := $(addprefix -I,$(INC_DIRS))

CPPFLAGS ?= $(INC_FLAGS) -MMD -MP

all: $(BUILD_DIR)/$(TARGET_EXEC)

ifeq ($(UNAME),Msys)
$(BUILD_DIR)/$(TARGET_EXEC): $(OBJS)
	$(CXX) $(OBJS) -o $@ $(LDFLAGS)
	# Copy required DLLs to folder
	ldd $(BUILD_DIR)/$(TARGET_EXEC) | grep '\/mingw.*\.dll' -o | xargs -I{} cp -n "{}" $(BUILD_DIR)
else
$(BUILD_DIR)/$(TARGET_EXEC): $(OBJS)
	$(CXX) $(OBJS) -o $@ $(LDFLAGS)
endif

# assembly
$(BUILD_DIR)/%.s.o: %.s
	$(MKDIR_P) $(dir $@)
	$(AS) $(ASFLAGS) -c $< -o $@

# c source
$(BUILD_DIR)/%.c.o: %.c
	$(MKDIR_P) $(dir $@)
	$(CC) $(CPPFLAGS) $(CFLAGS) -c $< -o $@

# c++ source
$(BUILD_DIR)/%.cpp.o: %.cpp
	$(MKDIR_P) $(dir $@)
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) -c $< -o $@

ifeq ($(UNAME),Msys)
# Windows RES file
$(BUILD_DIR)/%.rc.o: %.rc
	$(MKDIR_P) $(dir $@)
	windres $< $@
endif


.PHONY: all clean

clean:
	$(RM) -r $(BUILD_DIR)

-include $(DEPS)

MKDIR_P ?= mkdir -p