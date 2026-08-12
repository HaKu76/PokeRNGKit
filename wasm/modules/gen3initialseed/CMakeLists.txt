if(EMSCRIPTEN)
    add_executable(gen3initialseed bridge/gen3initialseed_bridge.cpp)
    target_include_directories(gen3initialseed PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3initialseed PRIVATE "-O3")
    target_link_options(
        gen3initialseed
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3InitialSeedModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3initialseed_api_version','_gen3initialseed_find_rs_ids','_gen3initialseed_find_target','_gen3initialseed_result_ptr','_gen3initialseed_result_count','_gen3initialseed_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3initialseed
        PROPERTIES
        OUTPUT_NAME "gen3initialseed"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3initialseed_native_test bridge/gen3initialseed_bridge.cpp tests/initial_seed_native_test.cpp)
    target_include_directories(gen3initialseed_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3initialseed_native_parity COMMAND gen3initialseed_native_test)
endif()
