cmake_minimum_required(VERSION 3.21)

set(GEN8_WILD_SOURCES bridge/gen8wild_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen8wild ${GEN8_WILD_SOURCES})
    target_include_directories(gen8wild PRIVATE bridge)
    target_compile_features(gen8wild PRIVATE cxx_std_20)
    target_compile_options(gen8wild PRIVATE "-O3")
    target_link_options(
        gen8wild
        PRIVATE
        "-O3"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sENVIRONMENT=worker"
        "-sEXPORT_ES6=1"
        "-sMODULARIZE=1"
        "-sFILESYSTEM=0"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen8wild_api_version','_gen8wild_generate','_gen8wild_result_ptr','_gen8wild_result_count','_gen8wild_processed_count','_gen8wild_limit_reached','_gen8wild_last_error']"
    )
    set_target_properties(
        gen8wild
        PROPERTIES
        OUTPUT_NAME "gen8wild"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
else()
    add_executable(gen8wild_native_test ${GEN8_WILD_SOURCES} tests/gen8wild_native_test.cpp)
    target_include_directories(gen8wild_native_test PRIVATE bridge)
    target_compile_features(gen8wild_native_test PRIVATE cxx_std_20)
    add_test(NAME gen8wild_native_parity COMMAND gen8wild_native_test)
endif()
