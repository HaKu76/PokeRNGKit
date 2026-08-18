if(CMAKE_SOURCE_DIR STREQUAL CMAKE_CURRENT_SOURCE_DIR)
    cmake_minimum_required(VERSION 3.31)
    project(PokeRNGKitGen6EggNative LANGUAGES CXX)
    set(CMAKE_CXX_STANDARD 23)
    set(CMAKE_CXX_STANDARD_REQUIRED ON)
    set(CMAKE_CXX_EXTENSIONS OFF)
    include(CTest)
endif()

set(GEN6_EGG_SOURCES bridge/gen6egg_bridge.cpp)
if(EMSCRIPTEN)
    add_executable(gen6egg ${GEN6_EGG_SOURCES})
    target_include_directories(gen6egg PRIVATE bridge)
    target_compile_options(gen6egg PRIVATE "-O3")
    target_link_options(
        gen6egg
        PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1" "-sEXPORT_NAME=createGen6EggModule"
                "-sENVIRONMENT=worker" "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0"
                "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc"
                "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen6egg_api_version','_gen6egg_begin','_gen6egg_step','_gen6egg_result_ptr','_gen6egg_result_count','_gen6egg_step_processed','_gen6egg_total_processed','_gen6egg_done','_gen6egg_last_error']"
                "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen6egg PROPERTIES OUTPUT_NAME "gen6egg" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen6egg_native_test ${GEN6_EGG_SOURCES} tests/gen6egg_native_test.cpp)
    target_include_directories(gen6egg_native_test PRIVATE bridge)
    add_test(NAME gen6egg_native_parity COMMAND gen6egg_native_test)
endif()
