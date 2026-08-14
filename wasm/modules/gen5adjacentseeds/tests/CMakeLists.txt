cmake_minimum_required(VERSION 3.31)

project(PokeRNGKitGen5AdjacentSeedsNative LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 23)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

add_executable(
    gen5adjacentseeds_native_test
    ../bridge/gen5adjacentseeds_bridge.cpp
    gen5adjacentseeds_native_test.cpp
)
target_include_directories(gen5adjacentseeds_native_test PRIVATE ../bridge)

enable_testing()
add_test(NAME gen5adjacentseeds_native_parity COMMAND gen5adjacentseeds_native_test)
