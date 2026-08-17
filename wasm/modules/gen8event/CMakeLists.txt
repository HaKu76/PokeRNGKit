if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen8EventNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN8_EVENT_SOURCES bridge/gen8event_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen8event ${GEN8_EVENT_SOURCES})
    target_include_directories(gen8event PRIVATE bridge)
    target_compile_options(gen8event PRIVATE "-O3")
    target_link_options(
        gen8event
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen8EventModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8event_api_version','_gen8event_generate','_gen8event_result_ptr','_gen8event_result_count','_gen8event_processed_count','_gen8event_limit_reached','_gen8event_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen8event
        PROPERTIES
        OUTPUT_NAME "gen8event"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen8event_native_test ${GEN8_EVENT_SOURCES} tests/gen8event_native_test.cpp)
    target_include_directories(gen8event_native_test PRIVATE bridge)
    add_test(NAME gen8event_native_parity COMMAND gen8event_native_test)
endif()
