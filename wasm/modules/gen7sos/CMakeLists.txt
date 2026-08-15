if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7SosNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_SOS_SOURCES bridge/gen7sos_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7sos ${GEN7_SOS_SOURCES})
    target_include_directories(gen7sos PRIVATE bridge)
    target_compile_options(gen7sos PRIVATE "-O3")
    target_link_options(
        gen7sos
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7SosModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7sos_api_version','_gen7sos_begin','_gen7sos_step','_gen7sos_result_ptr','_gen7sos_result_count','_gen7sos_step_processed','_gen7sos_total_processed','_gen7sos_total_results','_gen7sos_done','_gen7sos_limit_reached','_gen7sos_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7sos
        PROPERTIES
        OUTPUT_NAME "gen7sos"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen7sos_native_test ${GEN7_SOS_SOURCES} tests/gen7sos_native_test.cpp)
    target_include_directories(gen7sos_native_test PRIVATE bridge)
    add_test(NAME gen7sos_native_session COMMAND gen7sos_native_test)
endif()
