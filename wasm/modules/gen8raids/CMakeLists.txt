if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen8RaidsNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN8_RAIDS_SOURCES bridge/gen8raids_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen8raids ${GEN8_RAIDS_SOURCES})
    target_include_directories(gen8raids PRIVATE bridge)
    target_compile_options(gen8raids PRIVATE "-O3")
    target_link_options(
        gen8raids
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen8RaidsModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8raids_api_version','_gen8raids_generate','_gen8raids_result_ptr','_gen8raids_result_count','_gen8raids_processed_count','_gen8raids_limit_reached','_gen8raids_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen8raids
        PROPERTIES
        OUTPUT_NAME "gen8raids"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen8raids_native_test ${GEN8_RAIDS_SOURCES} tests/gen8raids_native_test.cpp)
    target_include_directories(gen8raids_native_test PRIVATE bridge)
    add_test(NAME gen8raids_native_parity COMMAND gen8raids_native_test)
endif()
