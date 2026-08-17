if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen8UndergroundNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN8_UNDERGROUND_SOURCES bridge/gen8underground_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen8underground ${GEN8_UNDERGROUND_SOURCES})
    target_include_directories(gen8underground PRIVATE bridge)
    target_compile_options(gen8underground PRIVATE "-O3")
    target_link_options(
        gen8underground
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen8UndergroundModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8underground_api_version','_gen8underground_generate','_gen8underground_result_ptr','_gen8underground_result_count','_gen8underground_processed_count','_gen8underground_limit_reached','_gen8underground_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen8underground
        PROPERTIES
        OUTPUT_NAME "gen8underground"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen8underground_native_test ${GEN8_UNDERGROUND_SOURCES} tests/gen8underground_native_test.cpp)
    target_include_directories(gen8underground_native_test PRIVATE bridge)
    add_test(NAME gen8underground_native_parity COMMAND gen8underground_native_test)
endif()
