if(EMSCRIPTEN)
    add_executable(gen3wild bridge/gen3wild_bridge.cpp)
    target_include_directories(gen3wild PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3wild PRIVATE "-O3")
    target_link_options(
        gen3wild
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3WildModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen3wild_api_version','_gen3wild_generate','_gen3wild_result_ptr','_gen3wild_result_count','_gen3wild_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3wild
        PROPERTIES
        OUTPUT_NAME "gen3wild"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3wild_native_test bridge/gen3wild_bridge.cpp tests/wild3_native_test.cpp)
    target_include_directories(gen3wild_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3wild_native_parity COMMAND gen3wild_native_test)
endif()
