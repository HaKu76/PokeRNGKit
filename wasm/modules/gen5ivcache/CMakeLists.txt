if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5IvCacheNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    get_filename_component(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/pokefinder" ABSOLUTE)
    include(CTest)
endif()

set(GEN5_IVCACHE_SOURCES
    bridge/gen5ivcache_bridge.cpp
    "${POKEFINDER_ROOT}/Core/RNG/MT.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen5ivcache ${GEN5_IVCACHE_SOURCES})
    target_include_directories(gen5ivcache PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen5ivcache PRIVATE "-O3")
    target_link_options(
        gen5ivcache
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5IvCacheModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen5ivcache_api_version','_gen5ivcache_search','_gen5ivcache_result_ptr','_gen5ivcache_result_count','_gen5ivcache_processed_count','_gen5ivcache_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen5ivcache
        PROPERTIES
        OUTPUT_NAME "gen5ivcache"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen5ivcache_native_test ${GEN5_IVCACHE_SOURCES} tests/gen5ivcache_native_test.cpp)
    target_include_directories(gen5ivcache_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen5ivcache_native_parity COMMAND gen5ivcache_native_test)

    add_executable(
        gen5ivcache_result_limit_test
        ${GEN5_IVCACHE_SOURCES}
        tests/gen5ivcache_result_limit_test.cpp
    )
    target_include_directories(gen5ivcache_result_limit_test PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_definitions(
        gen5ivcache_result_limit_test
        PRIVATE POKERNGKIT_GEN5IVCACHE_MAX_BATCH_RESULTS=1
    )
    add_test(NAME gen5ivcache_native_result_limit COMMAND gen5ivcache_result_limit_test)
endif()
