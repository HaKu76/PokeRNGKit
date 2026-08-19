if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen6TinyIndexNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN6_TINYINDEX_SOURCES bridge/gen6tinyindex_bridge.cpp)
if(EMSCRIPTEN)
    add_executable(gen6tinyindex ${GEN6_TINYINDEX_SOURCES})
    target_include_directories(gen6tinyindex PRIVATE bridge)
    target_compile_options(gen6tinyindex PRIVATE "-O3")
    target_link_options(
        gen6tinyindex
        PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sEXPORT_NAME=createGen6TinyIndexModule"
                "-sENVIRONMENT=worker" "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0"
                "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc"
                "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen6tinyindex_api_version','_gen6tinyindex_begin','_gen6tinyindex_step','_gen6tinyindex_result_ptr','_gen6tinyindex_result_count','_gen6tinyindex_step_processed','_gen6tinyindex_total_processed','_gen6tinyindex_done','_gen6tinyindex_last_error']"
                "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen6tinyindex PROPERTIES OUTPUT_NAME "gen6tinyindex" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen6tinyindex_native_test ${GEN6_TINYINDEX_SOURCES} tests/gen6tinyindex_native_test.cpp)
    target_include_directories(gen6tinyindex_native_test PRIVATE bridge)
    add_test(NAME gen6tinyindex_native_parity COMMAND gen6tinyindex_native_test)
endif()
