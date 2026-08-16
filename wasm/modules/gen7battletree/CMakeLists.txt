set(GEN7_BATTLETREE_SOURCES bridge/gen7battletree_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7battletree ${GEN7_BATTLETREE_SOURCES})
    target_include_directories(gen7battletree PRIVATE bridge)
    target_compile_options(gen7battletree PRIVATE "-O3")
    target_link_options(
        gen7battletree
        PRIVATE
        "-O3"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sENVIRONMENT=worker"
        "-sEXPORT_ES6=1"
        "-sMODULARIZE=1"
        "-sFILESYSTEM=0"
        "-sWASM_BIGINT=1"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen7battletree_api_version','_gen7battletree_begin','_gen7battletree_step','_gen7battletree_result_ptr','_gen7battletree_result_count','_gen7battletree_step_processed','_gen7battletree_total_processed','_gen7battletree_total_results','_gen7battletree_done','_gen7battletree_limit_reached','_gen7battletree_last_error']"
    )
    set_target_properties(
        gen7battletree
        PROPERTIES
        OUTPUT_NAME "gen7battletree"
        SUFFIX ".mjs"
        RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}"
    )
elseif(BUILD_TESTING)
    add_executable(
        gen7battletree_native_test
        ${GEN7_BATTLETREE_SOURCES}
        tests/gen7battletree_native_test.cpp
    )
    target_include_directories(gen7battletree_native_test PRIVATE bridge)
    add_test(NAME gen7battletree_native_session COMMAND gen7battletree_native_test)
endif()
