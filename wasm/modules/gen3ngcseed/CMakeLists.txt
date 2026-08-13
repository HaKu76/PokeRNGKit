if(EMSCRIPTEN)
    add_executable(gen3ngcseed bridge/gen3ngcseed_bridge.cpp)
    target_include_directories(gen3ngcseed PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3ngcseed PRIVATE "-O3")
    target_link_options(
        gen3ngcseed
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3NgcSeedModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen3ngcseed_api_version','_gen3ngcseed_search_gales','_gen3ngcseed_search_colo','_gen3ngcseed_search_channel','_gen3ngcseed_result_ptr','_gen3ngcseed_result_count','_gen3ngcseed_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3ngcseed
        PROPERTIES
        OUTPUT_NAME "gen3ngcseed"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3ngcseed_native_test bridge/gen3ngcseed_bridge.cpp tests/ngc_seed_native_test.cpp)
    target_include_directories(gen3ngcseed_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3ngcseed_native_contract COMMAND gen3ngcseed_native_test)
endif()
