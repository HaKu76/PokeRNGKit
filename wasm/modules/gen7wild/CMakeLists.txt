if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7WildNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_WILD_SOURCES bridge/gen7wild_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7wild ${GEN7_WILD_SOURCES})
    target_include_directories(gen7wild PRIVATE bridge)
    target_compile_options(gen7wild PRIVATE "-O3")
    target_link_options(
        gen7wild
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7WildModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7wild_api_version','_gen7wild_begin','_gen7wild_step','_gen7wild_result_ptr','_gen7wild_result_count','_gen7wild_step_processed','_gen7wild_total_processed','_gen7wild_total_results','_gen7wild_done','_gen7wild_limit_reached','_gen7wild_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7wild
        PROPERTIES
        OUTPUT_NAME "gen7wild"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen7wild_native_test ${GEN7_WILD_SOURCES} tests/gen7wild_native_test.cpp)
    target_include_directories(gen7wild_native_test PRIVATE bridge)
    add_test(NAME gen7wild_native_session COMMAND gen7wild_native_test)
endif()
