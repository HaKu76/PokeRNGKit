if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7EggNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_EGG_SOURCES bridge/gen7egg_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7egg ${GEN7_EGG_SOURCES})
    target_include_directories(gen7egg PRIVATE bridge)
    target_compile_options(gen7egg PRIVATE "-O3")
    target_link_options(
        gen7egg
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7EggModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7egg_api_version','_gen7egg_begin','_gen7egg_step','_gen7egg_result_ptr','_gen7egg_result_count','_gen7egg_step_processed','_gen7egg_total_processed','_gen7egg_total_results','_gen7egg_done','_gen7egg_limit_reached','_gen7egg_target_found','_gen7egg_summary_accepts','_gen7egg_summary_rejects','_gen7egg_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7egg
        PROPERTIES
        OUTPUT_NAME "gen7egg"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen7egg_native_test ${GEN7_EGG_SOURCES} tests/gen7egg_native_test.cpp)
    target_include_directories(gen7egg_native_test PRIVATE bridge)
    add_test(NAME gen7egg_native_session COMMAND gen7egg_native_test)
endif()
