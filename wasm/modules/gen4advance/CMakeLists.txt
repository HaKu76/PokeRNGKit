if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen4AdvanceNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN4_ADVANCE_SOURCES bridge/gen4advance_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen4advance ${GEN4_ADVANCE_SOURCES})
    target_include_directories(gen4advance PRIVATE bridge)
    target_compile_options(gen4advance PRIVATE "-O3")
    target_link_options(
        gen4advance
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4AdvanceModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen4advance_api_version','_gen4advance_search','_gen4advance_result_ptr','_gen4advance_result_count','_gen4advance_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen4advance
        PROPERTIES
        OUTPUT_NAME "gen4advance"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen4advance_native_test ${GEN4_ADVANCE_SOURCES} tests/advance_native_test.cpp)
    target_include_directories(gen4advance_native_test PRIVATE bridge)
    add_test(NAME gen4advance_native_parity COMMAND gen4advance_native_test)
endif()
