if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen5EventNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    get_filename_component(POKEFINDER_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../third_party/pokefinder" ABSOLUTE)
    include(CTest)
endif()

set(GEN5_EVENT_SOURCES bridge/gen5event_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen5event ${GEN5_EVENT_SOURCES})
    target_include_directories(gen5event PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen5event PRIVATE "-O3")
    target_link_options(
        gen5event
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen5EventModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen5event_api_version','_gen5event_search','_gen5event_result_ptr','_gen5event_result_count','_gen5event_processed_count','_gen5event_limit_reached','_gen5event_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU8','HEAPU32']"
    )
    set_target_properties(
        gen5event
        PROPERTIES
        OUTPUT_NAME "gen5event"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen5event_native_test ${GEN5_EVENT_SOURCES} tests/gen5event_native_test.cpp)
    target_include_directories(gen5event_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen5event_native_parity COMMAND gen5event_native_test)
endif()
