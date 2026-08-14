if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5Sha1CacheNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN5_SHA1_CACHE_SOURCES bridge/gen5sha1cache_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen5sha1cache ${GEN5_SHA1_CACHE_SOURCES})
    target_include_directories(gen5sha1cache PRIVATE bridge)
    target_compile_options(gen5sha1cache PRIVATE "-O3")
    target_link_options(
        gen5sha1cache
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5Sha1CacheModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen5sha1cache_api_version','_gen5sha1cache_search','_gen5sha1cache_result_ptr','_gen5sha1cache_result_count','_gen5sha1cache_processed_count','_gen5sha1cache_limit_reached','_gen5sha1cache_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32']"
    )
    set_target_properties(
        gen5sha1cache
        PROPERTIES
        OUTPUT_NAME "gen5sha1cache"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen5sha1cache_native_test
        ${GEN5_SHA1_CACHE_SOURCES}
        tests/gen5sha1cache_native_test.cpp
    )
    target_include_directories(gen5sha1cache_native_test PRIVATE bridge)
    add_test(NAME gen5sha1cache_native_parity COMMAND gen5sha1cache_native_test)
endif()
