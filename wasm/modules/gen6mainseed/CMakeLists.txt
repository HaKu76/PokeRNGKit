if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen6MainSeedNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN6_MAIN_SEED_SOURCES bridge/gen6mainseed_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen6mainseed ${GEN6_MAIN_SEED_SOURCES})
    target_include_directories(gen6mainseed PRIVATE bridge)
    target_compile_options(gen6mainseed PRIVATE "-O3")
    target_link_options(
        gen6mainseed
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen6MainSeedModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen6mainseed_api_version','_gen6mainseed_search','_gen6mainseed_result_ptr','_gen6mainseed_result_count','_gen6mainseed_processed_count','_gen6mainseed_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen6mainseed
        PROPERTIES OUTPUT_NAME "gen6mainseed" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen6mainseed_native_test
        ${GEN6_MAIN_SEED_SOURCES}
        tests/gen6mainseed_native_test.cpp
    )
    target_include_directories(gen6mainseed_native_test PRIVATE bridge)
    add_test(NAME gen6mainseed_native_parity COMMAND gen6mainseed_native_test)
endif()
