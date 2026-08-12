if(EMSCRIPTEN)
    add_executable(gen3egg bridge/gen3egg_bridge.cpp)
    target_include_directories(gen3egg PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3egg PRIVATE "-O3")
    target_link_options(
        gen3egg PRIVATE "-O3" "-sMODULARIZE=1" "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3EggModule" "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1" "-sFILESYSTEM=0" "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1" "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3egg_api_version','_gen3egg_generate','_gen3egg_result_ptr','_gen3egg_result_count','_gen3egg_result_truncated','_gen3egg_last_error','_malloc','_free']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen3egg PROPERTIES OUTPUT_NAME "gen3egg" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen3egg_native_test bridge/gen3egg_bridge.cpp tests/egg3_native_test.cpp)
    target_include_directories(gen3egg_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3egg_native_parity COMMAND gen3egg_native_test)
endif()
