if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5StaticNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    get_filename_component(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/pokefinder" ABSOLUTE)
    include(CTest)
endif()

set(GEN5_STATIC_SOURCES
    bridge/gen5static_bridge.cpp
    "${POKEFINDER_ROOT}/Core/RNG/MT.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen5static ${GEN5_STATIC_SOURCES})
    target_include_directories(gen5static PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen5static PRIVATE "-O3")
    target_link_options(
        gen5static
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5StaticModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen5static_api_version','_gen5static_configure_cache','_gen5static_clear_cache','_gen5static_search','_gen5static_result_ptr','_gen5static_result_count','_gen5static_processed_count','_gen5static_limit_reached','_gen5static_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32']"
    )
    set_target_properties(
        gen5static
        PROPERTIES
        OUTPUT_NAME "gen5static"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen5static_native_test
        ${GEN5_STATIC_SOURCES}
        tests/gen5static_native_test.cpp
    )
    target_include_directories(gen5static_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen5static_native_parity COMMAND gen5static_native_test)
endif()
