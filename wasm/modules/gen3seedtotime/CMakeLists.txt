if(EMSCRIPTEN)
    add_executable(gen3seedtotime bridge/gen3seedtotime_bridge.cpp)
    target_include_directories(gen3seedtotime PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3seedtotime PRIVATE "-O3")
    target_link_options(
        gen3seedtotime
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3SeedToTimeModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3seedtotime_api_version','_gen3seedtotime_calculate','_gen3seedtotime_origin_seed','_gen3seedtotime_advances','_gen3seedtotime_result_ptr','_gen3seedtotime_result_count','_gen3seedtotime_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3seedtotime
        PROPERTIES
        OUTPUT_NAME "gen3seedtotime"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3seedtotime_native_test bridge/gen3seedtotime_bridge.cpp tests/seed_to_time_native_test.cpp)
    target_include_directories(gen3seedtotime_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3seedtotime_native_parity COMMAND gen3seedtotime_native_test)
endif()
