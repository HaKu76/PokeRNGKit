if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7MainNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_MAIN_SOURCES bridge/gen7main_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7main ${GEN7_MAIN_SOURCES})
    target_include_directories(gen7main PRIVATE bridge)
    target_compile_options(gen7main PRIVATE "-O3" "-msimd128")
    target_link_options(
        gen7main
        PRIVATE
        "-O3"
        "-msimd128"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7MainModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7main_api_version','_gen7main_search_seed','_gen7main_seed_result_ptr','_gen7main_seed_result_count','_gen7main_qr_search','_gen7main_qr_result_ptr','_gen7main_qr_result_count','_gen7main_calculate_time','_gen7main_time_primary','_gen7main_time_secondary','_gen7main_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7main
        PROPERTIES
        OUTPUT_NAME "gen7main"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen7main_native_test ${GEN7_MAIN_SOURCES} tests/gen7main_native_test.cpp)
    target_include_directories(gen7main_native_test PRIVATE bridge)
    add_test(NAME gen7main_native_parity COMMAND gen7main_native_test)
endif()
