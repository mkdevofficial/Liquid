cmake_minimum_required(VERSION 3.22.1)
project(liquid-quickjs C)

set(CMAKE_C_STANDARD 99)
set(CMAKE_C_FLAGS "${CMAKE_C_FLAGS} -O3 -flto -fvisibility=hidden -fPIC -D_GNU_SOURCE -DCONFIG_VERSION=\\\"2024-01-13\\\"")

include_directories(
    quickjs
)

add_library(liquid-quickjs SHARED
    quickjs/quickjs.c
    quickjs/libregexp.c
    quickjs/libunicode.c
    quickjs/dtoa.c
    jni/liquid_quickjs_jni.c
)

find_library(log-lib log)
find_library(m-lib m)

target_link_libraries(liquid-quickjs
    ${log-lib}
    ${m-lib}
)
