set(GEN7_ID_SOURCES bridge/gen7id_bridge.cpp)

if(EMSCRIPTEN)
    add_executable(gen7id ${GEN7_ID_SOURCES})
    target_include_directories(gen7id PRIVATE bridge)
    target_compile_options(gen7id PRIVATE "-O3")
    target_link_options(
        gen7id
        PRIVATE
        "-O3"
        "-sMODULARIZE=1"
        "-sEXPORT_ES6=1"
        "-sEXPORT_NAME=createGen7IdModule"
        "-sENVIRONMENT=worker"
        "-sALLOW_MEMORY_GROWTH=1"
        "-sFILESYSTEM=0"
        "-sASSERTIONS=0"
        "-sNO_EXIT_RUNTIME=1"
        "-sMALLOC=emmalloc"
        "-sEXPORTED_FUNCTIONS=['_gen7id_api_version','_gen7id_generate','_gen7id_result_ptr','_gen7id_result_count','_gen7id_last_error']"
        "-sEXPORTED_RUNTIME_METHODS=['HEAPU32']"
    )
    set_target_properties(gen7id PROPERTIES OUTPUT_NAME "gen7id" SUFFIX ".mjs" RUNTIME_OUTPUT_DIRECTORY "${POKERNGKIT_WASM_OUTPUT_DIR}")
elseif(BUILD_TESTING)
    add_executable(gen7id_native_test ${GEN7_ID_SOURCES} tests/gen7id_native_test.cpp)
    target_include_directories(gen7id_native_test PRIVATE bridge)
    add_test(NAME gen7id_native_parity COMMAND gen7id_native_test)
endif()

