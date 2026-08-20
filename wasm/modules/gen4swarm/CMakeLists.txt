if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen4SwarmNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN4_SWARM_SOURCES bridge/gen4swarm_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen4swarm ${GEN4_SWARM_SOURCES})
    target_include_directories(gen4swarm PRIVATE bridge)
    target_compile_options(gen4swarm PRIVATE "-O3")
    target_link_options(
        gen4swarm
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4SwarmModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen4swarm_api_version','_gen4swarm_find_advances','_gen4swarm_find_seed','_gen4swarm_result_ptr','_gen4swarm_result_count','_gen4swarm_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen4swarm
        PROPERTIES
        OUTPUT_NAME "gen4swarm"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen4swarm_native_test ${GEN4_SWARM_SOURCES} tests/swarm_native_test.cpp)
    target_include_directories(gen4swarm_native_test PRIVATE bridge)
    add_test(NAME gen4swarm_native_parity COMMAND gen4swarm_native_test)
endif()
