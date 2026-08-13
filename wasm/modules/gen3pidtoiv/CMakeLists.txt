if(EMSCRIPTEN)
    add_executable(
        gen3pidtoiv
        bridge/gen3pidtoiv_bridge.cpp
        "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
    )
    target_include_directories(gen3pidtoiv PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3pidtoiv PRIVATE "-O3")
    target_link_options(
        gen3pidtoiv
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3PidToIvModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3pidtoiv_api_version','_gen3pidtoiv_calculate','_gen3pidtoiv_result_ptr','_gen3pidtoiv_result_count','_gen3pidtoiv_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3pidtoiv
        PROPERTIES
        OUTPUT_NAME "gen3pidtoiv"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen3pidtoiv_native_test
        bridge/gen3pidtoiv_bridge.cpp
        "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
        tests/pid_to_iv_native_test.cpp
    )
    target_include_directories(gen3pidtoiv_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3pidtoiv_native_parity COMMAND gen3pidtoiv_native_test)
endif()
