if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen8EggNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN8_EGG_SOURCES bridge/gen8egg_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen8egg ${GEN8_EGG_SOURCES})
    target_include_directories(gen8egg PRIVATE bridge)
    target_compile_options(gen8egg PRIVATE "-O3")
    target_link_options(
        gen8egg
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen8EggModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8egg_api_version','_gen8egg_generate','_gen8egg_result_ptr','_gen8egg_result_count','_gen8egg_processed_count','_gen8egg_limit_reached','_gen8egg_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen8egg
        PROPERTIES
        OUTPUT_NAME "gen8egg"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen8egg_native_test ${GEN8_EGG_SOURCES} tests/gen8egg_native_test.cpp)
    target_include_directories(gen8egg_native_test PRIVATE bridge)
    add_test(NAME gen8egg_native_parity COMMAND gen8egg_native_test)
endif()

