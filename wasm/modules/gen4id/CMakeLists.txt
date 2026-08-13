set(GEN4_ID_SOURCES bridge/gen4id_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen4id ${GEN4_ID_SOURCES})
    target_include_directories(gen4id PRIVATE bridge)
    target_compile_options(gen4id PRIVATE "-O3")
    target_link_options(
        gen4id
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen4IdModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_malloc','_free','_gen4id_api_version','_gen4id_generate','_gen4id_search','_gen4id_result_ptr','_gen4id_result_count','_gen4id_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen4id PROPERTIES OUTPUT_NAME "gen4id" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen4id_native_test ${GEN4_ID_SOURCES} tests/id4_native_test.cpp)
    target_include_directories(gen4id_native_test PRIVATE bridge)
    add_test(NAME gen4id_native_parity COMMAND gen4id_native_test)
endif()
