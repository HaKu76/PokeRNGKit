if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5WildNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    get_filename_component(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/pokefinder" ABSOLUTE)
    include(CTest)
endif()

set(GEN5_WILD_SOURCES
    bridge/gen5wild_bridge.cpp
    "${POKEFINDER_ROOT}/Core/RNG/MT.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen5wild ${GEN5_WILD_SOURCES})
    target_include_directories(gen5wild PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen5wild PRIVATE "-O3")
    target_link_options(
        gen5wild
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5WildModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen5wild_api_version','_gen5wild_configure_cache','_gen5wild_clear_cache','_gen5wild_search','_gen5wild_result_ptr','_gen5wild_result_count','_gen5wild_processed_count','_gen5wild_limit_reached','_gen5wild_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32']"
    )
    set_target_properties(
        gen5wild
        PROPERTIES
        OUTPUT_NAME "gen5wild"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen5wild_native_test
        ${GEN5_WILD_SOURCES}
        tests/gen5wild_native_test.cpp
    )
    target_include_directories(gen5wild_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen5wild_native_parity COMMAND gen5wild_native_test)
endif()
