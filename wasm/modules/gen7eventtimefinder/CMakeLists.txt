if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen7EventTimeFinderNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN7_EVENT_TIME_FINDER_SOURCES bridge/gen7eventtimefinder_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7eventtimefinder ${GEN7_EVENT_TIME_FINDER_SOURCES})
    target_include_directories(gen7eventtimefinder PRIVATE bridge)
    target_compile_options(gen7eventtimefinder PRIVATE "-O3")
    target_link_options(gen7eventtimefinder PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7EventTimeFinderModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7eventtimefinder_api_version','_gen7eventtimefinder_begin','_gen7eventtimefinder_step','_gen7eventtimefinder_result_ptr','_gen7eventtimefinder_result_count','_gen7eventtimefinder_step_processed','_gen7eventtimefinder_total_processed','_gen7eventtimefinder_total_results','_gen7eventtimefinder_done','_gen7eventtimefinder_limit_reached','_gen7eventtimefinder_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen7eventtimefinder PROPERTIES
        OUTPUT_NAME "gen7eventtimefinder"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen7eventtimefinder_native_test ${GEN7_EVENT_TIME_FINDER_SOURCES} tests/gen7eventtimefinder_native_test.cpp)
    target_include_directories(gen7eventtimefinder_native_test PRIVATE bridge)
    add_test(NAME gen7eventtimefinder_session COMMAND gen7eventtimefinder_native_test)
endif()
