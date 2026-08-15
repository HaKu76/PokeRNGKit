if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7StationaryNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_STATIONARY_SOURCES bridge/gen7stationary_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7stationary ${GEN7_STATIONARY_SOURCES})
    target_include_directories(gen7stationary PRIVATE bridge)
    target_compile_options(gen7stationary PRIVATE "-O3")
    target_link_options(
        gen7stationary
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7StationaryModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7stationary_api_version','_gen7stationary_begin','_gen7stationary_step','_gen7stationary_result_ptr','_gen7stationary_result_count','_gen7stationary_step_processed','_gen7stationary_total_processed','_gen7stationary_total_results','_gen7stationary_done','_gen7stationary_limit_reached','_gen7stationary_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7stationary
        PROPERTIES
        OUTPUT_NAME "gen7stationary"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen7stationary_native_test
        ${GEN7_STATIONARY_SOURCES}
        tests/gen7stationary_native_test.cpp
    )
    target_include_directories(gen7stationary_native_test PRIVATE bridge)
    add_test(NAME gen7stationary_native_session COMMAND gen7stationary_native_test)
endif()
