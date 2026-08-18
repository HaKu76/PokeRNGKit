if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen6IdNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN6_ID_SOURCES bridge/gen6id_bridge.cpp)
if(EMSCRIPTEN)
    add_executable(gen6id ${GEN6_ID_SOURCES})
    target_include_directories(gen6id PRIVATE bridge)
    target_compile_options(gen6id PRIVATE "-O3")
    target_link_options(
        gen6id
        PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sEXPORT_NAME=createGen6IdModule"
                "-sENVIRONMENT=worker" "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0"
                "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc"
                "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen6id_api_version','_gen6id_begin','_gen6id_step','_gen6id_result_ptr','_gen6id_result_count','_gen6id_step_processed','_gen6id_total_processed','_gen6id_done','_gen6id_last_error']"
                "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen6id PROPERTIES OUTPUT_NAME "gen6id" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen6id_native_test ${GEN6_ID_SOURCES} tests/gen6id_native_test.cpp)
    target_include_directories(gen6id_native_test PRIVATE bridge)
    add_test(NAME gen6id_native_parity COMMAND gen6id_native_test)
endif()
