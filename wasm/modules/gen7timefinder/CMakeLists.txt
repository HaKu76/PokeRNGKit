if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7TimeFinderNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_TIMEFINDER_SOURCES bridge/gen7timefinder_bridge.cpp)
if(EMSCRIPTEN)
    add_executable(gen7timefinder ${GEN7_TIMEFINDER_SOURCES})
    target_include_directories(gen7timefinder PRIVATE bridge)
    target_compile_options(gen7timefinder PRIVATE "-O3")
    target_link_options(gen7timefinder PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7TimeFinderModule" "-sENVIRONMENT=worker" "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0" "-sASSERTIONS=0" "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen7timefinder_api_version','_gen7timefinder_initial_seed']")
    set_target_properties(gen7timefinder PROPERTIES OUTPUT_NAME "gen7timefinder" SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen7timefinder_native_test ${GEN7_TIMEFINDER_SOURCES} tests/gen7timefinder_native_test.cpp)
    target_include_directories(gen7timefinder_native_test PRIVATE bridge)
    add_test(NAME gen7timefinder_initial_seed COMMAND gen7timefinder_native_test)
endif()
