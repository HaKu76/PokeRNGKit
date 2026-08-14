if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5EggNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    get_filename_component(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/pokefinder" ABSOLUTE)
    include(CTest)
endif()

set(GEN5_EGG_SOURCES
    bridge/gen5egg_bridge.cpp
    "${POKEFINDER_ROOT}/Core/RNG/MT.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen5egg ${GEN5_EGG_SOURCES})
    target_include_directories(gen5egg PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen5egg PRIVATE "-O3")
    target_link_options(
        gen5egg
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5EggModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen5egg_api_version','_gen5egg_search','_gen5egg_result_ptr','_gen5egg_result_count','_gen5egg_processed_count','_gen5egg_limit_reached','_gen5egg_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen5egg
        PROPERTIES
        OUTPUT_NAME "gen5egg"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen5egg_native_test ${GEN5_EGG_SOURCES} tests/gen5egg_native_test.cpp)
    target_include_directories(gen5egg_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen5egg_native_parity COMMAND gen5egg_native_test)
endif()
