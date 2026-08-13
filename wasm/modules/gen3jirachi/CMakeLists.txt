if(EMSCRIPTEN)
    add_executable(gen3jirachi bridge/gen3jirachi_bridge.cpp)
    target_include_directories(gen3jirachi PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3jirachi PRIVATE "-O3")
    target_link_options(
        gen3jirachi
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3JirachiModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3jirachi_api_version','_gen3jirachi_calculate','_gen3jirachi_compute_seed','_gen3jirachi_target_advances','_gen3jirachi_result_ptr','_gen3jirachi_result_count','_gen3jirachi_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3jirachi
        PROPERTIES
        OUTPUT_NAME "gen3jirachi"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3jirachi_native_test bridge/gen3jirachi_bridge.cpp tests/jirachi_native_test.cpp)
    target_include_directories(gen3jirachi_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3jirachi_native_parity COMMAND gen3jirachi_native_test)
endif()
