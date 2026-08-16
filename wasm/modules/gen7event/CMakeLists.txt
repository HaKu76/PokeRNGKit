if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7EventNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_EVENT_SOURCES bridge/gen7event_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7event ${GEN7_EVENT_SOURCES})
    target_include_directories(gen7event PRIVATE bridge)
    target_compile_options(gen7event PRIVATE "-O3")
    target_link_options(
        gen7event
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7EventModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7event_api_version','_gen7event_begin','_gen7event_step','_gen7event_result_ptr','_gen7event_result_count','_gen7event_step_processed','_gen7event_total_processed','_gen7event_total_results','_gen7event_done','_gen7event_limit_reached','_gen7event_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen7event
        PROPERTIES
        OUTPUT_NAME "gen7event"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen7event_native_test
        ${GEN7_EVENT_SOURCES}
        tests/gen7event_native_test.cpp
    )
    target_include_directories(gen7event_native_test PRIVATE bridge)
    add_test(NAME gen7event_native_session COMMAND gen7event_native_test)
endif()
