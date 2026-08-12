if(EMSCRIPTEN)
    add_executable(gen3ivtopid bridge/gen3ivtopid_bridge.cpp)
    target_include_directories(gen3ivtopid PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen3ivtopid PRIVATE "-O3")
    target_link_options(
        gen3ivtopid
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen3IvToPidModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen3ivtopid_api_version','_gen3ivtopid_calculate','_gen3ivtopid_result_ptr','_gen3ivtopid_result_count','_gen3ivtopid_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen3ivtopid
        PROPERTIES
        OUTPUT_NAME "gen3ivtopid"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen3ivtopid_native_test bridge/gen3ivtopid_bridge.cpp tests/ivtopid_native_test.cpp)
    target_include_directories(gen3ivtopid_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen3ivtopid_native_parity COMMAND gen3ivtopid_native_test)
endif()
