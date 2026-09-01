if(EMSCRIPTEN)
    add_executable(gen3static bridge/gen3static_bridge.cpp)
    target_include_directories(gen3static PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3static PRIVATE "-O3")
    target_link_options(
        gen3static
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3StaticModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3static_api_version','_gen3static_generate','_gen3static_search','_gen3static_search_emerald','_gen3static_result_ptr','_gen3static_result_count','_gen3static_emerald_result_ptr','_gen3static_emerald_result_count','_gen3static_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3static
        PROPERTIES
        OUTPUT_NAME "gen3static"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3static_native_test bridge/gen3static_bridge.cpp tests/static3_native_test.cpp)
    target_include_directories(gen3static_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3static_native_parity COMMAND gen3static_native_test)
endif()
