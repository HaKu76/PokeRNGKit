set(GEN4_CHAINED_SID_SOURCES
    bridge/gen4chainedsid_bridge.cpp
    "${POKEFINDER_ROOT}/Core/RNG/LCRNGReverse.cpp"
)

if(EMSCRIPTEN)
    add_executable(gen4chainedsid ${GEN4_CHAINED_SID_SOURCES})
    target_include_directories(gen4chainedsid PRIVATE bridge "${POKEFINDER_ROOT}")
    target_compile_options(gen4chainedsid PRIVATE "-O3")
    target_link_options(
        gen4chainedsid
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4ChainedSidModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen4chainedsid_api_version','_gen4chainedsid_calculate','_gen4chainedsid_result_ptr','_gen4chainedsid_result_count','_gen4chainedsid_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(
        gen4chainedsid
        PROPERTIES
        OUTPUT_NAME "gen4chainedsid"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(gen4chainedsid_native_test ${GEN4_CHAINED_SID_SOURCES} tests/chainedsid_native_test.cpp)
    target_include_directories(gen4chainedsid_native_test PRIVATE bridge "${POKEFINDER_ROOT}")
    add_test(NAME gen4chainedsid_native_parity COMMAND gen4chainedsid_native_test)
endif()
