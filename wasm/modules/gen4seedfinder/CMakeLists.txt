if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen4SeedFinderNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN4_SEED_FINDER_SOURCES bridge/gen4seedfinder_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen4seedfinder ${GEN4_SEED_FINDER_SOURCES})
    target_include_directories(gen4seedfinder PRIVATE bridge)
    target_compile_options(gen4seedfinder PRIVATE "-O3")
    target_link_options(
        gen4seedfinder
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4SeedFinderModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen4seedfinder_api_version','_gen4seedfinder_search','_gen4seedfinder_result_ptr','_gen4seedfinder_result_count','_gen4seedfinder_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen4seedfinder PROPERTIES OUTPUT_NAME "gen4seedfinder" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen4seedfinder_native_test ${GEN4_SEED_FINDER_SOURCES} tests/seed_finder_native_test.cpp)
    target_include_directories(gen4seedfinder_native_test PRIVATE bridge)
    add_test(NAME gen4seedfinder_native_parity COMMAND gen4seedfinder_native_test)
endif()
