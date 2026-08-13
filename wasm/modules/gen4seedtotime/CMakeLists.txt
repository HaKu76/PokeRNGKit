if(EMSCRIPTEN)
    add_executable(gen4seedtotime bridge/gen4seedtotime_bridge.cpp)
    target_include_directories(gen4seedtotime PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen4seedtotime PRIVATE "-O3")
    target_link_options(
        gen4seedtotime
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4SeedToTimeModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen4seedtotime_api_version','_gen4seedtotime_generate','_gen4seedtotime_calibrate','_gen4seedtotime_result_ptr','_gen4seedtotime_result_count','_gen4seedtotime_calibration_ptr','_gen4seedtotime_calibration_count','_gen4seedtotime_status_sequence_low','_gen4seedtotime_status_sequence_high','_gen4seedtotime_status_raikou_route','_gen4seedtotime_status_entei_route','_gen4seedtotime_status_lati_route','_gen4seedtotime_status_skips','_gen4seedtotime_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen4seedtotime
        PROPERTIES
        OUTPUT_NAME "gen4seedtotime"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen4seedtotime_native_test bridge/gen4seedtotime_bridge.cpp tests/seed_to_time4_native_test.cpp)
    target_include_directories(gen4seedtotime_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen4seedtotime_native_parity COMMAND gen4seedtotime_native_test)
endif()
