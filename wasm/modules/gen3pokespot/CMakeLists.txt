if(EMSCRIPTEN)
    add_executable(gen3pokespot bridge/gen3pokespot_bridge.cpp)
    target_include_directories(gen3pokespot PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3pokespot PRIVATE "-O3")
    target_link_options(
        gen3pokespot
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3PokeSpotModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3pokespot_api_version','_gen3pokespot_generate','_gen3pokespot_result_ptr','_gen3pokespot_result_count','_gen3pokespot_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3pokespot
        PROPERTIES
        OUTPUT_NAME "gen3pokespot"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3pokespot_native_test bridge/gen3pokespot_bridge.cpp tests/pokespot_native_test.cpp)
    target_include_directories(gen3pokespot_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3pokespot_native_parity COMMAND gen3pokespot_native_test)
endif()
